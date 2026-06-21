import type {
    Bundle,
    MedicationAdministration,
    MedicationRequest,
} from "@medplum/fhirtypes";
import config from "../config.json";
import { authHeaders } from "../auth";
import {
    fhirRequest,
    fhirFetch,
    getFhirBaseUrl,
    generateResourceId,
    parseFhirId,
} from "./client";
import type { StatusColor } from "@/components/ui/StatusPill";

const MEDICATION_REQUEST_ID_SYSTEM = config.fhir.identifierSystems.medicationRequest;
const EXT_RX_STRUCTURED = config.fhir.extensions.rxStructured;
const INPT_CAT_CODE = "inpatient";
const EXT_INPT_STRUCTURED = config.fhir.extensions.inpatientMed;

// ─── Discharge prescriptions ──────────────────────────────────────────────────

export interface DischargeRxInput {
    patientId:     string;
    encounterId:   string;
    drugName:      string;
    dose?:         string;
    form?:         string;
    route?:        string;
    frequency?:    string;
    duration?:     string;
    quantity?:     string;
    refills?:      number;
    prn?:          boolean;
    prnReason?:    string;
    indication?:   string;
    instructions?: string;
}

const FREQ_DISPLAY: Record<string, string> = {
    "OD":      "once daily",
    "BD":      "twice daily",
    "TDS":     "three times daily",
    "QID":     "four times daily",
    "Q4H":     "every 4 hours",
    "Q6H":     "every 6 hours",
    "Q8H":     "every 8 hours",
    "Q12H":    "every 12 hours",
    "QHS":     "at bedtime",
    "QAM":     "every morning",
    "QW":      "once weekly",
    "BIW":     "twice weekly",
    "QOD":     "every other day",
    "Monthly": "once monthly",
};

const ROUTE_DISPLAY: Record<string, string> = {
    "Oral":       "by mouth",
    "IV":         "intravenously",
    "IM":         "intramuscularly",
    "SC":         "subcutaneously",
    "Topical":    "to the affected area",
    "Inhalation": "by inhalation",
    "Sublingual": "sublingually",
    "Intranasal": "intranasally",
    "Rectal":     "rectally",
    "Ophthalmic": "in the affected eye(s)",
    "Otic":       "in the affected ear(s)",
};

export function buildDosageSig(input: DischargeRxInput): string {
    const routeLower = (input.route ?? "").toLowerCase();
    const parts: string[] = [];

    if (routeLower.includes("topical") || routeLower.includes("cream") || routeLower.includes("ointment")) {
        parts.push("Apply");
    } else if (routeLower.includes("inhal")) {
        parts.push("Inhale");
    } else if (["IV", "IM", "SC"].includes(input.route ?? "")) {
        parts.push("Inject");
    } else if (routeLower.includes("ophthalmic") || routeLower.includes("otic")) {
        parts.push("Instil");
    } else {
        parts.push("Take");
    }

    if (input.dose)           parts.push(input.dose);
    if (input.form)           parts.push(input.form);
    if (input.route)          parts.push(ROUTE_DISPLAY[input.route] ?? `by ${routeLower}`);
    if (input.frequency && !input.prn) parts.push(FREQ_DISPLAY[input.frequency] ?? input.frequency.toLowerCase());
    if (input.prn)            parts.push("as needed");
    if (input.prn && input.prnReason) parts.push(`for ${input.prnReason}`);
    if (input.duration)       parts.push(`for ${input.duration}`);

    return parts.join(" ").replace(/\s+/g, " ").trim();
}

