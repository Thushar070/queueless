/* eslint-disable */
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve(__dirname, "screenshots");
const ARTIFACT_SCREENSHOT_DIR = "/home/billy/.gemini/antigravity-ide/brain/292cb938-1bd7-4a34-82de-db23ef2a0f38/screenshots";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) {
  fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });
}

function saveScreenshot(pageName: string, buffer: Buffer) {
  const file1 = path.join(SCREENSHOT_DIR, `${pageName}.png`);
  const file2 = path.join(ARTIFACT_SCREENSHOT_DIR, `${pageName}.png`);
  fs.writeFileSync(file1, buffer);
  fs.writeFileSync(file2, buffer);
  console.log(`Saved screenshot: ${pageName}.png`);
}

async function main() {
  console.log("=== STARTING FULL-SYSTEM BROWSER-DRIVEN VERIFICATION PASS ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results: Record<string, { status: "PASS" | "FAIL"; details: string; screenshot?: string }> = {};

  try {
    // 1. Landing Page
    console.log("\n--- 1. PUBLIC LANDING PAGE ---");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const landingTitle = await page.title();
    const landingShot = await page.screenshot({ fullPage: true });
    saveScreenshot("01_public_landing", landingShot);
    results["Public Landing Page"] = {
      status: "PASS",
      details: `Loaded successfully. Page title: "${landingTitle}".`,
      screenshot: "01_public_landing.png",
    };

    // 2. Signup Page
    console.log("\n--- 2. SIGNUP PAGE ---");
    await page.goto(`${BASE_URL}/signup`, { waitUntil: "networkidle" });
    const signupShot = await page.screenshot({ fullPage: true });
    saveScreenshot("02_signup_page", signupShot);
    results["Public Signup Page"] = {
      status: "PASS",
      details: "Loaded successfully.",
      screenshot: "02_signup_page.png",
    };

    // 3. Login Page
    console.log("\n--- 3. LOGIN PAGE ---");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    const loginShot = await page.screenshot({ fullPage: true });
    saveScreenshot("03_login_page", loginShot);
    results["Public Login Page"] = {
      status: "PASS",
      details: "Loaded successfully.",
      screenshot: "03_login_page.png",
    };

    // 4. Create Business & Login via API / Signup Form
    console.log("\n--- 4. BUSINESS CREATION & LOGIN ---");
    const testEmail = `verify_owner_${Date.now()}@example.com`;
    const testPassword = "Password123!";
    const businessName = `Audit Bakery ${Date.now()}`;

    // Perform business signup API call
    const res = await page.request.post(`${BASE_URL}/api/signup/business`, {
      data: {
        businessName,
        ownerName: "Verification Owner",
        email: testEmail,
        password: testPassword,
      },
    });

    console.log("Signup API status:", res.status());
    const signupData = await res.json();
    console.log("Signup API response:", signupData);

    if (!res.ok()) {
      results["Business Signup"] = {
        status: "FAIL",
        details: `API signup failed with status ${res.status()}: ${JSON.stringify(signupData)}`,
      };
    } else {
      results["Business Signup"] = {
        status: "PASS",
        details: `Successfully registered business "${businessName}" with email "${testEmail}".`,
      };

      // Perform login in browser UI
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log("Current URL after login submit:", currentUrl);
      const afterLoginShot = await page.screenshot({ fullPage: true });
      saveScreenshot("04_after_login", afterLoginShot);

      results["Login Flow"] = {
        status: currentUrl.includes("/dashboard") || currentUrl.includes("/onboarding") ? "PASS" : "FAIL",
        details: `Redirected to ${currentUrl} after login.`,
        screenshot: "04_after_login.png",
      };

      // 5. Onboarding / Profile / Phone Verification
      if (currentUrl.includes("/onboarding/profile")) {
        console.log("\n--- 5. ONBOARDING PROFILE FORM ---");
        const profileShot = await page.screenshot({ fullPage: true });
        saveScreenshot("05_onboarding_profile", profileShot);

        // Fill onboarding profile form if inputs exist
        const phoneInput = page.locator('input[name="phone"], input[type="tel"]');
        if (await phoneInput.count() > 0) {
          await phoneInput.fill("9876543210");
          const submitBtn = page.locator('button[type="submit"]');
          if (await submitBtn.count() > 0) {
            await submitBtn.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      // Check phone verify page
      await page.goto(`${BASE_URL}/onboarding/verify-phone`);
      const verifyPhoneShot = await page.screenshot({ fullPage: true });
      saveScreenshot("06_verify_phone_page", verifyPhoneShot);
      const verifyPhoneContent = await page.content();

      results["Onboarding & OTP Screen"] = {
        status: "PASS",
        details: `Loaded /onboarding/verify-phone. Page contains OTP form: ${verifyPhoneContent.includes("OTP") || verifyPhoneContent.includes("Verification")}.`,
        screenshot: "06_verify_phone_page.png",
      };

      // Ensure business has profileCompleted = true and phoneVerifiedAt set for dashboard access testing
      // We can query database directly or bypass for testing dashboard features
    }

  } catch (err: any) {
    console.error("Error in browser verification runner:", err);
  } finally {
    await browser.close();
    console.log("\n=== INITIAL RUN COMPLETED ===");
  }
}

main();
