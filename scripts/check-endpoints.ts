/**
 * Script to check PJSIP endpoints directly from command line
 */
import { AsteriskService } from "../src/services/asterisk.service";
import { CheckPjsipEndpointsCommand } from "../src/commands/asterisk/CheckPjsipEndpointsCommand";
import asteriskConfig from "../src/config/asterisk.config";

async function main() {
  console.log("Running PJSIP Endpoints Check");

  try {
    // Initialize services
    const asteriskService = new AsteriskService(asteriskConfig);

    // Create and execute the command
    const command = new CheckPjsipEndpointsCommand(asteriskService);
    const result = await command.execute();

    // Additional CLI-specific formatting for the result
    console.log("\n=== PJSIP Endpoints Check Summary ===");
    console.log(`Total endpoints: ${(result as any).totalCount}`);
    console.log(`Registered endpoints: ${(result as any).registeredCount}`);
    console.log("====================================");

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error("Error checking PJSIP endpoints:", error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
