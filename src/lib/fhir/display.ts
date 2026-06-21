import type {
    Bundle,
    Patient,
    Practitioner,
    Resource,
} from "@medplum/fhirtypes";
import {
    fhirFetch,
    EXT_LANGUAGE,
    EXT_NAME_LANGUAGE,
} from "./client";
import { bundleToPatients } from "./patients";

// ─── Display helpers ─────────────────────────────────────────────────────────

export function practitionerDisplayName(p: Practitioner): string {
    const name = p.name?.[0];
    if (!name) return "Unknown Practitioner";
    const parts = [...(name.prefix ?? []), ...(name.given ?? []), name.family ?? ""].filter(Boolean);
    return parts.join(" ").trim() || name.text || "Unknown Practitioner";
}

export function getPractitionerQualification(p: Practitioner): string {
    return (
        p.qualification?.[0]?.code?.coding?.[0]?.display ??
        p.qualification?.[0]?.code?.text ??
        ""
    );
}

export function patientDisplayName(p: Patient): string {
    const name = p.name?.find((n) => !n.extension?.some((x) => x.url === EXT_LANGUAGE || x.url === EXT_NAME_LANGUAGE)) ?? p.name?.[0];
    if (!name) return "Unknown Patient";
    const parts = [...(name.prefix ?? []), ...(name.given ?? []), name.family ?? ""].filter(Boolean);
    return parts.join(" ").trim() || name.text || "Unknown Patient";
}

export function patientAge(p: Patient): string {
    if (!p.birthDate) return "—";
    const birth = new Date(p.birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    return String(m < 0 || (m === 0 && now.getDate() < birth.getDate()) ? years - 1 : years);
}

export function formatDate(dateStr?: string): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {year: "numeric", month: "short", day: "numeric"});
}

export function formatDateTime(dateStr?: string): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export function formatRelativeTime(dateStr?: string): string {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
    return `${Math.floor(mo / 12)} yr${Math.floor(mo / 12) === 1 ? "" : "s"} ago`;
}

export function codeDisplay(r: Resource | undefined): string {
    if (!r) return "—";
    const coded = r as { code?: { coding?: { display?: string }[]; text?: string } };
    return coded.code?.coding?.[0]?.display ?? coded.code?.text ?? "—";
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardCounts {
    totalPatients: number;
    newPatientsToday: number;
    activeEncounters: number;
    activeMedications: number;
    activeConditions: number;
}

async function countResources(resource: string, params?: Record<string, string>): Promise<number> {
    try {
        const bundle = await fhirFetch<Bundle>(resource, {...params, _summary: "count"});
        return bundle.total ?? 0;
    } catch {
        return 0;
    }
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
    const today = new Date().toISOString().split("T")[0];
    const [totalPatients, newPatientsToday, activeEncounters, activeMedications, activeConditions] =
        await Promise.all([
            countResources("Patient", {"active": "true"}),
            countResources("Patient", {_lastUpdated: `ge${today}`}),
            countResources("Encounter", {status: "in-progress"}),
            countResources("MedicationRequest", {status: "active"}),
            countResources("Condition", {"clinical-status": "active"}),
        ]);
    return {totalPatients, newPatientsToday, activeEncounters, activeMedications, activeConditions};
}

export async function getRecentPatients(count = 8): Promise<Patient[]> {
    const bundle = await fhirFetch<Bundle>("Patient", {
        _sort: "-_lastUpdated",
        _count: String(count),
    });
    return bundleToPatients(bundle);
}
