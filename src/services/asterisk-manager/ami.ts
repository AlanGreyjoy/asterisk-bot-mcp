/**
 * Asterisk Manager API for Node.js (TypeScript version)
 */

import { EventEmitter } from 'events'
import * as Net from 'net'
import { stringHasLength, defaultCallback, removeSpaces, CallbackFunction } from './utils'

// Debug flag
const debug = false

// Define types for the AMI interface
export interface AmiOptions {
  port: number
  host: string
  username: string
  password: string
  events: boolean
}

export interface AmiContext {
  backoff: number
  emitter: EventEmitter
  held: HeldAction[]
  connection?: Net.Socket
  authenticated?: boolean
  lines?: string[]
  leftOver?: string
  lastid?: string
  follow?: boolean
  [key: string]: any // Allow for additional dynamic properties
}

export interface HeldAction {
  action: Record<string, any>
  callback: CallbackFunction
}

export interface ManagerEvent {
  event?: string
  response?: string
  actionid?: string
  content?: string
  userevent?: string
  message?: string
  [key: string]: any // Additional event properties
}

export interface ManagerAction {
  action: string
  actionid?: string
  [key: string]: any // Additional action properties
}

/**
 * Manager instance for Asterisk AMI
 */
export class Manager extends EventEmitter {
  public options: AmiOptions
  private context: AmiContext
  private reconnect?: () => void

  constructor(port: number, host: string = '', username: string = '', password: string = '', events: boolean = false) {
    super()

    this.context = { backoff: 10000, emitter: this, held: [] }

    this.options = {
      port,
      host,
      username,
      password,
      events,
    }

    // Setup event handlers
    this.on('rawevent', (event: ManagerEvent) => this.handleEvent(event))
    this.on('error', (err: Error) => {
      /* Default error handler to prevent uncaught exceptions */
    })
    this.on('connect', () => this.resetBackoff())

    // Auto-connect if port is provided
    if (port) {
      this.connect(
        this.options.port,
        this.options.host,
        this.options.username
          ? this.login.bind(this, this.options.username, this.options.password, this.options.events)
          : undefined,
      )
    }
  }

  /**
   * Connect to Asterisk AMI
   */
  public connect(port: number, host: string, callback?: () => void): void {
    callback = defaultCallback(callback)

    // Check if already connected
    if (this.context.connection && this.context.connection.readyState !== 'closed') {
      callback()
      return
    }

    this.context.authenticated = false
    this.context.connection = Net.createConnection(port, host)
    this.context.connection.setKeepAlive(true)
    this.context.connection.setNoDelay(true)
    this.context.connection.setEncoding('utf-8')

    // Setup event handlers
    this.context.connection.once('connect', () => callback!())
    this.context.connection.on('connect', () => this.emit('connect'))
    this.context.connection.on('close', () => this.emit('close'))
    this.context.connection.on('end', () => this.emit('end'))
    this.context.connection.on('data', (data: Buffer) => this.handleData(data))
    this.context.connection.on('error', (error: Error) => this.handleConnectionError(error))
  }

  /**
   * Keep connection alive with auto-reconnect
   */
  public keepConnected(): void {
    if (this.reconnect) return

    if (this.isConnected() === false) {
      this.reconnect = this.attemptReconnect.bind(this)
      this.on('close', this.reconnect)
    }
  }

  /**
   * Login to Asterisk AMI
   */
  public login(username: string, password: string, events?: boolean, callback?: CallbackFunction): void {
    callback = defaultCallback(callback)

    this.action(
      {
        action: 'login',
        username: username,
        secret: password,
        event: events ? 'on' : 'off',
      },
      (err?: Error | null, response?: any) => {
        if (err) {
          callback(err)
          return
        }

        this.context.authenticated = true

        // Process any held actions that were waiting for login
        const held = [...this.context.held]
        this.context.held = []

        held.forEach((held) => {
          // Ensure held.action has the 'action' property
          // The action object is coming from context.held - already validated before being added to held array
          this.action(held.action as ManagerAction, held.callback)
        })

        callback()
      },
    )
  }

