import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vite and Vitest share this configuration so browser smoke tests remain separate from unit tests.
export default defineConfig({
    plugins: [react()],
    test: {
        exclude: ["tests/e2e/**", "**/node_modules/**", "**/dist/**"],
    },
});
