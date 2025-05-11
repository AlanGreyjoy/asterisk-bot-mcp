console.log("MCP Server starting...");

import { WebSocketServer } from "./infrastructure/server/websocket/WebSocketServer";
import { CommandRegistry } from "./application/command/CommandRegistry";
import { CommandService } from "./application/command/CommandService";
import { CheckPjsipEndpointsCommand } from "./commands/asterisk/CheckPjsipEndpointsCommand";
import { AsteriskService } from "./services/asterisk.service";
import asteriskConfig from "./config/asterisk.config";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Main function executed.");

  // Initialize services
  const asteriskService = new AsteriskService(asteriskConfig);

  // Initialize command registry and register commands
  const commandRegistry = new CommandRegistry();
  commandRegistry.register(new CheckPjsipEndpointsCommand(asteriskService));

  // Initialize command service with registry
  const commandService = new CommandService(commandRegistry);

  // Default port or port from environment variable
  const port = process.env.WEBSOCKET_PORT
    ? parseInt(process.env.WEBSOCKET_PORT, 10)
    : 8080;

  // Start the WebSocket server with the command service
  const webSocketServer = new WebSocketServer(port, commandService);

  console.log("MCP Server initialized. Waiting for WebSocket connections...");
}

main().catch((error) => {
  console.error("Error during startup:", error);
  process.exit(1);
});
