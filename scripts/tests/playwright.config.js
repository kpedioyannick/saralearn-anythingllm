import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  // Les flux LLM sont lents (DeepSeek 20-40s) — on prend de la marge.
  timeout: 120_000,
  expect: { timeout: 30_000 },

  use: {
    baseURL: process.env.SARA_URL || "https://fr.sara.education",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
