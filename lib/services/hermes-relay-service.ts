export interface SmsResult {
  success: boolean;
  providerRef?: string;
  error?: string;
}

export class HermesRelayService {
  /**
   * Validates and normalizes an Indian phone number.
   * Accepts:
   * 1. 10 digits starting with 6/7/8/9 (e.g. 9876543210) -> returns +919876543210
   * 2. +91 followed by 10 digits starting with 6/7/8/9 (e.g. +919876543210) -> returns +919876543210
   * 3. 91 followed by 10 digits starting with 6/7/8/9 (e.g. 919876543210) -> returns +919876543210
   */
  static validateAndNormalizePhone(phone: string): string | null {
    const cleaned = phone.replace(/\s+/g, "").replace(/[-\(\)]/g, "");
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
      return cleaned;
    }
    if (/^91[6-9]\d{9}$/.test(cleaned)) {
      return `+${cleaned}`;
    }
    return null;
  }

  static async sendSms(to: string, message: string): Promise<SmsResult> {
    const apiKey = process.env.HERMES_RELAY_API_KEY;
    const baseUrl = process.env.HERMES_RELAY_BASE_URL;

    const redactKey = (str: string) => {
      if (!apiKey) return str;
      return str.split(apiKey).join("[REDACTED_API_KEY]");
    };

    try {
      if (!apiKey || !baseUrl) {
        return {
          success: false,
          error: "Hermes-Relay configuration is missing (base URL or API key)",
        };
      }

      const normalizedTo = this.validateAndNormalizePhone(to);
      if (!normalizedTo) {
        return {
          success: false,
          error: `Invalid Indian phone number format: ${to}`,
        };
      }

      const cleanUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const endpoint = `${cleanUrl}/api/v1/messages/`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for Render latency

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: normalizedTo,
          message: message,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      // Server-side logging of response (safe, no keys exposed)
      console.log(`[HermesRelayService] Response Status: ${response.status}. Response Body:`, responseText);

      if (!response.ok) {
        return {
          success: false,
          error: redactKey(`HTTP Error ${response.status}: ${responseText}`),
        };
      }

      let providerRef: string | undefined;
      try {
        const data = JSON.parse(responseText);
        providerRef = data.id || data.jobId || data.messageId || data.ref || undefined;
      } catch {
        providerRef = "HTTP_OK";
      }

      return {
        success: true,
        providerRef,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[HermesRelayService] Error sending SMS:", redactKey(errMsg));
      return {
        success: false,
        error: redactKey(`Network/Send error: ${errMsg}`),
      };
    }
  }
}
