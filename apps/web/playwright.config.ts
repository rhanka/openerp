import { defineConfig, devices } from "@playwright/test";

const webPort = 4173;
const webUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: `npm run dev -- --port ${webPort}`,
    url: webUrl,
    reuseExistingServer: true,
    timeout: 120_000
  },
  use: {
    baseURL: webUrl,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
