import { apiBaseUrl, apiFetch } from "./travelAssistantApi";

export type CurrentUser = {
    id: string;
    displayName: string;
    email: string;
};

type RegisterRequest = {
    displayName: string;
    email: string;
    password: string;
};

type LoginRequest = {
    email: string;
    password: string;
};

const authUrl = `${apiBaseUrl}/api/auth`;

/** Reads a plain-text or JSON-string API error without showing JSON quotation marks to the user. */
async function getErrorMessage(
    response: Response,
    fallback: string,
): Promise<string> {
    const body = await response.text();
    if (!body) 
        return fallback;

    try {
        const value: unknown = JSON.parse(body);
        return typeof value === "string" ? value : fallback;
    } catch {
        return body;
    }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
    const response = await apiFetch(`${authUrl}/me`);
    if (response.status === 401) 
        return null;
    if (!response.ok) 
        throw new Error("Could not restore your session.");
    return response.json();
}

export async function register(request: RegisterRequest): Promise<CurrentUser> {
    const response = await apiFetch(`${authUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!response.ok)
        throw new Error(
            await getErrorMessage(response, "Could not create your account."),
        );
    return response.json();
}

export async function login(request: LoginRequest): Promise<CurrentUser> {
    const response = await apiFetch(`${authUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (response.status === 401)
        throw new Error("Email or password is incorrect.");
    if (!response.ok)
        throw new Error("Could not sign you in. Please try again.");
    return response.json();
}

export async function logout(): Promise<void> {
    const response = await apiFetch(`${authUrl}/logout`, { method: "POST" });
    if (!response.ok)
        throw new Error("Could not sign you out. Please try again.");
}

export async function changePassword(
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    const response = await apiFetch(`${authUrl}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok)
        throw new Error(
            await getErrorMessage(
                response,
                "Could not change your password. Please try again.",
            ),
        );
}

export async function deleteAccount(password: string): Promise<void> {
    const response = await apiFetch(`${authUrl}/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });
    if (!response.ok)
        throw new Error(
            await getErrorMessage(
                response,
                "Could not delete your account. Please try again.",
            ),
        );
}
