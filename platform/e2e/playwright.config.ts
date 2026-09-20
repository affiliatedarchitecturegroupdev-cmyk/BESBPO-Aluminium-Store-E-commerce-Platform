import { defineConfig, devices } from '@playwright/test';

// Storefront end-to-end configuration.
//
// The tests assume a running stack — storefront on 3000, backend on 4000, pricing service on 8000,
// and a seeded database — rather than starting one itself. That is deliberate: CI brings the
// stack up in the browser-e2e job using the same `npm run start` entry point Render runs, and a
// storefront run must exercise the process the platform actually deploys rather than a dev server.
//
// BASE_URL lets the same suite run against a Render preview deployment unchanged.
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});