function buildDischargeRxBody(input: DischargeRxInput, id?: string): MedicationRequest {
    const extFields = [
        { url: "dose",     valueString: input.dose },
        { url: "form",     valueString: input.form },
        { url: "duration", valueString: input.duration },
    ].filter((e): e is { url: string; valueString: string } => !!e.valueString);

    return {
        resourceType: "MedicationRequest",
        ...(id ? { id } : {}),
        status: "active",
        intent: "order",
        category: [{
            coding: [{ system: config.fhir.codeSystems.medicationRequestCategory, code: "discharge", display: "Discharge" }],
            text: "Discharge",
        }],
        medicationCodeableConcept: { text: input.drugName },
        subject:    { reference: `Patient/${input.patientId}` },
        encounter:  { reference: `Encounter/${input.encounterId}` },
        authoredOn: new Date().toISOString().split("T")[0],
        dosageInstruction: [{
            text:             buildDosageSig(input),
            ...(input.route     ? { route: { text: input.route } } : {}),
            ...(input.frequency ? { timing: { code: { text: input.frequency } } } : {}),
            asNeededBoolean:  !!input.prn,
            ...(input.prn && input.prnReason
                ? { asNeededCodeableConcept: { text: input.prnReason } }
                : {}),
        }],
        ...(input.quantity || input.refills !== undefined ? {
            dispenseRequest: {
                ...(input.quantity ? {
                    quantity: { value: Number(input.quantity) || 0, unit: input.form ?? "unit" },
                } : {}),
                ...(input.refills !== undefined ? { numberOfRepeatsAllowed: input.refills } : {}),
            },
        } : {}),
        ...(input.indication   ? { reasonCode: [{ text: input.indication }] } : {}),
        ...(input.instructions ? { note: [{ text: input.instructions }] } : {}),
        ...(extFields.length ? {
            extension: [{ url: EXT_RX_STRUCTURED, extension: extFields }],
        } : {}),
    };
}

export function parseDischargeRx(m: MedicationRequest): DischargeRxInput {
    const ext    = m.extension?.find((e) => e.url === EXT_RX_STRUCTURED);
    const getExt = (key: string) => ext?.extension?.find((e) => e.url === key)?.valueString;
    return {
        patientId:    parseFhirId(m.subject?.reference, "Patient")   ?? "",
        encounterId:  parseFhirId(m.encounter?.reference, "Encounter") ?? "",
        drugName:     m.medicationCodeableConcept?.text ?? "",
        dose:         getExt("dose"),
        form:         getExt("form"),
        route:        m.dosageInstruction?.[0]?.route?.text,
        frequency:    m.dosageInstruction?.[0]?.timing?.code?.text ?? getExt("frequency"),
        duration:     getExt("duration"),
        quantity:     m.dispenseRequest?.quantity?.value?.toString() ?? getExt("quantity"),
        refills:      m.dispenseRequest?.numberOfRepeatsAllowed,
        prn:          m.dosageInstruction?.[0]?.asNeededBoolean,
        prnReason:    m.dosageInstruction?.[0]?.asNeededCodeableConcept?.text ?? getExt("prnReason"),
        indication:   m.reasonCode?.[0]?.text,
        instructions: m.note?.[0]?.text,
    };
}

