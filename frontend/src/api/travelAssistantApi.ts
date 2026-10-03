// Local development calls the .NET server directly.
// Production calls the same-origin Pages proxy at /api, so browser authentication cookies stay first-party.
const configuredApiBaseUrl = import.meta.env.DEV
    ? (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5263")
    : "";

// Normalising avoids accidental double slashes as feature API modules append their own paths.
export const apiBaseUrl = configuredApiBaseUrl.replace(/\/$/, "");

/** Every API call explicitly includes the browser's same-origin authentication cookie. */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
    return fetch(input, { ...init, credentials: "include" });
}

/** Throws one consistent API error while retaining any useful server message. */
export async function throwIfApiError(
    response: Response,
    fallbackMessage: string,
) {
    if (response.ok) return;

    const responseText = await response.text();
    if (!responseText) throw new Error(fallbackMessage);

    let message = responseText;
    try {
        const parsed = JSON.parse(responseText);
        if (typeof parsed === "string") message = parsed;
    } catch {
        // Plain-text API responses are already suitable for display.
    }
    throw new Error(message);
}
