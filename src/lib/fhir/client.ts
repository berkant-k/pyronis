import { customAlphabet } from "nanoid";
import config from "../config.json";
import { authHeaders, clearAuthToken } from "../auth";
import type { StatusColor } from "@/components/ui/StatusPill";

const _generateResourceId = customAlphabet(config.idGeneration.alphabet, config.idGeneration.maxLength);

export function generateResourceId(): string {
    return _generateResourceId();
}

export const FHIR_STORAGE_KEY = config.fhir.storageKey;

export function parseFhirReference(reference: string | undefined | null): { resourceType: string; id: string } | null {
    if (!reference) return null;
    const segments = reference.split("/");
    const id = segments.at(-1);
    const resourceType = segments.at(-2);
    if (!id || !resourceType) return null;
    return { resourceType, id };
}

export function parseFhirId(reference: string | undefined | null, expectedType?: string): string | undefined {
    const parsed = parseFhirReference(reference);
    if (!parsed) return undefined;
    if (expectedType && parsed.resourceType !== expectedType) return undefined;
    return parsed.id;
}

export function resolveStoredUrl(storageKey: string, envVar: string | undefined, label: string): string {
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem(storageKey);
        if (stored?.trim()) return stored.trim();
    }
    if (envVar?.trim()) return envVar.trim();
    throw new Error(`${label} base URL not set`);
}

export function getFhirBaseUrl(): string {
    return resolveStoredUrl(FHIR_STORAGE_KEY, process.env.NEXT_PUBLIC_FHIR_BASE_URL, "FHIR");
}

export function saveFhirBaseUrl(url: string): void {
    localStorage.setItem(FHIR_STORAGE_KEY, url.trim());
}

export async function testFhirConnection(
    baseUrl: string
): Promise<{ ok: boolean; message: string }> {
    try {
        const res = await fetch(`${baseUrl}/metadata`, {
            headers: await authHeaders({Accept: "application/fhir+json"}),
        });
        if (!res.ok) {
            return {ok: false, message: `Server returned ${res.status} ${res.statusText}`};
        }
        const cs = await res.json();
        const name = cs.name ?? cs.title ?? "FHIR Server";
        const version = cs.fhirVersion ?? "unknown";
        return {ok: true, message: `Connected — ${name} (FHIR ${version})`};
    } catch (err) {
        return {
            ok: false,
            message: err instanceof Error ? err.message : "Connection failed",
        };
    }
}

export const VISIT_ID_SYSTEM = config.fhir.identifierSystems.visitId;
export const QID_SYSTEM = config.fhir.identifierSystems.qid;
export const EXT_NATIONALITY = config.fhir.extensions.nationality;
export const EXT_LANGUAGE = config.fhir.extensions.language;
export const EXT_VIP = config.fhir.extensions.vip;
export const EXT_INSURANCE = config.fhir.extensions.insuranceCompany;
export const EXT_ADMIN_NOTES = config.fhir.extensions.administrativeNotes;
export const EXT_PERSON_TYPE = config.fhir.extensions.personType;
export const EXT_BIRTH_PLACE = config.fhir.extensions.birthPlace;
export const EXT_CADAVERIC_DONOR = config.fhir.extensions.cadavericDonor;
export const EXT_ETHNICITY = config.fhir.extensions.ethnicity;
export const EXT_NAME_LANGUAGE = config.fhir.extensions.nameLanguage;
export const EXT_ADDR_BUILDING = config.fhir.extensions.addressBuildingNumber;
export const EXT_ADDR_LANGUAGE = config.fhir.extensions.addressLanguage;
export const EXT_ADDR_STREET = config.fhir.extensions.addressStreetNumber;
export const EXT_ADDR_UNIT = config.fhir.extensions.addressUnit;
export const EXT_ADDR_ZONE = config.fhir.extensions.addressZone;
export const MANAGING_ORG_IDENTIFIER = config.fhir.managingOrganization.identifier;

export interface CodeOption {
    code: string;
    display: string;
    system?: string
}

export const PERSON_TYPE_OPTIONS: CodeOption[] = config.fhir.options.personType;
export const ETHNICITY_OPTIONS: CodeOption[] = config.fhir.options.ethnicity;

async function extractFhirErrorMessage(res: Response): Promise<string> {
    try {
        const body = await res.json();
        if (body?.resourceType === "OperationOutcome") {
            const issue = body.issue?.[0];
            const text = issue?.details?.text ?? issue?.diagnostics;
            if (text) return String(text);
        }
        if (typeof body?.message === "string") return body.message;
    } catch { /* ignore */ }
    return `Server error (${res.status})`;
}

export async function fhirRequest(url: string, init: RequestInit): Promise<Response> {
    const res = await fetch(url, init);
    if (res.status === 401) {
        if (typeof window !== "undefined") {
            clearAuthToken();
            window.location.href = "/login";
            throw new Error("Unauthorized");
        }
        const { cookies } = await import("next/headers");
        const { redirect } = await import("next/navigation");
        const store = await cookies();
        store.delete(config.auth.storageKey);
        redirect("/login");
    }
    if (!res.ok) {
        const message = await extractFhirErrorMessage(res);
        if (typeof window !== "undefined") {
            import("sonner").then(({ toast }) => {
                toast.error(`FHIR Server Error (${res.status})`, { description: message });
            });
        }
        throw new Error(message);
    }
    return res;
}

export async function fhirFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${getFhirBaseUrl()}/${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fhirRequest(url.toString(),
        {headers: await authHeaders({Accept: "application/fhir+json"})}
    );
    if (!res.ok) throw new Error(`FHIR request failed: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
}

// Re-export StatusColor for consumers that import it via this module
export type { StatusColor };