export async function createDischargeRx(input: DischargeRxInput): Promise<MedicationRequest> {
    const body = buildDischargeRxBody(input);
    body.identifier = [{ system: MEDICATION_REQUEST_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/MedicationRequest`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create prescription: ${res.status} ${await res.text()}`);
    return res.json() as Promise<MedicationRequest>;
}

export async function updateDischargeRx(id: string, input: DischargeRxInput): Promise<MedicationRequest> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/MedicationRequest/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(buildDischargeRxBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update prescription: ${res.status} ${await res.text()}`);
    return res.json() as Promise<MedicationRequest>;
}

export async function cancelDischargeRx(id: string): Promise<MedicationRequest> {
    const existing = await fhirFetch<MedicationRequest>(`MedicationRequest/${id}`);
    const body: MedicationRequest = { ...existing, status: "cancelled" };
    const res = await fhirRequest(`${getFhirBaseUrl()}/MedicationRequest/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to cancel prescription: ${res.status} ${await res.text()}`);
    return res.json() as Promise<MedicationRequest>;
}

export async function getEncounterDischargeRx(encounterId: string): Promise<MedicationRequest[]> {
    const bundle = await fhirFetch<Bundle>("MedicationRequest", {
        encounter: `Encounter/${encounterId}`,
        category:  `${config.fhir.codeSystems.medicationRequestCategory}|discharge`,
        _count:    "50",
        _sort:     "-authoredon",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as MedicationRequest)
        .filter((r): r is MedicationRequest => r?.resourceType === "MedicationRequest");
}

export function rxStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        active:             "green",
        completed:          "blue",
        cancelled:          "red",
        stopped:            "orange",
        "on-hold":          "amber",
        draft:              "slate",
        "entered-in-error": "rose",
    };
    return map[status] ?? "gray";
}

export function isDischargeRx(m: MedicationRequest): boolean {
    return m.category?.some((c) =>
        c.coding?.some((cd) => cd.system === config.fhir.codeSystems.medicationRequestCategory && cd.code === "discharge")
    ) ?? false;
}

// ─── Inpatient Medication Orders & Administration (MAR) ───────────────────────

export interface InpatientRxInput {
    patientId:    string;
    encounterId:  string;
    drugName:     string;
    dose?:        string;
    route?:       string;
    frequency?:   string;
    prn?:         boolean;
    prnReason?:   string;
    indication?:  string;
    notes?:       string;
}

export interface MedAdminInput {
    patientId:            string;
    encounterId:          string;
    medicationRequestId?: string;
    drugName:             string;
    doseGiven?:           string;
    route?:               string;
    site?:                string;
    effectiveDateTime:    string;
    status:               "completed" | "not-done";
    notDoneReason?:       string;
    notes?:               string;
}

export function isInpatientRx(m: MedicationRequest): boolean {
    return m.category?.some((c) =>
        c.coding?.some((cd) => cd.system === config.fhir.codeSystems.medicationRequestCategory && cd.code === INPT_CAT_CODE)
    ) ?? false;
}

function buildInpatientSig(input: InpatientRxInput): string {
    const parts: string[] = [];
    if (input.dose) parts.push(input.dose);
    if (input.route) parts.push(ROUTE_DISPLAY[input.route] ?? input.route);
    if (input.prn) {
        parts.push("PRN");
        if (input.prnReason) parts.push(`for ${input.prnReason}`);
    } else if (input.frequency) {
        parts.push(FREQ_DISPLAY[input.frequency] ?? input.frequency);
    }
    return parts.join(" ").trim();
}

function buildInpatientRxBody(input: InpatientRxInput, id?: string): MedicationRequest {
    // Only fields not representable in standard dosageInstruction go in the extension.
    // route → dosageInstruction[0].route.text; prnReason → dosageInstruction[0].asNeededCodeableConcept.text
    const extFields = [
        { url: "dose",      valueString: input.dose },
        { url: "frequency", valueString: input.frequency },
    ].filter((e): e is { url: string; valueString: string } => !!e.valueString);

    const sig = buildInpatientSig(input);

    return {
        resourceType: "MedicationRequest",
        ...(id ? { id } : {}),
        status: "active",
        intent: "order",
        category: [{
            coding: [{ system: config.fhir.codeSystems.medicationRequestCategory, code: INPT_CAT_CODE, display: "Inpatient" }],
            text: "Inpatient",
        }],
        medicationCodeableConcept: { text: input.drugName },
        subject:   { reference: `Patient/${input.patientId}` },
        encounter: { reference: `Encounter/${input.encounterId}` },
        authoredOn: new Date().toISOString().split("T")[0],
        dosageInstruction: [{
            ...(sig ? { text: sig } : {}),
            ...(input.route ? { route: { text: input.route } } : {}),
            asNeededBoolean: !!input.prn,
            ...(input.prn && input.prnReason
                ? { asNeededCodeableConcept: { text: input.prnReason } }
                : {}),
        }],
        ...(input.indication ? { reasonCode: [{ text: input.indication }] } : {}),
        ...(input.notes ? { note: [{ text: input.notes }] } : {}),
        ...(extFields.length
            ? { extension: [{ url: EXT_INPT_STRUCTURED, extension: extFields }] }
            : {}),
    };
}

export function parseInpatientRx(m: MedicationRequest): InpatientRxInput {
    const ext    = m.extension?.find((e) => e.url === EXT_INPT_STRUCTURED);
    const getExt = (key: string) => ext?.extension?.find((e) => e.url === key)?.valueString;
    return {
        patientId:   parseFhirId(m.subject?.reference, "Patient")   ?? "",
        encounterId: parseFhirId(m.encounter?.reference, "Encounter") ?? "",
        drugName:    m.medicationCodeableConcept?.text ?? "",
        dose:        getExt("dose"),
        route:       m.dosageInstruction?.[0]?.route?.text,
        frequency:   getExt("frequency"),
        prn:         m.dosageInstruction?.[0]?.asNeededBoolean,
        prnReason:   m.dosageInstruction?.[0]?.asNeededCodeableConcept?.text,
        indication:  m.reasonCode?.[0]?.text,
        notes:       m.note?.[0]?.text,
    };
}

export async function createInpatientRx(input: InpatientRxInput): Promise<MedicationRequest> {
    const body = buildInpatientRxBody(input);
    body.identifier = [{ system: MEDICATION_REQUEST_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/MedicationRequest`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create medication order: ${res.status} ${await res.text()}`);
    return res.json() as Promise<MedicationRequest>;
}

export async function cancelInpatientRx(id: string): Promise<MedicationRequest> {
    const existing = await fhirFetch<MedicationRequest>(`MedicationRequest/${id}`);
    const body: MedicationRequest = { ...existing, status: "cancelled" };
    const res = await fhirRequest(`${getFhirBaseUrl()}/MedicationRequest/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to cancel medication order: ${res.status} ${await res.text()}`);
    return res.json() as Promise<MedicationRequest>;
}

export async function getEncounterInpatientRx(encounterId: string): Promise<MedicationRequest[]> {
    const bundle = await fhirFetch<Bundle>("MedicationRequest", {
        encounter: `Encounter/${encounterId}`,
        category:  `${config.fhir.codeSystems.medicationRequestCategory}|${INPT_CAT_CODE}`,
        _count:    "50",
        _sort:     "-authoredon",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as MedicationRequest)
        .filter((r): r is MedicationRequest => r?.resourceType === "MedicationRequest");
}

export async function recordAdministration(input: MedAdminInput): Promise<MedicationAdministration> {
    const body: MedicationAdministration = {
        resourceType: "MedicationAdministration",
        status: input.status,
        medicationCodeableConcept: { text: input.drugName },
        subject: { reference: `Patient/${input.patientId}` },
        context: { reference: `Encounter/${input.encounterId}` },
        ...(input.medicationRequestId
            ? { request: { reference: `MedicationRequest/${input.medicationRequestId}` } }
            : {}),
        effectiveDateTime: input.effectiveDateTime,
        ...(input.doseGiven || input.route || input.site ? {
            dosage: {
                text: [input.doseGiven, input.route].filter(Boolean).join(" ") || undefined,
                ...(input.route ? { route: { text: input.route } } : {}),
                ...(input.site  ? { site:  { text: input.site  } } : {}),
            },
        } : {}),
        ...(input.status === "not-done" && input.notDoneReason
            ? { statusReason: [{ text: input.notDoneReason }] }
            : {}),
        ...(input.notes ? { note: [{ text: input.notes }] } : {}),
    };
    const res = await fhirRequest(`${getFhirBaseUrl()}/MedicationAdministration`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to record administration: ${res.status} ${await res.text()}`);
    return res.json() as Promise<MedicationAdministration>;
}

export async function getEncounterAdministrations(encounterId: string): Promise<MedicationAdministration[]> {
    const bundle = await fhirFetch<Bundle>("MedicationAdministration", {
        context: `Encounter/${encounterId}`,
        _count:  "100",
        _sort:   "-effective-time",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as MedicationAdministration)
        .filter((r): r is MedicationAdministration => r?.resourceType === "MedicationAdministration");
}

export function adminStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        completed:          "green",
        "not-done":         "red",
        "in-progress":      "blue",
        "on-hold":          "amber",
        stopped:            "orange",
        "entered-in-error": "rose",
    };
    return map[status] ?? "gray";
}
