import { defineConfig, devices } from "@playwright/test";

// 3000 is often already taken locally; this suite always boots its own dev server.
const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(port),
      // src/instrumentation.ts starts MSW only when this is set.
      E2E_MSW: "1",
      // Closed on purpose: a request that misses the mock fails instead of hitting a real API.
      BACKEND_URL: "http://127.0.0.1:9",
    },
  },
});
