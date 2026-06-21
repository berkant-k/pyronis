import type {
    Bundle,
    Composition,
    Condition,
    Encounter,
    MedicationRequest,
    Observation,
    Patient,
} from "@medplum/fhirtypes";
import { customAlphabet } from "nanoid";
import config from "../config.json";
import { authHeaders } from "../auth";
import {
    fhirRequest,
    fhirFetch,
    getFhirBaseUrl,
    generateResourceId,
    parseFhirId,
    VISIT_ID_SYSTEM,
    MANAGING_ORG_IDENTIFIER,
} from "./client";
import { searchPatients } from "./patients";
import { searchPractitioners } from "./admin";

const generateVisitId = customAlphabet(config.idGeneration.alphabet, config.idGeneration.maxLength);
const COMPOSITION_ID_SYSTEM = config.fhir.identifierSystems.composition;

export async function generateNextVisitId(): Promise<string> {
    return generateVisitId();
}

export function getEncounterVisitId(enc: Encounter): string {
    return enc.identifier?.find((i) => i.system === VISIT_ID_SYSTEM)?.value ?? "";
}

export async function getEncounter(id: string): Promise<Encounter> {
    return fhirFetch<Encounter>(`Encounter/${id}`);
}

export function encounterStatusColor(status: string) {
    const map: Record<string, string> = {
        "in-progress":      "green",
        finished:           "slate",
        cancelled:          "red",
        planned:            "blue",
        "on-hold":          "amber",
        "entered-in-error": "rose",
    };
    return (map[status] ?? "muted") as import("@/components/ui/StatusPill").StatusColor;
}

export function getEncounterTriageAcuity(enc: Encounter): string | null {
    return enc.priority?.coding?.find(
        (c) => c.system === config.fhir.codeSystems.triageAcuity
    )?.code ?? null;
}

export function triageAcuityColor(code: string) {
    const map: Record<string, string> = { "1": "red", "2": "orange", "3": "yellow", "4": "green", "5": "blue" };
    return (map[code] ?? "muted") as import("@/components/ui/StatusPill").StatusColor;
}

export function triageAcuityLabel(code: string): string {
    return config.fhir.options.triageAcuity.find((t) => t.code === code)?.display ?? `ESI ${code}`;
}

export async function getEncounterObservations(encounterId: string): Promise<Observation[]> {
    const bundle = await fhirFetch<Bundle>("Observation", {
        encounter: `Encounter/${encounterId}`,
        _count: "50",
        _sort: "-date",
    });
    return (bundle.entry ?? []).map((e) => e.resource as Observation).filter((r): r is Observation => r?.resourceType === "Observation");
}

export async function getEncounterConditions(encounterId: string): Promise<Condition[]> {
    const bundle = await fhirFetch<Bundle>("Condition", {
        encounter: `Encounter/${encounterId}`,
        _count: "50",
    });
    return (bundle.entry ?? []).map((e) => e.resource as Condition).filter((r): r is Condition => r?.resourceType === "Condition");
}

export async function getEncounterMedications(encounterId: string): Promise<MedicationRequest[]> {
    const bundle = await fhirFetch<Bundle>("MedicationRequest", {
        encounter: `Encounter/${encounterId}`,
        _count: "50",
    });
    return (bundle.entry ?? []).map((e) => e.resource as MedicationRequest).filter((r): r is MedicationRequest => r?.resourceType === "MedicationRequest");
}

export async function getPatientEncounters(patientId: string): Promise<Encounter[]> {
    const bundle = await fhirFetch<Bundle>("Encounter", {patient: patientId, _count: "20", _sort: "-date"});
    return (bundle.entry ?? []).map((e) => e.resource as Encounter).filter((r): r is Encounter => r?.resourceType === "Encounter");
}

export interface NewEncounterInput {
    patientId: string;
    classCode: string;
    classDisplay: string;
    typeText?: string;
    serviceType?: string;
    reasonText?: string;
    triageAcuity?: string;
    periodStart: string;
    participantIds?: string[];
    appointmentId?: string;
}

