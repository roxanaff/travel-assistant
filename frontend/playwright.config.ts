// Browser-test setup. Playwright starts a test API and local frontend, then
// runs the end-to-end tests in Chromium without using real trip data.
import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "5263";
const frontendPort = process.env.PLAYWRIGHT_FRONTEND_PORT ?? "5173";
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    use: {
        baseURL: frontendOrigin,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: [
        {
            command:
                `dotnet run --project ../backend --no-restore --no-launch-profile --urls ${apiOrigin}`,
            url: `${apiOrigin}/health`,
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                ASPNETCORE_ENVIRONMENT: "Testing",
                Cors__AllowedOrigins__0: frontendOrigin,
                Testing__UseInMemoryDatabase: "true",
                Testing__ResetDatabase: "true",
            },
        },
        {
            command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
            url: frontendOrigin,
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                VITE_API_BASE_URL: apiOrigin,
            },
        },
    ],
});