  /**
   * Send an action to Asterisk AMI
   */
  public action(action: ManagerAction | Record<string, any>, callback?: CallbackFunction): string {
    // Ensure action has the required 'action' property
    const actionObj = (typeof action === 'object' && action ? action : {}) as ManagerAction
    if (!actionObj.action && typeof action === 'object' && 'Action' in action) {
      // Convert 'Action' to 'action' for case-insensitive compatibility
      actionObj.action = action.Action as string
    }

    callback = defaultCallback(callback)

    // Generate a unique action ID
    let id = actionObj.actionid || String(new Date().getTime())
    while (this.listenerCount(id) > 0) {
      id += String(Math.floor(Math.random() * 9))
    }

    if (actionObj.actionid) delete actionObj.actionid

    // Hold action if not authenticated yet
    if (!this.context.authenticated && actionObj.action !== 'login') {
      actionObj.actionid = id
      this.context.held.push({
        action: actionObj,
        callback,
      })
      return id
    }

    try {
      if (!this.context.connection) {
        throw new Error('There is no connection yet')
      }

      // Send the action to Asterisk
      this.context.connection.write(this.makeActionText(actionObj, id))
    } catch (e) {
      console.log('ERROR: ', e)

      // Hold the action for retry
      actionObj.actionid = id
      this.context.held.push({
        action: actionObj,
        callback,
      })

      return id
    }

    // Register callback for the response
    this.once(id, callback)

    this.context.lastid = id
    return id
  }

  /**
   * Disconnect from Asterisk AMI
   */
  public disconnect(callback?: () => void): void {
    if (this.reconnect) {
      this.removeListener('close', this.reconnect)
    }

    if (this.context.connection && this.context.connection.readyState === 'open') {
      this.context.connection.end()
    }

    delete this.context.connection

    if (typeof callback === 'function') {
      setImmediate(callback)
    }
  }

  /**
   * Check if connected to Asterisk AMI
   */
  public isConnected(): boolean {
    return Boolean(this.context.connection && this.context.connection.readyState === 'open')
  }

  /**
   * Alias for isConnected
   */
  public connected(): boolean {
    return this.isConnected()
  }

  /**
   * Create properly formatted action text to send to Asterisk
   */
  private makeActionText(req: ManagerAction, id: string): string {
    const msg: string[] = []
    msg.push(`ActionID: ${id}`)

    Object.keys(req).forEach((key) => {
      const nkey = removeSpaces(key).toLowerCase()
      if (!nkey.length || nkey === 'actionid') return

      const nval = req[key]
      const formattedKey = nkey.charAt(0).toUpperCase() + nkey.slice(1)

      if (nval === undefined) return

      if (nval === null) return

      if (typeof nval === 'object') {
        if (Array.isArray(nval)) {
          // Handle array values
          msg.push(`${formattedKey}: ${nval.map((e) => String(e)).join(',')}`)
        } else if (!(nval instanceof RegExp)) {
          // Handle object values as variable/value pairs
          Object.keys(nval).forEach((name) => {
            msg.push(`${formattedKey}: ${name}=${String(nval[name])}`)
          })
          return
        }
      } else {
        // Handle simple values
        msg.push(`${formattedKey}: ${String(nval)}`)
      }
    })

    msg.sort()
    return msg.join('\r\n') + '\r\n\r\n'
  }

  /**
   * Handle Asterisk AMI events
   */
  private handleEvent(event: ManagerEvent): void {
    const emits: (() => void)[] = []

    // Handle responses to actions
    if (event.response && event.actionid && typeof event.response === 'string') {
      // This is the response to an Action
      emits.push(() => this.emit(event.actionid!, event.response!.toLowerCase() === 'error' ? event : undefined, event))
      emits.push(() => this.emit('response', event))
    } else if (event.response && event.content) {
      // This is a follows response
      if (this.context.lastid) {
        emits.push(() => this.emit(this.context.lastid!, undefined, event))
      }
      emits.push(() => this.emit('response', event))
    }

    // Handle real events
    if (event.event) {
      // Normalize event property
      event.event = Array.isArray(event.event) ? event.event[0] : event.event
      event.event = String(event.event)

      emits.push(() => this.emit('managerevent', event))
      emits.push(() => this.emit(event.event!.toLowerCase(), event))

      // Fix for possibly undefined userevent
      if (event.event.toLowerCase() === 'userevent' && event.userevent) {
        const userEventName = `userevent-${String(event.userevent).toLowerCase()}`
        emits.push(() => this.emit(userEventName, event))
      }
    } else {
      // Unknown event type
      emits.push(() => this.emit('asterisk', event))
    }

    // Execute all emits in the next tick
    emits.forEach((fn) => process.nextTick(fn))
  }

