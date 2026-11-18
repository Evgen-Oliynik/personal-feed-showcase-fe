import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      cwd: "../personal-feed-showcase-be",
      command: "npm ci && npm run start",
      env: {
        PORT: "4000",
        FAKE_EXTERNALS: "1",
        DATABASE_PATH: ":memory:",
      },
      url: "http://localhost:4000/health",
      reuseExistingServer: false,
      timeout: 300_000,
    },
    {
      command: "npm run dev",
      env: { PORT: "3000", NEXT_PUBLIC_API_URL: "http://localhost:4000" },
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