export async function createEncounter(input: NewEncounterInput): Promise<Encounter> {
    const visitId = await generateNextVisitId();
    const body: Encounter = {
        resourceType: "Encounter",
        identifier: [{
            type: {
                coding: [{
                    system: config.fhir.codeSystems.identifierTypeCodes,
                    code: "VN",
                    display: "Visit number",
                }],
                text: "Visit ID",
            },
            system: VISIT_ID_SYSTEM,
            value: visitId,
        }],
        status: "in-progress",
        serviceProvider: {"reference": "Organization?identifier="+MANAGING_ORG_IDENTIFIER},
        class: {
            system: config.fhir.codeSystems.actCode,
            code: input.classCode,
            display: input.classDisplay,
        },
        subject: {reference: `Patient/${input.patientId}`},
        period: {start: input.periodStart},
        ...(input.typeText ? {type: [{text: input.typeText}]} : {}),
        ...(input.serviceType ? {serviceType: {text: input.serviceType}} : {}),
        ...(input.reasonText ? {reasonCode: [{text: input.reasonText}]} : {}),
        ...(input.triageAcuity ? {
            priority: {
                coding: [{
                    system: config.fhir.codeSystems.triageAcuity,
                    code: input.triageAcuity,
                    display: config.fhir.options.triageAcuity.find((t) => t.code === input.triageAcuity)?.display,
                }],
            },
        } : {}),
        ...(input.participantIds?.length ? {
            participant: input.participantIds.map((pid) => ({
                individual: { reference: `Practitioner/${pid}` },
            })),
        } : {}),
        ...(input.appointmentId ? { appointment: [{ reference: `Appointment/${input.appointmentId}` }] } : {}),
    };

    const res = await fhirRequest(`${getFhirBaseUrl()}/Encounter`, {
        method: "POST",
        headers: await authHeaders({"Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation"}),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create encounter: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Encounter>;
}

export interface SoapNoteInput {
    patientId: string;
    encounterId: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
}

export interface ParsedSoapNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

const SOAP_CODES = {
    subjective: { code: "10164-2", display: "History of Present Illness" },
    objective:  { code: "61149-1", display: "Objective" },
    assessment: { code: "51848-0", display: "Evaluation note" },
    plan:       { code: "18776-5", display: "Plan of care note" },
} as const;

function toNarrativeDiv(text: string): string {
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<div xmlns="http://www.w3.org/1999/xhtml">${escaped}</div>`;
}

function fromNarrativeDiv(div: string): string {
    return div
        .replace(/^<div[^>]*>/, "").replace(/<\/div>\s*$/, "")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
        .trim();
}

export function parseSoapNote(comp: Composition): ParsedSoapNote {
    const get = (code: string) => {
        const sec = comp.section?.find(s => s.code?.coding?.some(c => c.code === code));
        return sec?.text?.div ? fromNarrativeDiv(sec.text.div) : "";
    };
    return {
        subjective: get(SOAP_CODES.subjective.code),
        objective:  get(SOAP_CODES.objective.code),
        assessment: get(SOAP_CODES.assessment.code),
        plan:       get(SOAP_CODES.plan.code),
    };
}

function buildSoapComposition(input: SoapNoteInput, id?: string): Composition {
    const entries = Object.entries(SOAP_CODES) as [keyof typeof SOAP_CODES, typeof SOAP_CODES[keyof typeof SOAP_CODES]][];
    const sections: NonNullable<Composition["section"]> = entries
        .filter(([field]) => (input[field] ?? "").trim())
        .map(([field, meta]) => ({
            title: field.charAt(0).toUpperCase() + field.slice(1),
            code: { coding: [{ system: config.fhir.codeSystems.loinc, code: meta.code, display: meta.display }] },
            text: { status: "generated" as const, div: toNarrativeDiv(input[field]!.trim()) },
        }));
    return {
        resourceType: "Composition",
        ...(id ? { id } : {}),
        status: "final",
        type: {
            coding: [{ system: config.fhir.codeSystems.loinc, code: "11488-4", display: "Consult note" }],
            text: "SOAP Note",
        },
        subject: { reference: `Patient/${input.patientId}` },
        encounter: { reference: `Encounter/${input.encounterId}` },
        date: new Date().toISOString(),
        author: [{ display: "Pyronis EMR" }],
        title: "SOAP Note",
        section: sections,
    };
}

export async function getEncounterSoapNotes(encounterId: string): Promise<Composition[]> {
    const bundle = await fhirFetch<Bundle>("Composition", {
        encounter: `Encounter/${encounterId}`,
        _count: "10",
        _sort: "-date",
    });
    return (bundle.entry ?? [])
        .map(e => e.resource as Composition)
        .filter((r): r is Composition => r?.resourceType === "Composition");
}

export async function createSoapNote(input: SoapNoteInput): Promise<Composition> {
    const body = buildSoapComposition(input);
    body.identifier = { system: COMPOSITION_ID_SYSTEM, value: generateResourceId() };
    const res = await fhirRequest(`${getFhirBaseUrl()}/Composition`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create SOAP note: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Composition>;
}

export async function updateSoapNote(id: string, input: SoapNoteInput): Promise<Composition> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Composition/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildSoapComposition(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update SOAP note: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Composition>;
}

export async function closeEncounter(id: string): Promise<Encounter> {
    const existing = await getEncounter(id);
    const body: Encounter = {
        ...existing,
        status: "finished",
        period: { ...existing.period, end: new Date().toISOString() },
    };
    const res = await fhirRequest(`${getFhirBaseUrl()}/Encounter/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to close encounter: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Encounter>;
}

export interface EncounterWithPatient {
    encounter: Encounter;
    patient?: Patient;
}

export interface EncounterSearchParams {
    patientQuery?: string;
    practitionerQuery?: string;
    status?: string;
    classCode?: string;
    count?: number;
}

export async function searchEncounters(params: EncounterSearchParams = {}): Promise<EncounterWithPatient[]> {
    const {patientQuery, practitionerQuery, status, classCode, count = 50} = params;

    const fhirParams: Record<string, string> = {
        _sort: "-date",
        _count: String(count),
        _include: "Encounter:patient",
    };
    if (status) fhirParams.status = status;
    if (classCode) fhirParams.class = classCode;

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.patient = knownPatients
            .slice(0, 20)
            .map((p) => `Patient/${p.id}`)
            .join(",");
    }

    if (practitionerQuery?.trim()) {
        const practitioners = await searchPractitioners(practitionerQuery.trim());
        if (practitioners.length === 0) return [];
        fhirParams.participant = practitioners
            .slice(0, 20)
            .filter((p) => p.id)
            .map((p) => `Practitioner/${p.id}`)
            .join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("Encounter", fhirParams);
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const encounters: Encounter[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "Encounter") encounters.push(r as Encounter);
        }
        return encounters.map((enc) => {
            const ref = enc.subject?.reference;
            const pid = parseFhirId(ref, "Patient");
            return {encounter: enc, patient: pid ? patientMap.get(pid) : undefined};
        });
    } catch {
        return [];
    }
}

export async function getRecentEncountersWithPatients(count = 6): Promise<EncounterWithPatient[]> {
    try {
        const bundle = await fhirFetch<Bundle>("Encounter", {
            _sort: "-date",
            _count: String(count),
            _include: "Encounter:patient",
        });

        const patientMap = new Map<string, Patient>();
        const encounters: Encounter[] = [];

        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) {
                patientMap.set(r.id, r as Patient);
            } else if (r.resourceType === "Encounter") {
                encounters.push(r as Encounter);
            }
        }

        return encounters.map((enc) => {
            const ref = enc.subject?.reference;
            const pid = parseFhirId(ref, "Patient");
            return {encounter: enc, patient: pid ? patientMap.get(pid) : undefined};
        });
    } catch {
        return [];
    }
}
