import { defineConfig, devices } from "@playwright/test";

// The flag-on suite must boot a server that inherited the flag. Reusing the
// normal flag-off dev server makes the suite silently exercise the rollback
// surface instead of the platform UI.
const platformAuthUiEnabled = process.env.OPENERP_PLATFORM_AUTH_UI_ENABLED === "1";
const webPort = platformAuthUiEnabled ? 4174 : 4173;
const webUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: `npm run dev -- --port ${webPort}`,
    url: webUrl,
    // For the platform suite, an existing server could have been started with
    // the legacy flag value. Use a dedicated port and fail loudly instead of
    // accepting an incompatible process environment.
    reuseExistingServer: !platformAuthUiEnabled,
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
