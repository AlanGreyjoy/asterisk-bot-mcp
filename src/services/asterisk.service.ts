import Manager from "asterisk-manager";
import asteriskConfig, { AsteriskConfig } from "../config/asterisk.config";

export class AsteriskService {
  private ami: Manager;
  private connected: boolean = false;

  constructor(private config: AsteriskConfig = asteriskConfig) {
    this.ami = new Manager(
      this.config.port,
      this.config.host,
      this.config.username,
      this.config.secret,
      true, // event_listeners_default_on
    );

    this.ami.on("connect", () => {
      console.log("Successfully connected to Asterisk AMI");
      this.connected = true;
    });

    this.ami.on("disconnect", () => {
      console.log("Disconnected from Asterisk AMI");
      this.connected = false;
    });

    this.ami.on("error", (err: Error) => {
      console.error("Asterisk AMI Error:", err);
      this.connected = false;
    });
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }
      // The 'asterisk-manager' library attempts to connect on instantiation if the last param is true.
      // However, explicit keepAlive and login might be needed for some setups or to ensure connection state.
      this.ami.keepAlive(); // Starts reconnection logic if not connected
      this.ami.login((err: Error | null) => {
        if (err) {
          console.error("AMI Login failed:", err);
          this.connected = false;
          reject(err);
        } else {
          console.log("AMI Login successful");
          this.connected = true;
          resolve();
        }
      });
    });
  }

  public disconnect(): void {
    if (this.connected) {
      this.ami.logoff(); // Graceful logoff
      this.connected = false;
      console.log("Logged off from Asterisk AMI");
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public sendAction(
    action: Record<string, unknown>,
    timeout?: number,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error("Not connected to Asterisk AMI"));
        return;
      }
      this.ami.action(
        action,
        (err: Error | null, res: Record<string, unknown> | null) => {
          if (err) {
            reject(err);
          } else {
            resolve(res || {});
          }
        },
        timeout,
      );
    });
  }

  // Example: Get PJSIP endpoints
  public async getPjsipEndpoints(): Promise<any[]> {
    const action = { Action: "PJSIPShowEndpoints" };
    const responseEvents: any[] = [];

    return new Promise(async (resolve, reject) => {
      if (!this.connected) {
        return reject(
          new Error("Not connected to Asterisk AMI for getPjsipEndpoints"),
        );
      }

      const eventHandler = (event: any) => {
        if (event.event === "EndpointList") {
          responseEvents.push(event);
        }
        if (event.event === "EndpointListComplete") {
          this.ami.removeListener("managerevent", eventHandler); // Clean up listener
          resolve(responseEvents);
        }
      };

      this.ami.on("managerevent", eventHandler);

      try {
        const actionResponse = await this.sendAction(action);
        // The actual data comes through events for PJSIPShowEndpoints
        // We check actionResponse for immediate errors, but data is handled by eventHandler
        if (actionResponse.response === "Error") {
          this.ami.removeListener("managerevent", eventHandler); // Clean up listener on error
          reject(
            new Error(
              `AMI action PJSIPShowEndpoints failed: ${actionResponse.message}`,
            ),
          );
        }
        // If the action was accepted, we wait for EndpointListComplete
      } catch (error) {
        this.ami.removeListener("managerevent", eventHandler); // Clean up listener on error
        reject(error);
      }
    });
  }
}

// Optional: Export a singleton instance if preferred throughout the application
// export const asteriskService = new AsteriskService();
