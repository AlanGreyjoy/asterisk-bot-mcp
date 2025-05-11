/**
 * Command handler for checking PJSIP endpoints
 */

import {
  CommandHandler,
  CommandMetadata,
} from "../../application/command/CommandRegistry";
import { AsteriskService } from "../../services/asterisk.service";
import { ManagerEvent } from "../../services/asterisk-manager/ami";

// Define a interface for the endpoint results
interface EndpointResult {
  objectName: string;
  aor?: string;
  contactStatus?: string;
  deviceState?: string;
  isRegistered: boolean;
}

export class CheckPjsipEndpointsCommand implements CommandHandler {
  constructor(private asteriskService: AsteriskService) {}

  /**
   * Execute the command to check PJSIP endpoints
   */
  async execute(): Promise<unknown> {
    console.log("Executing checkPjsipEndpoints command");

    if (!this.asteriskService.isConnected()) {
      console.log("Not connected to Asterisk. Attempting to connect...");
      await this.asteriskService.connect();
    }

    try {
      const endpoints = await this.asteriskService.getPjsipEndpoints();

      if (!endpoints || endpoints.length === 0) {
        console.log(
          "No PJSIP endpoints found or PJSIPShowEndpoints did not return EndpointList events.",
        );
        return {
          message: "No PJSIP endpoints found",
          endpoints: [],
          totalCount: 0,
          registeredCount: 0,
        };
      }

      // Process the endpoints
      const processedEndpoints = this.processEndpoints(endpoints);
      const registeredCount = processedEndpoints.filter(
        (ep) => ep.isRegistered,
      ).length;

      console.log(
        `Retrieved ${endpoints.length} PJSIP endpoints, ${registeredCount} registered`,
      );

      // Return a well-structured response
      return {
        message: "Successfully retrieved PJSIP endpoints",
        endpoints: processedEndpoints,
        totalCount: endpoints.length,
        registeredCount: registeredCount,
      };
    } catch (error) {
      console.error("Error checking PJSIP endpoints:", error);
      throw error;
    }
  }

  /**
   * Process the raw endpoint events into a more structured format
   */
  private processEndpoints(endpoints: ManagerEvent[]): EndpointResult[] {
    return endpoints.map((endpointEvent) => {
      const objectName =
        endpointEvent.objectname || endpointEvent.endpointname || "N/A";
      const contactStatus = endpointEvent.contactstatus;
      const deviceState = endpointEvent.devicestate;
      const aor = endpointEvent.aor;

      // Criteria for being "registered":
      // 1. Must have an AOR associated (usually means it can be registered)
      // 2. ContactStatus is 'Reachable', 'Registered', or similar positive status
      //    Or DeviceState might indicate 'Registered'
      let isRegistered = false;
      if (aor) {
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

      // Log registered endpoints to console for visibility
      if (isRegistered) {
        console.log(
          `  [REGISTERED] Endpoint: ${objectName} (AOR: ${aor}, ContactStatus: ${contactStatus}, DeviceState: ${deviceState})`,
        );
      }

      return {
        objectName,
        aor,
        contactStatus,
        deviceState,
        isRegistered,
      };
    });
  }

  /**
   * Get command metadata
   */
  getMetadata(): CommandMetadata {
    return {
      name: "checkPjsipEndpoints",
      description:
        "Retrieves all configured PJSIP endpoints from Asterisk and checks their registration status",
      domain: "asterisk",
      parameters: [],
    };
  }
}
