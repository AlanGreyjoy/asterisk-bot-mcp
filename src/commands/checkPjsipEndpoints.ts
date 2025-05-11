import { AsteriskService } from "../services/asterisk.service";

/**
 * Connects to Asterisk, retrieves PJSIP endpoint information, and counts registered endpoints.
 */
export async function checkPjsipEndpoints(): Promise<void> {
  console.log("Attempting to check PJSIP registered endpoints...");
  const asteriskService = new AsteriskService();

  try {
    await asteriskService.connect();
    console.log("Successfully connected to Asterisk for endpoint check.");

    const endpoints = await asteriskService.getPjsipEndpoints();

    if (!endpoints || endpoints.length === 0) {
      console.log(
        "No PJSIP endpoints found or PJSIPShowEndpoints did not return EndpointList events.",
      );
      return;
    }

    let registeredCount = 0;
    console.log(`\n--- PJSIP Endpoints (${endpoints.length} total events) ---`);

    // Each 'EndpointList' event might represent an endpoint.
    // We need to inspect the properties of these event objects.
    // A common property indicating an active registration might be related to 'contactstatus' or similar.
    // The exact property for "registered" status can vary based on Asterisk version and PJSIP configuration.
    // We will look for ContactStatus: 'Reachable' or DeviceState: 'Registered' or similar.
    // The PJSIPShowEndpoints command typically lists all configured endpoints.
    // The events will have properties like: ObjectType, ObjectName, ContactStatus, DeviceState, Aor, etc.

    endpoints.forEach((endpointEvent, index) => {
      // Log the raw event object for inspection initially if needed
      // console.log(`Event ${index + 1}:`, JSON.stringify(endpointEvent, null, 2));

      const objectName =
        endpointEvent.objectname || endpointEvent.endpointname || "N/A";
      const contactStatus = endpointEvent.contactstatus;
      const deviceState = endpointEvent.devicestate;
      const aor = endpointEvent.aor;

      // Criteria for being "registered":
      // 1. Must have an AOR associated (usually means it can be registered).
      // 2. ContactStatus is 'Reachable', 'Registered', or similar positive status.
      //    Or DeviceState might indicate 'Registered'.
      //    (PJSIP contact statuses can be: Reachable, Unreachable, NonQualify, Unknown)
      //    Device states can be: Unknown, Not In Use, In Use, Busy, Invalid, Unavailable, Ringing, Ring+InUse, On Hold, Registered, Unregistered
      let isRegistered = false;
      if (aor) {
        // Check if it has an AOR
        if (
          contactStatus &&
          (contactStatus.toLowerCase() === "reachable" ||
            contactStatus.toLowerCase() === "registered")
        ) {
          isRegistered = true;
        } else if (deviceState && deviceState.toLowerCase() === "registered") {
          isRegistered = true;
        }
      }

      if (isRegistered) {
        registeredCount++;
        console.log(
          `  [REGISTERED] Endpoint: ${objectName} (AOR: ${aor}, ContactStatus: ${contactStatus}, DeviceState: ${deviceState})`,
        );
      } else {
        // Optionally log non-registered or all endpoints for debugging
        // console.log(`  [INFO] Endpoint: ${objectName} (AOR: ${aor}, ContactStatus: ${contactStatus}, DeviceState: ${deviceState})`);
      }
    });

    console.log(
      `\nTotal PJSIP endpoints configured (from events): ${endpoints.length}`,
    );
    console.log(
      `Total PJSIP endpoints considered REGISTERED: ${registeredCount}`,
    );
  } catch (error) {
    console.error("Error checking PJSIP endpoints:", error);
  } finally {
    if (asteriskService.isConnected()) {
      console.log("Disconnecting from Asterisk...");
      asteriskService.disconnect();
    }
  }
}

// If this script is run directly (e.g., via ts-node src/commands/checkPjsipEndpoints.ts)
if (require.main === module) {
  checkPjsipEndpoints().catch((err) => {
    console.error(
      "Unhandled error in checkPjsipEndpoints direct execution:",
      err,
    );
    process.exit(1);
  });
}
