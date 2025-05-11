/**
 * Command Service for MCP Server
 *
 * Routes commands to appropriate handlers and provides error handling
 */

import {
  CommandHandler,
  CommandRegistry,
  CommandMetadata,
} from "./CommandRegistry";

export class CommandService {
  constructor(private registry: CommandRegistry) {}

  /**
   * Handle a command by name with optional payload
   */
  async handleCommand(
    commandName: string,
    payload?: unknown,
  ): Promise<unknown> {
    console.log(
      `CommandService received command: ${commandName} with payload:`,
      payload,
    );

    const handler = this.registry.getHandler(commandName);

    if (!handler) {
      console.warn(`Unknown command: ${commandName}`);
      throw new Error(`Unknown command: ${commandName}`);
    }

    try {
      return await handler.execute(payload);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      throw new Error(
        `Failed to execute ${commandName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get metadata for all available commands
   */
  getAvailableCommands(): CommandMetadata[] {
    return this.registry.getAllCommands();
  }

  /**
   * Get metadata for commands in a specific domain
   */
  getCommandsByDomain(domain: string): CommandMetadata[] {
    return this.registry.getCommandsByDomain(domain);
  }
}
