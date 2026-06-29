import config from "./config.json";

const {storageKey} = config.auth;

export async function getAuthToken(): Promise<string | null> {
    if (typeof window !== "undefined") {
        return localStorage.getItem(storageKey) ?? null;
    }
    try {
        const {cookies} = await import("next/headers");
        const store = await cookies();
        return store.get(storageKey)?.value ?? null;
    } catch {
        return null;
    }
}

export function setAuthToken(token: string): void {
    localStorage.setItem(storageKey, token);
    document.cookie = `${storageKey}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

export function clearAuthToken(): void {
    localStorage.removeItem(storageKey);
    document.cookie = `${storageKey}=; path=/; max-age=0`;
}

export const NO_AUTH_SENTINEL = "no-auth";

export function fhirTenantHeaders(): Record<string, string> {
    const headerName = config.fhir.server.tenantHeader.trim();
    const tenant = process.env.NEXT_PUBLIC_FHIR_TENANT?.trim() || config.fhir.server.tenant.trim();
    if (!headerName || !tenant) return {};
    return { [headerName]: tenant };
}

export async function authHeaders(
    extra: Record<string, string> = {}
): Promise<Record<string, string>> {
    const token = await getAuthToken();
    if (!token) {
        clearAuthToken();
        window.location.href = "/login";
        return extra;
    }
    if (token === NO_AUTH_SENTINEL) return extra;

    if (typeof window !== "undefined") {
        const claims = parseJwtClaims(token);
        if (claims?.exp && typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
            clearAuthToken();
            window.location.href = "/login";
            return extra;
        }
    }

    return {...extra, Authorization: `Bearer ${token}`, ...fhirTenantHeaders()};
}

export function parseJwtClaims(token: string): Record<string, unknown> | null {
    try {
        const part = token.split(".")[1];
        if (!part) return null;
        const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
        return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
        return null;
    }
}
