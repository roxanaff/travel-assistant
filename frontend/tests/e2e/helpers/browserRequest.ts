import type { Page } from "@playwright/test";

// Follow the same browser cookie policy as the application during test setup/assertions.
export async function browserRequest(
    page: Page,
    url: string,
    data?: Record<string, unknown>,
    method = data ? "POST" : "GET",
) {
    return page.evaluate(async ({ requestUrl, requestData, requestMethod }) => {
        const response = await fetch(requestUrl, {
            method: requestMethod,
            credentials: "include",
            headers: requestData ? { "Content-Type": "application/json" } : undefined,
            body: requestData ? JSON.stringify(requestData) : undefined,
        });
        return { status: response.status, body: response.status === 204 ? null : await response.json() };
    }, { requestUrl: url, requestData: data, requestMethod: method });
}
