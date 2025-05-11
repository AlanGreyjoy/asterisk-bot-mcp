// Import our local TypeScript implementation
import AsteriskManager, { Manager, ManagerEvent, ManagerAction } from './asterisk-manager/ami'
import asteriskConfig, { AsteriskConfig } from '../config/asterisk.config'

// Type declaration to help TypeScript recognize the EventEmitter methods
interface AMIEventEmitter extends Manager {
  on(event: string, listener: (...args: any[]) => void): this
  removeListener(event: string, listener: (...args: any[]) => void): this
}

// Define the expected signature of the factory function based on .d.ts and usage
type AsteriskManagerFactoryType = (
  port: number,
  host: string,
  username?: string,
  password?: string,
  events?: boolean,
) => any // Return type is the Manager instance, typed as 'any' for now

export class AsteriskService {
  private ami: AMIEventEmitter
  private connected: boolean = false

  constructor(private config: AsteriskConfig = asteriskConfig) {
    // Use our local implementation, cast to AMIEventEmitter
    this.ami = AsteriskManager(
      this.config.port,
      this.config.host,
      this.config.username,
      this.config.secret,
      true, // events enabled
    ) as AMIEventEmitter

    // Set up event handlers
    this.ami.on('connect', () => {
      console.log('Successfully connected to Asterisk AMI')
      this.connected = true
    })

    this.ami.on('close', () => {
      console.log('Disconnected from Asterisk AMI')
      this.connected = false
    })

    this.ami.on('error', (err: Error) => {
      console.error('Asterisk AMI Error:', err)
      this.connected = false
    })
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ami.isConnected()) {
        resolve()
        return
      }

      this.ami.keepConnected()

      this.ami.login(this.config.username, this.config.secret, true, (err?: Error | null) => {
        if (err) {
          console.error('AMI Login failed:', err)
          this.connected = false
          reject(err)
        } else {
          console.log('AMI Login successful')
          this.connected = true
          resolve()
        }
      })
    })
  }

  public disconnect(): void {
    if (this.ami.isConnected()) {
      this.ami.disconnect()
      console.log('Logged off from Asterisk AMI')
    }
  }

  public isConnected(): boolean {
    return this.ami.isConnected()
  }

  public sendAction(action: ManagerAction): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.ami.isConnected()) {
        reject(new Error('Not connected to Asterisk AMI'))
        return
      }

      this.ami.action(action, (err?: Error | null, res?: Record<string, unknown> | null) => {
        if (err) {
          reject(err)
        } else {
          resolve(res || {})
        }
      })
    })
  }

  public async getPjsipEndpoints(): Promise<ManagerEvent[]> {
    const pjsipAction: ManagerAction = {
      action: 'PJSIPShowEndpoints',
    }
    const responseEvents: ManagerEvent[] = []

    return new Promise(async (resolve, reject) => {
      if (!this.ami.isConnected()) {
        return reject(new Error('Not connected to Asterisk AMI for getPjsipEndpoints'))
      }

      const eventHandler = (event: ManagerEvent) => {
        if (event.event === 'EndpointList') {
          responseEvents.push(event)
        }
        if (event.event === 'EndpointListComplete') {
          this.ami.removeListener('rawevent', eventHandler)
          resolve(responseEvents)
        }
      }

      this.ami.on('rawevent', eventHandler)

      try {
        const actionResponse = await this.sendAction(pjsipAction)
        if (actionResponse && actionResponse.response === 'Error') {
          this.ami.removeListener('rawevent', eventHandler)
          reject(new Error(`AMI action PJSIPShowEndpoints failed: ${actionResponse.message}`))
        }
      } catch (error) {
        this.ami.removeListener('rawevent', eventHandler)
        reject(error)
      }
    })
  }
}

// Optional: Export a singleton instance if preferred throughout the application
// export const asteriskService = new AsteriskService();
