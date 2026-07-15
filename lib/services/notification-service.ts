import { prisma } from "@/lib/prisma";
import twilio from "twilio";

export type NotificationType = "JOINED" | "THREE_AWAY" | "YOUR_TURN" | "QUEUE_CANCELLED";

export class NotificationService {
  /**
   * Composes and sends a notification for a QueueEntry.
   * This function is guaranteed never to throw an error, preventing notification failures
   * from rolling back or blocking the calling queue operations.
   */
  static async sendNotification(
    queueEntryId: string,
    type: NotificationType,
    channel: "SMS" = "SMS"
  ): Promise<void> {
    try {
      // 1. Fetch QueueEntry with Queue and Business info
      const entry = await prisma.queueEntry.findUnique({
        where: { id: queueEntryId },
        include: {
          queue: {
            include: {
              business: true,
            },
          },
        },
      });

      if (!entry) {
        console.error(`[NotificationService] QueueEntry not found: ${queueEntryId}`);
        return;
      }

      if (!entry.customerPhone) {
        console.warn(`[NotificationService] No customerPhone for entry: ${queueEntryId}`);
        return;
      }

      // 2. Compose notification message
      const businessName = entry.queue.business.name;
      const queueName = entry.queue.name;
      const customerName = entry.customerName;
      const position = entry.position;
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const trackingUrl = `${baseUrl}/track/${entry.trackingToken}`;

      let body = "";
      switch (type) {
        case "JOINED":
          body = `Hi ${customerName}, you've joined the line for "${queueName}" at "${businessName}". Position: #${position}. Track live: ${trackingUrl}`;
          break;
        case "THREE_AWAY":
          body = `Hi ${customerName}, you're now 3rd in line for "${queueName}" at "${businessName}". Please start heading to the check-in area.`;
          break;
        case "YOUR_TURN":
          body = `Hi ${customerName}, it's your turn for "${queueName}" at "${businessName}"! Please proceed to the service counter now.`;
          break;
        case "QUEUE_CANCELLED":
          body = `Hi ${customerName}, the queue "${queueName}" at "${businessName}" has been closed. Your ticket has been cancelled. Sorry for any inconvenience.`;
          break;
        default:
          console.error(`[NotificationService] Unsupported type: ${type}`);
          return;
      }

      const twilioEnabled = process.env.TWILIO_ENABLED === "true";
      let status: "SENT" | "FAILED" | "MOCKED" = "MOCKED";
      let providerRef: string | null = null;

      // 3. Handle sending based on Twilio config
      if (twilioEnabled) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_FROM_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
          console.error("[NotificationService] Missing Twilio environment configuration.");
          status = "FAILED";
          providerRef = "Missing configuration variables";
        } else {
          try {
            const client = twilio(accountSid, authToken);
            const message = await client.messages.create({
              body,
              from: fromNumber,
              to: entry.customerPhone,
            });
            status = "SENT";
            providerRef = message.sid;
          } catch (twilioErr: unknown) {
            console.error("[NotificationService] Twilio API send error:", twilioErr);
            status = "FAILED";
            providerRef = twilioErr instanceof Error ? twilioErr.message : "Twilio error";
          }
        }
      }

      // 4. Log the notification attempt inside Notification table
      await prisma.notification.create({
        data: {
          queueEntryId,
          type,
          channel,
          status,
          providerRef,
        },
      });

      // 5. Update threeAwayNotifiedAt to prevent duplicate sends of THREE_AWAY
      if (type === "THREE_AWAY" && (status === "SENT" || status === "MOCKED")) {
        await prisma.queueEntry.update({
          where: { id: queueEntryId },
          data: { threeAwayNotifiedAt: new Date() },
        });
      }

    } catch (err: unknown) {
      // Catch-all failure isolation to ensure database and network issues do not throw to the caller
      console.error("[NotificationService] Critical error in notification processing:", err);
    }
  }
}
