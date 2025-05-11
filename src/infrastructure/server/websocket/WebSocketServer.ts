import WebSocket, { WebSocketServer as WSS } from 'ws'
import { CommandService } from '../../../application/command/CommandService'

// Define a simple structure for incoming commands
interface CommandMessage {
  command: string
  payload?: unknown // Payload can be any type, or undefined
}

// Define structure for available commands request
interface AvailableCommandsMessage {
  type: 'getAvailableCommands'
  domain?: string // Optional domain filter
}

// Determine if message is a command or a metadata request
function isAvailableCommandsMessage(message: any): message is AvailableCommandsMessage {
  return message && typeof message === 'object' && message.type === 'getAvailableCommands'
}

export class WebSocketServer {
  private wss: WSS
  private commandService: CommandService

  constructor(port: number, commandService: CommandService) {
    this.wss = new WSS({ port })
    this.commandService = commandService
    this.initialize()
    console.log(`WebSocketServer started on port ${port}`)
  }

  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected')

      ws.on('message', async (message: WebSocket.RawData) => {
        console.log('Received message:', message.toString())
        try {
          const parsedMessage = JSON.parse(message.toString())

          // Handle different message types
          if (isAvailableCommandsMessage(parsedMessage)) {
            // Handle request for available commands
            const commands = parsedMessage.domain
              ? this.commandService.getCommandsByDomain(parsedMessage.domain)
              : this.commandService.getAvailableCommands()

            ws.send(
              JSON.stringify({
                status: 'success',
                type: 'availableCommands',
                data: commands,
              }),
            )
          } else if ('command' in parsedMessage && typeof parsedMessage.command === 'string') {
            // Handle command execution
            const result = await this.commandService.handleCommand(parsedMessage.command, parsedMessage.payload)
            // Send result back to the client
            ws.send(
              JSON.stringify({
                status: 'success',
                type: 'commandResult',
                command: parsedMessage.command,
                data: result,
              }),
            )
          } else {
            ws.send(
              JSON.stringify({
                status: 'error',
                message: 'Invalid message format. Expected "command" field or "type" field.',
              }),
            )
          }
        } catch (error) {
          console.error('Failed to process message or handle command:', error)
          let errorMessage = 'Failed to process message.'
          if (error instanceof Error) {
            errorMessage = error.message
          }
          ws.send(JSON.stringify({ status: 'error', message: errorMessage }))
        }
      })

      ws.on('close', () => {
        console.log('Client disconnected')
      })

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error)
      })

      // Send welcome message with available commands
      const availableCommands = this.commandService.getAvailableCommands()
      ws.send(
        JSON.stringify({
          status: 'connected',
          message: 'Successfully connected to MCP WebSocket server.',
          availableCommands: availableCommands,
        }),
      )
    })

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket Server error:', error)
    })
  }

  public close(): void {
    this.wss.close(() => {
      console.log('WebSocketServer closed')
    })
  }
}
