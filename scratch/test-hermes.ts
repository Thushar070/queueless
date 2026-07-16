import dotenv from "dotenv";
import path from "path";

// Load .env explicitly for standalone execution
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { HermesRelayService } from "../lib/services/hermes-relay-service";

async function main() {
  console.log("Checking environment variables...");
  console.log("HERMES_RELAY_BASE_URL:", process.env.HERMES_RELAY_BASE_URL);
  console.log("HERMES_RELAY_SENDER_NUMBER:", process.env.HERMES_RELAY_SENDER_NUMBER);
  const keyLength = process.env.HERMES_RELAY_API_KEY?.length || 0;
  console.log("HERMES_RELAY_API_KEY length:", keyLength);

  const sender = process.env.HERMES_RELAY_SENDER_NUMBER;
  if (!sender) {
    console.error("HERMES_RELAY_SENDER_NUMBER is not defined in .env!");
    return;
  }

  console.log("\n--- DRY RUN (WITHOUT SENDING) ---");
  const normalized = HermesRelayService.validateAndNormalizePhone(sender);
  console.log("Normalized sender number:", normalized);
  const cleanUrl = process.env.HERMES_RELAY_BASE_URL?.endsWith("/") 
    ? process.env.HERMES_RELAY_BASE_URL.slice(0, -1) 
    : process.env.HERMES_RELAY_BASE_URL;
  console.log("Constructed Endpoint:", `${cleanUrl}/api/v1/messages/`);

  console.log("\n--- FIRST LIVE SEND TEST ---");
  const testMessage = "Hello from QueueLess Hermes-Relay Integration Test!";
  console.log(`Sending to ${sender} (${normalized})...`);
  const result = await HermesRelayService.sendSms(sender, testMessage);
  console.log("Result object returned to caller:", result);
}

main().catch(console.error);
