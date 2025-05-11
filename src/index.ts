console.log("MCP Server starting...");

// Future: Initialize and start the MCP server (e.g., HTTP server, WebSocket server)
// For now, this file primarily serves as an entry point for ts-node and build processes.

async function main() {
  console.log("Main function executed.");
  // Example: To run the check-endpoints command logic directly for testing:
  // import { checkPjsipEndpoints } from './commands/checkPjsipEndpoints';
  // await checkPjsipEndpoints();
}

main().catch((error) => {
  console.error("Error during startup:", error);
  process.exit(1);
});