  /**
   * Handle incoming data from Asterisk
   */
  private handleData(data: Buffer | string): void {
    this.context.lines = this.context.lines || []
    this.context.leftOver = this.context.leftOver || ''
    this.context.leftOver += String(data)
    this.context.lines = this.context.lines.concat(this.context.leftOver.split(/\r?\n/))
    this.context.leftOver = this.context.lines.pop() || ''

    let lines: string[] = []
    let follow = 0
    let item: ManagerEvent = {}

    while (this.context.lines.length) {
      const line = this.context.lines.shift() || ''

      if (!lines.length && line.substr(0, 21) === 'Asterisk Call Manager') {
        // Ignore Greeting
      } else if (
        !lines.length &&
        line.substr(0, 9).toLowerCase() === 'response:' &&
        line.toLowerCase().indexOf('follow') > -1
      ) {
        follow = 1
        lines.push(line)
      } else if (follow && (line === '--END COMMAND--' || line === '--END SMS EVENT--')) {
        follow = 2
        lines.push(line)
      } else if (follow > 1 && !line.length) {
        follow = 0
        lines.pop()
        item = {
          response: 'follows',
          content: lines.join('\n'),
        }

        const matches = item.content!.match(/actionid: ([^\r\n]+)/i)
        item.actionid = matches ? matches[1] : item.actionid

        lines = []
        this.emit('rawevent', item)
      } else if (!follow && !line.length) {
        // Have a Complete Item
        lines = lines.filter(stringHasLength)
        item = {}

        while (lines.length) {
          const currentLine = lines.shift() || ''
          const parts = currentLine.split(': ')
          const key = removeSpaces(parts.shift() || '').toLowerCase()
          const value = parts.join(': ')

          if (key === 'variable' || key === 'chanvariable') {
            // Handle special case of one or more variables attached to an event and
            // create a variables subobject in the event object
            if (typeof item[key] !== 'object') {
              item[key] = {}
            }

            const varParts = value.split('=')
            const subkey = varParts.shift() || ''
            const subvalue = varParts.join('=')

            if (item[key] && typeof item[key] === 'object') {
              ;(item[key] as Record<string, string>)[subkey] = subvalue
            }
          } else {
            // Generic case of multiple copies of a key in an event.
            // Create an array of values.
            if (key in item) {
              if (Array.isArray(item[key])) {
                ;(item[key] as string[]).push(value)
              } else {
                item[key] = [item[key], value]
              }
            } else {
              item[key] = value
            }
          }
        }

        this.context.follow = false
        lines = []
        this.emit('rawevent', item)
      } else {
        lines.push(line)
      }
    }

    this.context.lines = lines
  }

  /**
   * Handle errors from the connection
   */
  private handleConnectionError(error: Error): void {
    this.emit('error', error)

    if (debug) {
      const errorLines = String(error.stack).split(/\r?\n/)
      const msg = errorLines.shift() || ''
      const detailLines = errorLines.map((line) => ` ↳ ${line.replace(/^\s*at\s+/, '')}`)
      detailLines.unshift(msg)

      detailLines.forEach((line) => {
        process.stderr.write(line + '\n')
      })
    }
  }

  /**
   * Attempt to reconnect to Asterisk
   */
  private attemptReconnect(): void {
    console.log(`Trying to reconnect to AMI in ${this.context.backoff / 1000} seconds`)

    // Create a simple connect function that doesn't expect parameters
    const connectFunc = () => {
      this.connect(
        this.options.port,
        this.options.host,
        // Create a separate connect callback function that will handle login
        () => {
          if (this.options.username) {
            this.login(this.options.username, this.options.password, this.options.events)
          }
        },
      )
    }

    setTimeout(connectFunc, this.context.backoff)

    // Increase backoff up to 60 seconds max
    if (this.context.backoff < 60000) {
      this.context.backoff += 10000
    }
  }

  /**
   * Reset backoff timer after successful connection
   */
  private resetBackoff(): void {
    this.context.backoff = 10000
  }
}

// Export default factory function to maintain backwards compatibility
export default function (port: number, host?: string, username?: string, password?: string, events?: boolean): Manager {
  return new Manager(port, host, username, password, events)
}
