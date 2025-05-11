# Asterisk Bot MCP Server

This project is a TypeScript Node.js server designed to act as a Management Control Program (MCP) for an Asterisk server. It provides functionalities to interact with Asterisk.

**Proof of Concept (POC) - Phase 1:**
The initial version primarily focuses on a proof-of-concept command: checking PJSIP endpoint registration status. This serves as the first round of testing and establishes the foundational connection and interaction with Asterisk.

**Future Vision:**
The long-term goal is to develop this into a full-fledged MCP server. This advanced server will enable comprehensive control and management of an Asterisk instance, potentially through an interface suitable for interaction with Large Language Models (LLMs) like Claude. Planned capabilities include, but are not limited to:

- Creating and managing extensions (PJSIP and SIP)
- Configuring ring groups
- Setting up and managing call queues
- Modifying dialplan logic
- Real-time call monitoring and control
- And much more, providing a robust API for programmatic Asterisk administration.

This project aims to simplify complex Asterisk management tasks through a modern, programmatic interface.

## Prerequisites

- Node.js (v16 or later recommended)
- npm (usually comes with Node.js)
- An Asterisk server with AMI (Asterisk Manager Interface) enabled and configured.
  - For local development, you can run Asterisk in Docker, WSL, or a VM.

## Setup

1.  **Clone the repository (if applicable) or ensure all files are in your project directory.**

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    - Copy the `.env.example` file to a new file named `.env`:
      ```bash
      # On Windows (PowerShell)
      Copy-Item .env.example .env
      # On macOS/Linux
      # cp .env.example .env
      ```
    - Edit the `.env` file with your Asterisk AMI credentials:
      ```env
      ASTERISK_HOST=your_asterisk_ip_or_hostname
      ASTERISK_PORT=your_ami_port (default: 5038)
      ASTERISK_USERNAME=your_ami_username
      ASTERISK_SECRET=your_ami_secret
      ```
      Ensure your Asterisk `manager.conf` allows this user to connect from the host where this MCP server will run and has necessary read/write permissions (e.g., `system`, `call`, `config`, `reporting` depending on future needs. For `PJSIPShowEndpoints`, `system` or `config` read permissions are typically needed).

## Available Scripts

- **Build the project:**

  ```bash
  npm run build
  ```

  This compiles TypeScript to JavaScript in the `dist` directory.

- **Start the server (production mode):**

  ```bash
  npm run start
  ```

  This runs the compiled code from the `dist` directory.

- **Start the server (development mode):**

  ```bash
  npm run dev
  ```

  This uses `nodemon` and `ts-node` to run the server and automatically restart it on file changes in the `src` directory.

- **Lint the code:**

  ```bash
  npm run lint
  ```

  This checks the code for linting errors using ESLint.

- **Format the code:**

  ```bash
  npm run format
  ```

  This formats the code using Prettier.

- **Run tests:**

  ```bash
  npm run test
  ```

  This executes tests using Jest.

- **Check PJSIP Registered Endpoints:**

  ```bash
  npm run check-endpoints
  ```

  This script connects to the Asterisk server defined in your `.env` file, queries for PJSIP endpoints, and reports how many are currently considered registered.

  **Note:** This `check-endpoints` script is part of the initial proof-of-concept phase.

## Project Structure

```
asterisk-bot-mcp/
├── dist/                     # Compiled JavaScript output
├── node_modules/             # Project dependencies
├── src/
│   ├── commands/             # CLI command scripts
│   │   └── checkPjsipEndpoints.ts
│   ├── config/               # Configuration files
│   │   └── asterisk.config.ts
│   ├── services/             # Business logic and external service interactions
│   │   └── asterisk.service.ts
│   ├── types/                # TypeScript definition files (e.g., for JS libs)
│   │   └── asterisk-manager.d.ts
│   └── index.ts              # Main application entry point
├── tests/                    # Test files
│   └── placeholder.test.ts
├── .env                      # Local environment variables (ignored by Git)
├── .env.example              # Example environment variables
├── .eslintignore
├── .eslintrc.js
├── .gitignore
├── .prettierignore
├── .prettierrc.js
├── jest.config.js
├── package-lock.json
├── package.json
└── tsconfig.json
```

## Asterisk Configuration Notes (manager.conf)

Ensure your Asterisk `manager.conf` has a user configured with appropriate permissions. For example:

```ini
[mcp_user] ; Corresponds to ASTERISK_USERNAME
secret = your_ami_secret ; Corresponds to ASTERISK_SECRET
permit = 0.0.0.0/0 ; Or a more specific IP/subnet for security
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan,originate
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan,originate
; Adjust read/write permissions as needed. For PJSIPShowEndpoints, 'system' or 'config' read is usually sufficient.
```

Reload Asterisk dialplan or manager settings after changes (`manager reload` in Asterisk CLI).
