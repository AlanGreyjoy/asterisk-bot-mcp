import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

export interface AsteriskConfig {
  host: string;
  port: number;
  username: string;
  secret: string;
}

const asteriskConfig: AsteriskConfig = {
  host: process.env.ASTERISK_HOST || "127.0.0.1",
  port: parseInt(process.env.ASTERISK_PORT || "5038", 10),
  username: process.env.ASTERISK_USERNAME || "admin",
  secret: process.env.ASTERISK_SECRET || "mysecret",
};

if (!asteriskConfig.username || !asteriskConfig.secret) {
  console.warn(
    "Asterisk username or secret is not defined in environment variables. Please check your .env file.",
  );
}

export default asteriskConfig;
