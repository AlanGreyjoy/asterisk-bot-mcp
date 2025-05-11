/**
 * Command Registry for MCP Server
 *
 * Provides interfaces and registration system for commands
 */

export interface CommandHandler<T = any, R = any> {
  execute(payload?: T): Promise<R>;
  getMetadata(): CommandMetadata;
}

export interface CommandMetadata {
  name: string;
  description: string;
  domain: string;
  parameters?: CommandParameterMetadata[];
}

export interface CommandParameterMetadata {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

/**
 * Registry for command handlers
 * Allows for registration, lookup, and introspection of available commands
 */
export class CommandRegistry {
  private commands = new Map<string, CommandHandler>();

  /**
   * Register a command handler
   */
  register(handler: CommandHandler): void {
    const metadata = handler.getMetadata();
    this.commands.set(metadata.name.toLowerCase(), handler);
    console.log(`Registered command: ${metadata.name} (${metadata.domain})`);
  }

  /**
   * Get a command handler by name
   */
  getHandler(commandName: string): CommandHandler | undefined {
    return this.commands.get(commandName.toLowerCase());
  }

  /**
   * Get metadata for all registered commands
   */
  getAllCommands(): CommandMetadata[] {
    return Array.from(this.commands.values()).map((handler) =>
      handler.getMetadata(),
    );
  }

  /**
   * Get commands for a specific domain
   */
  getCommandsByDomain(domain: string): CommandMetadata[] {
    return this.getAllCommands().filter((cmd) => cmd.domain === domain);
  }
}
