// Central API address. Local development uses the .NET launch port; deployed builds must supply it.
const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://localhost:5263" : undefined);

if (!configuredApiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is not configured.");
}

// Normalising avoids accidental double slashes as feature API modules append their own paths.
export const apiBaseUrl = configuredApiBaseUrl.replace(/\/$/, "");
