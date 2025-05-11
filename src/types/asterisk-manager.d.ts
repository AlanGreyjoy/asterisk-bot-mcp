declare module "asterisk-manager" {
  class Manager {
    constructor(
      port: number,
      host: string,
      username: string,
      secret: string,
      event_listeners_default_on: boolean,
    );
    on(event: string, callback: (...args: any[]) => void): void;
    keepAlive(): void;
    login(callback: (err: Error | null) => void): void;
    logoff(): void;
    action(
      action: Record<string, unknown>,
      callback: (
        err: Error | null,
        res: Record<string, unknown> | null,
      ) => void,
      timeout?: number,
    ): void;
    removeListener(event: string, callback: (...args: any[]) => void): void;
    // Add other methods and properties as needed based on the library's API
  }
  export = Manager;
}
