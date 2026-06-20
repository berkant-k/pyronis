import type { Bundle, CapabilityStatement, Patient } from "@medplum/fhirtypes";
import { patientToFormState, QID_SYSTEM, resolveStoredUrl, type PatientFormState } from "./fhir-client";
import config from "./config.json";
import { authHeaders } from "./auth";
export const EMPI_STORAGE_KEY = config.empi.storageKey;

export function getEmpiBaseUrl(): string {
  return resolveStoredUrl(EMPI_STORAGE_KEY, process.env.NEXT_PUBLIC_EMPI_BASE_URL, "eMPI");
}

export function saveEmpiBaseUrl(url: string): void {
  localStorage.setItem(EMPI_STORAGE_KEY, url.trim());
}

export async function queryEmpiByQID(
  qid: string,
  baseUrl: string
): Promise<PatientFormState | null> {
  const url = new URL(`${baseUrl}/Patient`);
  url.searchParams.set("identifier", `${QID_SYSTEM}|${qid}`);
  url.searchParams.set("_count", "1");

  const res = await fetch(url.toString(), {
    headers: await authHeaders({ Accept: "application/fhir+json" }),
  });
  if (!res.ok) throw new Error(`eMPI returned ${res.status} ${res.statusText}`);

  const bundle = (await res.json()) as Bundle;
  const patient = bundle.entry?.[0]?.resource as Patient | undefined;
  if (!patient || patient.resourceType !== "Patient") return null;

  return patientToFormState(patient);
}

export async function testEmpiConnection(
  baseUrl: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${baseUrl}/metadata`, {
      headers: await authHeaders({ Accept: "application/fhir+json" }),
    });
    if (!res.ok) {
      return { ok: false, message: `Server returned ${res.status} ${res.statusText}` };
    }
    const cs = (await res.json()) as CapabilityStatement;
    const name = cs.name ?? cs.title ?? "FHIR Server";
    const version = cs.fhirVersion ?? "unknown";
    return { ok: true, message: `Connected — ${name} (FHIR ${version})` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
