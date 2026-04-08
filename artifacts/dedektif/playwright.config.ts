import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:22971";
const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 400, height: 720 },
    ignoreHTTPSErrors: true,
    launchOptions: {
      executablePath: CHROMIUM_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-namespace-sandbox",
        "--disable-software-rasterizer",
        "--in-process-gpu",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
    },
  ],
});
