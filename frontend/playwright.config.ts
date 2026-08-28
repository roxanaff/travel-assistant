import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    use: {
        baseURL: "http://127.0.0.1:5173",
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
                "dotnet run --project ../backend --no-restore --no-launch-profile --urls http://127.0.0.1:5263",
            url: "http://127.0.0.1:5263/health",
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                ASPNETCORE_ENVIRONMENT: "Testing",
                Cors__AllowedOrigins__0: "http://127.0.0.1:5173",
                Testing__UseInMemoryDatabase: "true",
                Testing__ResetDatabase: "true",
            },
        },
        {
            command: "npm run dev -- --host 127.0.0.1 --port 5173",
            url: "http://127.0.0.1:5173",
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                VITE_API_BASE_URL: "http://127.0.0.1:5263",
            },
        },
    ],
});
