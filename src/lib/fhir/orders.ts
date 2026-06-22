import type {
    Bundle,
    DiagnosticReport,
    DocumentReference,
    Patient,
    Procedure,
    ServiceRequest,
    Task,
    Condition,
    MedicationRequest,
    Observation,
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
import { searchPatients } from "./patients";
import type { StatusColor } from "@/components/ui/StatusPill";

// ─── Service requests (Lab & Radiology orders) ────────────────────────────────

const SR_CAT_LAB  = "108252007";
const SR_CAT_RAD  = "363679005";
const SR_CAT_PROC = "71388002";
const SERVICE_REQUEST_ID_SYSTEM = config.fhir.identifierSystems.serviceRequest;
const DIAGNOSTIC_REPORT_ID_SYSTEM = config.fhir.identifierSystems.diagnosticReport;
const TASK_ID_SYSTEM = config.fhir.identifierSystems.task;
const DOCUMENT_REF_ID_SYSTEM = config.fhir.identifierSystems.documentRef;
const TASK_CAT_SYSTEM = config.fhir.codeSystems.taskCategory;
const REFERRAL_CAT_SYSTEM = config.fhir.codeSystems.referralCategory;
const REFERRAL_CAT_CODE = "referral";
const REFERRAL_SPECIALTY_SYSTEM = config.fhir.codeSystems.referralSpecialty;

export type OrderCategory = "lab" | "rad" | "procedure";

export interface LabOrderInput {
    patientId:     string;
    encounterId?:  string;
    testDisplay:   string;
    testCode?:     string;
    priority:      "routine" | "urgent" | "asap" | "stat";
    specimenType?: string;
    indication?:   string;
    notes?:        string;
    requesterId?:  string;
}

export interface RadOrderInput {
    patientId:    string;
    encounterId?: string;
    studyDisplay: string;
    studyCode?:   string;
    bodyPart?:    string;
    contrast?:    boolean;
    priority:     "routine" | "urgent" | "asap" | "stat";
    indication?:  string;
    notes?:       string;
    requesterId?: string;
}

export interface OrderSearchParams {
    patientId?:    string;
    patientQuery?: string;
    encounterId?:  string;
    category?:     OrderCategory;
    status?:       string;
    count?:        number;
}

export interface ServiceRequestWithPatient {
    order:    ServiceRequest;
    patient?: Patient;
}

export function getOrderCategory(sr: ServiceRequest): OrderCategory | "unknown" {
    const code = sr.category?.[0]?.coding?.[0]?.code;
    if (code === SR_CAT_LAB)  return "lab";
    if (code === SR_CAT_RAD)  return "rad";
    if (code === SR_CAT_PROC) return "procedure";
    return "unknown";
}

export function isProcedureOrder(sr: ServiceRequest): boolean {
    return sr.category?.[0]?.coding?.[0]?.code === SR_CAT_PROC;
}

export function orderStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        active:             "blue",
        completed:          "green",
        revoked:            "red",
        "on-hold":          "amber",
        draft:              "slate",
        "entered-in-error": "rose",
        unknown:            "gray",
    };
    return map[status] ?? "gray";
}

export function orderPriorityColor(priority: string): StatusColor {
    const map: Record<string, StatusColor> = {
        routine: "slate",
        urgent:  "amber",
        asap:    "orange",
        stat:    "red",
    };
    return map[priority] ?? "gray";
}

function isReferralResource(sr: ServiceRequest): boolean {
    return sr.category?.some(
        (c) => c.coding?.some(
            (cc) => cc.system === REFERRAL_CAT_SYSTEM && cc.code === REFERRAL_CAT_CODE
        )
    ) ?? false;
}

function buildServiceRequest(p: {
    patientId:    string;
    encounterId?: string;
    catCode:      string;
    catDisplay:   string;
    codeText:     string;
    codeCode?:    string;
    codeSystem?:  string;
    priority:     "routine" | "urgent" | "asap" | "stat";
    indication?:  string;
    notes?:       string;
    orderDetail?: string[];
    requesterId?: string;
}): ServiceRequest {
    return {
        resourceType: "ServiceRequest",
        status: "active",
        intent: "order",
        category: [{
            coding: [{ system: config.fhir.codeSystems.snomedCt, code: p.catCode, display: p.catDisplay }],
            text: p.catDisplay,
        }],
        code: {
            ...(p.codeCode ? {
                coding: [{ system: p.codeSystem ?? config.fhir.codeSystems.loinc, code: p.codeCode, display: p.codeText }],
            } : {}),
            text: p.codeText,
        },
        subject: { reference: `Patient/${p.patientId}` },
        ...(p.encounterId ? { encounter: { reference: `Encounter/${p.encounterId}` } } : {}),
        authoredOn: new Date().toISOString().split("T")[0],
        priority: p.priority,
        ...(p.requesterId ? { requester: { reference: `Practitioner/${p.requesterId}` } } : {}),
        ...(p.indication ? { reasonCode: [{ text: p.indication }] } : {}),
        ...(p.orderDetail?.length ? { orderDetail: p.orderDetail.map((t) => ({ text: t })) } : {}),
        ...(p.notes?.trim() ? { note: [{ text: p.notes.trim() }] } : {}),
    };
}

export async function createLabOrder(input: LabOrderInput): Promise<ServiceRequest> {
    const detail: string[] = [];
    if (input.specimenType) detail.push(`Specimen: ${input.specimenType}`);
    const body = buildServiceRequest({
        patientId:   input.patientId,
        encounterId: input.encounterId,
        catCode:     SR_CAT_LAB,
        catDisplay:  "Laboratory procedure",
        codeText:    input.testDisplay,
        codeCode:    input.testCode,
        priority:    input.priority,
        indication:  input.indication,
        notes:       input.notes,
        orderDetail: detail,
        requesterId: input.requesterId,
    });
    body.identifier = [{ system: SERVICE_REQUEST_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/ServiceRequest`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create lab order: ${res.status} ${await res.text()}`);
    return res.json() as Promise<ServiceRequest>;
}

export async function createRadOrder(input: RadOrderInput): Promise<ServiceRequest> {
    const detail: string[] = [];
    if (input.bodyPart) detail.push(`Region: ${input.bodyPart}`);
    if (input.contrast !== undefined) detail.push(input.contrast ? "Contrast: required" : "Contrast: not required");
    const body = buildServiceRequest({
        patientId:   input.patientId,
        encounterId: input.encounterId,
        catCode:     SR_CAT_RAD,
        catDisplay:  "Imaging",
        codeText:    input.studyDisplay,
        codeCode:    input.studyCode,
        codeSystem:  config.fhir.codeSystems.snomedCt,
        priority:    input.priority,
        indication:  input.indication,
        notes:       input.notes,
        orderDetail: detail,
        requesterId: input.requesterId,
    });
    body.identifier = [{ system: SERVICE_REQUEST_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/ServiceRequest`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create radiology order: ${res.status} ${await res.text()}`);
    return res.json() as Promise<ServiceRequest>;
}

export async function getServiceRequest(id: string): Promise<ServiceRequest> {
    return fhirFetch<ServiceRequest>(`ServiceRequest/${id}`);
}

export async function getPatientOrders(patientId: string): Promise<ServiceRequest[]> {
    const bundle = await fhirFetch<Bundle>("ServiceRequest", {
        subject: `Patient/${patientId}`,
        _count:  "100",
        _sort:   "-authored",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as ServiceRequest)
        .filter((r): r is ServiceRequest => r?.resourceType === "ServiceRequest" && !isReferralResource(r));
}

export async function getEncounterOrders(encounterId: string): Promise<ServiceRequest[]> {
    const bundle = await fhirFetch<Bundle>("ServiceRequest", {
        encounter: `Encounter/${encounterId}`,
        _count:    "100",
        _sort:     "-authored",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as ServiceRequest)
        .filter((r): r is ServiceRequest => r?.resourceType === "ServiceRequest");
}

export async function cancelOrder(id: string): Promise<ServiceRequest> {
    const existing = await getServiceRequest(id);
    const body: ServiceRequest = { ...existing, status: "revoked" };
    const res = await fhirRequest(`${getFhirBaseUrl()}/ServiceRequest/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to cancel order: ${res.status} ${await res.text()}`);
    return res.json() as Promise<ServiceRequest>;
}

export async function searchOrders(params: OrderSearchParams = {}): Promise<ServiceRequestWithPatient[]> {
    const { patientId, patientQuery, encounterId, category, status, count = 50 } = params;

    const fhirParams: Record<string, string> = {
        _sort:    "-authored",
        _count:   String(count),
        _include: "ServiceRequest:subject",
    };
    if (patientId)   fhirParams.subject   = `Patient/${patientId}`;
    if (encounterId) fhirParams.encounter = `Encounter/${encounterId}`;
    if (status)      fhirParams.status    = status;
    if (category)    fhirParams.category  = `${config.fhir.codeSystems.snomedCt}|${category === "lab" ? SR_CAT_LAB : category === "rad" ? SR_CAT_RAD : SR_CAT_PROC}`;

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.subject = knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("ServiceRequest", fhirParams);
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const orders: ServiceRequest[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "ServiceRequest" && !isReferralResource(r as ServiceRequest)) orders.push(r as ServiceRequest);
        }
        return orders.map((order) => {
            const ref = order.subject?.reference;
            const pid = parseFhirId(ref, "Patient");
            return { order, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

// ─── Procedure Orders & Records ───────────────────────────────────────────────

export interface ProcedureOrderInput {
    patientId:    string;
    encounterId:  string;
    procedureName: string;
    bodySite?:    string;
    priority:     "routine" | "urgent" | "asap" | "stat";
    indication?:  string;
    notes?:       string;
}

export interface ProcedureRecordInput {
    patientId:      string;
    encounterId:    string;
    procedureName:  string;
    status:         "completed" | "in-progress" | "not-done" | "stopped" | "on-hold";
    performedStart: string;
    performedEnd?:  string;
    bodySite?:      string;
    performer?:     string;
    outcome?:       string;
    complication?:  string;
    statusReason?:  string;
    notes?:         string;
    basedOnOrderId?: string;
}

export async function createProcedureOrder(input: ProcedureOrderInput): Promise<ServiceRequest> {
    const detail: string[] = [];
    if (input.bodySite) detail.push(`Site: ${input.bodySite}`);
    const body = buildServiceRequest({
        patientId:   input.patientId,
        encounterId: input.encounterId,
        catCode:     SR_CAT_PROC,
        catDisplay:  "Procedure",
        codeText:    input.procedureName,
        priority:    input.priority,
        indication:  input.indication,
        notes:       input.notes,
        orderDetail: detail,
    });
    body.identifier = [{ system: SERVICE_REQUEST_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/ServiceRequest`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create procedure order: ${res.status} ${await res.text()}`);
    return res.json() as Promise<ServiceRequest>;
}

export async function getEncounterProcedureOrders(encounterId: string): Promise<ServiceRequest[]> {
    const bundle = await fhirFetch<Bundle>("ServiceRequest", {
        encounter: `Encounter/${encounterId}`,
        category:  `${config.fhir.codeSystems.snomedCt}|${SR_CAT_PROC}`,
        _count:    "50",
        _sort:     "-authored",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as ServiceRequest)
        .filter((r): r is ServiceRequest => r?.resourceType === "ServiceRequest");
}

function buildProcedureBody(input: ProcedureRecordInput, id?: string): Procedure {
    const hasEnd = !!input.performedEnd?.trim();
    return {
        resourceType: "Procedure",
        ...(id ? { id } : {}),
        status: input.status,
        code:   { text: input.procedureName },
        subject:   { reference: `Patient/${input.patientId}` },
        encounter: { reference: `Encounter/${input.encounterId}` },
        ...(input.basedOnOrderId
            ? { basedOn: [{ reference: `ServiceRequest/${input.basedOnOrderId}` }] }
            : {}),
        ...(hasEnd
            ? { performedPeriod: { start: input.performedStart, end: input.performedEnd! } }
            : { performedDateTime: input.performedStart }),
        ...(input.performer ? { performer: [{ actor: { display: input.performer } }] } : {}),
        ...(input.bodySite  ? { bodySite: [{ text: input.bodySite }] } : {}),
        ...(input.outcome   ? { outcome:  { text: input.outcome   } } : {}),
        ...(input.complication ? { complication: [{ text: input.complication }] } : {}),
        ...(input.statusReason ? { statusReason: { text: input.statusReason } } : {}),
        ...(input.notes     ? { note: [{ text: input.notes }] } : {}),
    };
}

export function parseProcedureRecord(p: Procedure): ProcedureRecordInput {
    return {
        patientId:      parseFhirId(p.subject?.reference, "Patient")   ?? "",
        encounterId:    parseFhirId(p.encounter?.reference, "Encounter") ?? "",
        procedureName:  p.code?.text ?? p.code?.coding?.[0]?.display ?? "",
        status:         (p.status as ProcedureRecordInput["status"]) ?? "completed",
        performedStart: p.performedDateTime ?? p.performedPeriod?.start ?? "",
        performedEnd:   p.performedPeriod?.end,
        bodySite:       p.bodySite?.[0]?.text,
        performer:      p.performer?.[0]?.actor?.display,
        outcome:        p.outcome?.text,
        complication:   p.complication?.[0]?.text,
        statusReason:   (p as { statusReason?: { text?: string } }).statusReason?.text,
        notes:          p.note?.[0]?.text,
        basedOnOrderId: parseFhirId(p.basedOn?.[0]?.reference, "ServiceRequest"),
    };
}

export async function recordProcedure(input: ProcedureRecordInput): Promise<Procedure> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Procedure`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(buildProcedureBody(input)),
    });
    if (!res.ok) throw new Error(`Failed to record procedure: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Procedure>;
}

export async function updateProcedureRecord(id: string, input: ProcedureRecordInput): Promise<Procedure> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Procedure/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(buildProcedureBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update procedure: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Procedure>;
}

export async function getEncounterProcedures(encounterId: string): Promise<Procedure[]> {
    const bundle = await fhirFetch<Bundle>("Procedure", {
        encounter: `Encounter/${encounterId}`,
        _count:    "50",
        _sort:     "-date",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as Procedure)
        .filter((r): r is Procedure => r?.resourceType === "Procedure");
}

export function procedureStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        completed:          "green",
        "in-progress":      "blue",
        "not-done":         "red",
        "on-hold":          "amber",
        stopped:            "orange",
        preparation:        "slate",
        "entered-in-error": "rose",
        unknown:            "gray",
    };
    return map[status] ?? "gray";
}

// ─── Cross-patient search helpers ──────────────────────────────────────────────

export interface ObservationWithPatient {
    observation: Observation;
    patient?: Patient;
}

export interface MedicationRequestWithPatient {
    medication: MedicationRequest;
    patient?: Patient;
}

export interface ConditionWithPatient {
    condition: Condition;
    patient?: Patient;
}

export function getObservationName(obs: Observation): string {
    return obs.code?.coding?.[0]?.display ?? obs.code?.text ?? "Observation";
}

export function formatObservationValue(obs: Observation): string {
    if (obs.valueQuantity) {
        const { value, unit } = obs.valueQuantity;
        return `${value ?? "—"} ${unit ?? ""}`.trim();
    }
    if (obs.valueCodeableConcept) {
        return obs.valueCodeableConcept.text ?? obs.valueCodeableConcept.coding?.[0]?.display ?? "—";
    }
    if (typeof obs.valueString === "string") return obs.valueString;
    if (typeof obs.valueBoolean === "boolean") return obs.valueBoolean ? "Yes" : "No";
    if (obs.component?.length) {
        const vals = obs.component.map((c) => c.valueQuantity?.value ?? "?").join("/");
        const unit = obs.component[0]?.valueQuantity?.unit ?? "";
        return unit ? `${vals} ${unit}` : vals;
    }
    return "—";
}

export async function searchObservations(params: {
    patientQuery?: string;
    patientId?: string;
    category?: string;
    count?: number;
}): Promise<ObservationWithPatient[]> {
    const { patientQuery, patientId, category, count = 50 } = params;

    const fhirParams: Record<string, string> = {
        _sort:    "-date",
        _count:   String(count),
        _include: "Observation:patient",
    };
    if (category)  fhirParams.category = category;
    if (patientId) fhirParams.patient  = `Patient/${patientId}`;

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.patient = knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("Observation", fhirParams);
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const observations: Observation[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "Observation") observations.push(r as Observation);
        }
        return observations.map((obs) => {
            const ref = obs.subject?.reference;
            const pid = parseFhirId(ref, "Patient");
            return { observation: obs, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

export async function searchMedications(params: {
    patientQuery?: string;
    patientId?: string;
    status?: string;
    rxCategory?: string;
    count?: number;
}): Promise<MedicationRequestWithPatient[]> {
    const { patientQuery, patientId, status, rxCategory, count = 50 } = params;

    const fhirParams: Record<string, string> = {
        _sort:    "-authoredon",
        _count:   String(count),
        _include: "MedicationRequest:patient",
    };
    if (status)     fhirParams.status   = status;
    if (rxCategory) fhirParams.category = `${config.fhir.codeSystems.medicationRequestCategory}|${rxCategory}`;
    if (patientId)  fhirParams.patient  = `Patient/${patientId}`;

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.patient = knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("MedicationRequest", fhirParams);
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const meds: MedicationRequest[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "MedicationRequest") meds.push(r as MedicationRequest);
        }
        return meds.map((med) => {
            const ref = med.subject?.reference;
            const pid = parseFhirId(ref, "Patient");
            return { medication: med, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

export async function searchConditionsWithPatients(params: {
    patientQuery?: string;
    clinicalStatus?: string;
    count?: number;
}): Promise<ConditionWithPatient[]> {
    const { patientQuery, clinicalStatus, count = 50 } = params;

    const fhirParams: Record<string, string> = {
        _sort:    "-recorded-date",
        _count:   String(count),
        _include: "Condition:patient",
    };
    if (clinicalStatus) fhirParams["clinical-status"] = clinicalStatus;

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.patient = knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("Condition", fhirParams);
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const conditions: Condition[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "Condition") conditions.push(r as Condition);
        }
        return conditions.map((cond) => {
            const ref = cond.subject?.reference;
            const pid = parseFhirId(ref, "Patient");
            return { condition: cond, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

// ─── DiagnosticReport ─────────────────────────────────────────────────────────

export const REPORT_CATEGORY_DISPLAY: Record<string, string> = {
    LAB: "Laboratory",
    RAD: "Radiology",
    PAT: "Pathology",
    MB:  "Microbiology",
    SP:  "Surgical Pathology",
    CP:  "Cytopathology",
    CH:  "Chemistry",
    HM:  "Hematology",
    REF: "Referral",
    GEN: "Genetics",
};

export const REPORT_STATUS_DISPLAY: Record<string, string> = {
    registered:          "Registered",
    partial:             "Partial",
    preliminary:         "Preliminary",
    final:               "Final",
    amended:             "Amended",
    corrected:           "Corrected",
    appended:            "Appended",
    cancelled:           "Cancelled",
    "entered-in-error":  "Error",
    unknown:             "Unknown",
};

export interface DiagnosticReportInput {
    patientId:    string;
    encounterId?: string;
    code:         string;
    category?:    string;
    status:       "registered" | "partial" | "preliminary" | "final" | "amended" | "corrected" | "appended" | "cancelled";
    effectiveDate?: string;
    conclusion?:  string;
    performer?:   string;
    presentedForm?: Array<{ contentType: string; data: string; title?: string }>;
}

export interface DiagnosticReportWithPatient {
    report:   DiagnosticReport;
    patient?: Patient;
}

function buildDiagnosticReportBody(input: DiagnosticReportInput, id?: string): DiagnosticReport {
    return {
        resourceType: "DiagnosticReport",
        ...(id ? { id } : {}),
        status: input.status,
        ...(input.category ? {
            category: [{
                coding: [{ system: config.fhir.codeSystems.diagnosticReportCategory, code: input.category, display: REPORT_CATEGORY_DISPLAY[input.category] ?? input.category }],
                text: REPORT_CATEGORY_DISPLAY[input.category] ?? input.category,
            }],
        } : {}),
        code: { text: input.code },
        subject:   { reference: `Patient/${input.patientId}` },
        ...(input.encounterId ? { encounter: { reference: `Encounter/${input.encounterId}` } } : {}),
        ...(input.effectiveDate ? { effectiveDateTime: input.effectiveDate } : {}),
        issued: new Date().toISOString(),
        ...(input.performer ? { performer: [{ display: input.performer }] } : {}),
        ...(input.conclusion ? { conclusion: input.conclusion } : {}),
        ...(input.presentedForm?.length ? { presentedForm: input.presentedForm } : {}),
    };
}

export async function getPatientDiagnosticReports(patientId: string): Promise<DiagnosticReport[]> {
    const bundle = await fhirFetch<Bundle>("DiagnosticReport", {
        patient: `Patient/${patientId}`,
        _sort:   "-issued",
        _count:  "100",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is DiagnosticReport => r?.resourceType === "DiagnosticReport");
}

export async function getEncounterDiagnosticReports(encounterId: string): Promise<DiagnosticReport[]> {
    const bundle = await fhirFetch<Bundle>("DiagnosticReport", {
        encounter: `Encounter/${encounterId}`,
        _sort:     "-issued",
        _count:    "100",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is DiagnosticReport => r?.resourceType === "DiagnosticReport");
}

export async function createDiagnosticReport(input: DiagnosticReportInput): Promise<DiagnosticReport> {
    const body = buildDiagnosticReportBody(input);
    body.identifier = [{ system: DIAGNOSTIC_REPORT_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/DiagnosticReport`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create DiagnosticReport: ${res.status} ${await res.text()}`);
    return res.json() as Promise<DiagnosticReport>;
}

export async function updateDiagnosticReport(id: string, input: DiagnosticReportInput): Promise<DiagnosticReport> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/DiagnosticReport/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(buildDiagnosticReportBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update DiagnosticReport: ${res.status} ${await res.text()}`);
    return res.json() as Promise<DiagnosticReport>;
}

export async function searchDiagnosticReports(params: {
    patientQuery?: string;
    patientId?:    string;
    category?:     string;
    status?:       string;
    count?:        number;
}): Promise<DiagnosticReportWithPatient[]> {
    const { patientQuery, patientId, category, status, count = 60 } = params;

    const fhirParams: Record<string, string> = {
        _sort:    "-issued",
        _count:   String(count),
        _include: "DiagnosticReport:subject",
    };
    if (status)   fhirParams.status   = status;
    if (category) fhirParams.category = category;
    if (patientId) fhirParams.patient = `Patient/${patientId}`;

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.patient = knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("DiagnosticReport", fhirParams);
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const reports: DiagnosticReport[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "DiagnosticReport") reports.push(r as DiagnosticReport);
        }
        return reports.map((report) => {
            const ref = report.subject?.reference;
            const pid = parseFhirId(ref, "Patient");
            return { report, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

export function diagnosticReportStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        registered:         "gray",
        partial:            "yellow",
        preliminary:        "blue",
        final:              "green",
        amended:            "orange",
        corrected:          "teal",
        appended:           "purple",
        cancelled:          "red",
        "entered-in-error": "rose",
    };
    return map[status] ?? "gray";
}

export function diagnosticReportCategoryColor(category: string): StatusColor {
    const map: Record<string, StatusColor> = {
        LAB: "blue",
        RAD: "purple",
        PAT: "amber",
        MB:  "teal",
        SP:  "rose",
        CP:  "orange",
        CH:  "sky",
        HM:  "red",
    };
    return map[category] ?? "slate";
}

// ─── Tasks / Worklist ─────────────────────────────────────────────────────────

export const TASK_CATEGORY_DISPLAY: Record<string, string> = {
    "result-review":             "Result Review",
    "medication-reconciliation": "Med. Reconciliation",
    "follow-up":                 "Follow-up",
    "referral-review":           "Referral Review",
    "consent-collection":        "Consent Collection",
    "general":                   "General",
};

export const TASK_STATUS_DISPLAY: Record<string, string> = {
    "requested":   "Open",
    "in-progress": "In Progress",
    "on-hold":     "On Hold",
    "completed":   "Completed",
    "cancelled":   "Cancelled",
};

export const TASK_PRIORITY_DISPLAY: Record<string, string> = {
    "routine": "Routine",
    "urgent":  "Urgent",
    "asap":    "ASAP",
    "stat":    "STAT",
};

export interface TaskFormInput {
    patientId?:   string;
    patientName?: string;
    encounterId?: string;
    category:  string;
    title:     string;
    note?:     string;
    priority:  "routine" | "urgent" | "asap" | "stat";
    status:    "requested" | "in-progress" | "on-hold" | "completed" | "cancelled";
    dueDate?:  string;
    assignee?: string;
}

function buildTaskBody(input: TaskFormInput, id?: string): Task {
    return {
        resourceType: "Task",
        ...(id ? { id } : {}),
        status:       input.status,
        intent:       "order",
        priority:     input.priority,
        code: {
            coding: [{ system: TASK_CAT_SYSTEM, code: input.category }],
            text:   TASK_CATEGORY_DISPLAY[input.category] ?? input.category,
        },
        description: input.title,
        ...(input.patientId ? {
            for: { reference: `Patient/${input.patientId}`, display: input.patientName },
        } : {}),
        ...(input.encounterId ? { encounter: { reference: `Encounter/${input.encounterId}` } } : {}),
        authoredOn:   new Date().toISOString(),
        lastModified: new Date().toISOString(),
        ...(input.assignee?.trim() ? { owner: { display: input.assignee.trim() } } : {}),
        ...(input.dueDate ? { restriction: { period: { end: input.dueDate } } } : {}),
        ...(input.note?.trim() ? { note: [{ text: input.note.trim() }] } : {}),
    };
}

export function parseTask(t: Task): TaskFormInput {
    return {
        patientId:   parseFhirId((t.for as { reference?: string })?.reference, "Patient"),
        patientName: (t.for as { display?: string })?.display,
        encounterId: parseFhirId(t.encounter?.reference, "Encounter"),
        category:    t.code?.coding?.[0]?.code ?? "general",
        title:       t.description ?? "",
        note:        t.note?.[0]?.text,
        priority:    (t.priority as TaskFormInput["priority"]) ?? "routine",
        status:      (t.status as TaskFormInput["status"]) ?? "requested",
        dueDate:     (t.restriction as { period?: { end?: string } } | undefined)?.period?.end?.slice(0, 10),
        assignee:    (t.owner as { display?: string } | undefined)?.display,
    };
}

export function taskStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        requested:    "blue",
        "in-progress":"amber",
        "on-hold":    "gray",
        completed:    "green",
        cancelled:    "red",
    };
    return map[status] ?? "gray";
}

export function taskPriorityColor(priority: string): StatusColor {
    const map: Record<string, StatusColor> = {
        routine: "gray",
        urgent:  "orange",
        asap:    "red",
        stat:    "rose",
    };
    return map[priority] ?? "gray";
}

export async function getPatientTasks(patientId: string): Promise<Task[]> {
    const bundle = await fhirFetch<Bundle>("Task", {
        patient: patientId,
        _count:  "100",
        _sort:   "-_lastUpdated",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as Task)
        .filter((r): r is Task => r?.resourceType === "Task");
}

export async function searchTasks(params: Record<string, string> = {}): Promise<Task[]> {
    const bundle = await fhirFetch<Bundle>("Task", {
        _count: "200",
        _sort:  "-_lastUpdated",
        ...params,
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as Task)
        .filter((r): r is Task => r?.resourceType === "Task");
}

export async function createTask(input: TaskFormInput): Promise<Task> {
    const body = buildTaskBody(input);
    body.identifier = [{ system: TASK_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/Task`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create task: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Task>;
}

export async function updateTask(id: string, input: TaskFormInput): Promise<Task> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Task/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(buildTaskBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update task: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Task>;
}

// ─── Document Management ──────────────────────────────────────────────────────

export const DOC_TYPE_DISPLAY: Record<string, string> = {
    "discharge-summary":  "Discharge Summary",
    "referral":           "Referral / Letter",
    "lab-report":         "Lab Report",
    "radiology-report":   "Radiology Report",
    "consent":            "Consent Form",
    "insurance":          "Insurance / Authorization",
    "external-record":    "External Record",
    "photo":              "Photo / Image",
    "other":              "Other",
};

export const DOC_TYPE_SYSTEM = config.fhir.codeSystems.documentType;

export interface DocumentInput {
    patientId:    string;
    title:        string;
    docType:      string;
    date:         string;
    author?:      string;
    description?: string;
    contentType:  string;
    dataBase64:   string;
    fileName:     string;
    fileSize:     number;
}

export function buildDocumentBody(input: DocumentInput, id?: string): DocumentReference {
    return {
        resourceType: "DocumentReference",
        ...(id ? { id } : {}),
        status: "current",
        type: {
            coding: [{ system: DOC_TYPE_SYSTEM, code: input.docType }],
            text: DOC_TYPE_DISPLAY[input.docType] ?? input.docType,
        },
        subject: { reference: `Patient/${input.patientId}` },
        date: new Date(input.date).toISOString(),
        ...(input.author?.trim() ? { author: [{ display: input.author.trim() }] } : {}),
        description: input.title,
        content: [{
            attachment: {
                contentType: input.contentType,
                data: input.dataBase64,
                title: input.fileName,
                size: input.fileSize,
                creation: new Date(input.date).toISOString(),
            },
        }],
        ...(input.description?.trim() ? {
            context: { related: [{ display: input.description.trim() }] },
        } : {}),
    };
}

export function getDocumentTitle(d: DocumentReference): string {
    return d.description ?? d.content?.[0]?.attachment?.title ?? "Untitled";
}

export function getDocumentType(d: DocumentReference): string {
    return d.type?.coding?.[0]?.code ?? "other";
}

export function getDocumentAuthor(d: DocumentReference): string {
    return (d.author?.[0] as { display?: string } | undefined)?.display ?? "";
}

export function getDocumentDescription(d: DocumentReference): string {
    return (d.context?.related?.[0] as { display?: string } | undefined)?.display ?? "";
}

export async function getPatientDocuments(patientId: string): Promise<DocumentReference[]> {
    const bundle = await fhirFetch<Bundle>("DocumentReference", {
        patient: patientId,
        _count: "100",
        _sort: "-date",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as DocumentReference)
        .filter((r): r is DocumentReference => r?.resourceType === "DocumentReference");
}

export async function createDocument(input: DocumentInput): Promise<DocumentReference> {
    const body = buildDocumentBody(input);
    body.identifier = [{ system: DOCUMENT_REF_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/DocumentReference`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to upload document: ${res.status} ${await res.text()}`);
    return res.json() as Promise<DocumentReference>;
}

export async function updateDocument(id: string, input: DocumentInput): Promise<DocumentReference> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/DocumentReference/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildDocumentBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update document: ${res.status} ${await res.text()}`);
    return res.json() as Promise<DocumentReference>;
}

export async function deleteDocument(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/DocumentReference/${id}`, {
        method: "DELETE",
        headers: await authHeaders({}),
    });
    if (!res.ok) throw new Error(`Failed to delete document: ${res.status} ${await res.text()}`);
}

// ─── Referrals ────────────────────────────────────────────────────────────────
// Referrals are ServiceRequest resources with a dedicated category code that
// distinguishes them from lab/rad/procedure orders.

export const REFERRAL_SPECIALTIES = [
    "Cardiology",
    "Dermatology",
    "Endocrinology",
    "Gastroenterology",
    "General Surgery",
    "Hematology",
    "Nephrology",
    "Neurology",
    "Oncology",
    "Ophthalmology",
    "Orthopedics",
    "Psychiatry",
    "Pulmonology",
    "Rheumatology",
    "Urology",
    "Vascular Surgery",
    "Other",
] as const;

export interface ReferralInput {
    patientId:    string;
    encounterId?: string;
    specialty:    string;
    priority:     "routine" | "urgent" | "asap" | "stat";
    reason?:      string;
    notes?:       string;
}

export interface ReferralWithPatient {
    referral: ServiceRequest;
    patient?: Patient;
}

export function referralStatusColor(status?: string): StatusColor {
    const map: Record<string, StatusColor> = {
        active:            "green",
        completed:         "slate",
        draft:             "blue",
        "on-hold":         "amber",
        revoked:           "red",
        "entered-in-error":"rose",
    };
    return map[status ?? ""] ?? "muted";
}

export function referralPriorityColor(priority?: string): StatusColor {
    const map: Record<string, StatusColor> = {
        stat:   "red",
        asap:   "orange",
        urgent: "amber",
    };
    return map[priority ?? ""] ?? "slate";
}

function buildReferralBody(input: ReferralInput, id?: string): ServiceRequest {
    return {
        resourceType: "ServiceRequest",
        ...(id ? { id } : {}),
        status:   "active",
        intent:   "order",
        priority: input.priority,
        category: [{
            coding: [{ system: REFERRAL_CAT_SYSTEM, code: REFERRAL_CAT_CODE, display: "Referral" }],
            text:   "Referral",
        }],
        subject: { reference: `Patient/${input.patientId}` },
        ...(input.encounterId ? { encounter: { reference: `Encounter/${input.encounterId}` } } : {}),
        code: {
            text:   input.specialty,
            coding: [{ system: REFERRAL_SPECIALTY_SYSTEM, display: input.specialty }],
        },
        ...(input.reason?.trim() ? { reasonCode: [{ text: input.reason.trim() }] } : {}),
        authoredOn: new Date().toISOString(),
        ...(input.notes?.trim() ? { note: [{ text: input.notes.trim() }] } : {}),
    };
}

export async function createReferral(input: ReferralInput): Promise<ServiceRequest> {
    const body = buildReferralBody(input);
    body.identifier = [{ system: SERVICE_REQUEST_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/ServiceRequest`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create referral: ${res.status} ${await res.text()}`);
    return res.json() as Promise<ServiceRequest>;
}

export async function updateReferralStatus(id: string, status: string): Promise<ServiceRequest> {
    const current = await getServiceRequest(id);
    const updated: ServiceRequest = { ...current, status: status as ServiceRequest["status"] };
    const res = await fhirRequest(`${getFhirBaseUrl()}/ServiceRequest/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(updated),
    });
    if (!res.ok) throw new Error(`Failed to update referral: ${res.status} ${await res.text()}`);
    return res.json() as Promise<ServiceRequest>;
}

export async function getPatientReferrals(patientId: string): Promise<ServiceRequest[]> {
    const bundle = await fhirFetch<Bundle>("ServiceRequest", {
        patient:  patientId,
        category: `${REFERRAL_CAT_SYSTEM}|${REFERRAL_CAT_CODE}`,
        _count:   "50",
        _sort:    "-authored",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as ServiceRequest)
        .filter((r): r is ServiceRequest => r?.resourceType === "ServiceRequest");
}

export async function updateReferral(id: string, input: ReferralInput): Promise<ServiceRequest> {
    const current = await getServiceRequest(id);
    const body    = buildReferralBody(input, id);
    // preserve existing status — only fields from ReferralInput change
    const merged: ServiceRequest = { ...body, status: current.status };
    const res = await fhirRequest(`${getFhirBaseUrl()}/ServiceRequest/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(merged),
    });
    if (!res.ok) throw new Error(`Failed to update referral: ${res.status} ${await res.text()}`);
    return res.json() as Promise<ServiceRequest>;
}

export async function getEncounterReferrals(encounterId: string): Promise<ServiceRequest[]> {
    const bundle = await fhirFetch<Bundle>("ServiceRequest", {
        encounter: `Encounter/${encounterId}`,
        category:  `${REFERRAL_CAT_SYSTEM}|${REFERRAL_CAT_CODE}`,
        _count:    "50",
        _sort:     "-authored",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as ServiceRequest)
        .filter((r): r is ServiceRequest => r?.resourceType === "ServiceRequest");
}

export async function searchReferrals(params: {
    status?:       string;
    priority?:     string;
    patientQuery?: string;
    count?:        number;
} = {}): Promise<ReferralWithPatient[]> {
    const { status, priority, patientQuery, count = 60 } = params;

    const fhirParams: Record<string, string> = {
        category: `${REFERRAL_CAT_SYSTEM}|${REFERRAL_CAT_CODE}`,
        _sort:    "-authored",
        _count:   String(count),
        _include: "ServiceRequest:subject",
    };
    if (status)   fhirParams.status   = status;
    if (priority) fhirParams.priority = priority;

    if (patientQuery?.trim()) {
        const knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.subject = knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("ServiceRequest", fhirParams);
        const patientMap = new Map<string, Patient>();
        const referrals: ServiceRequest[] = [];

        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "ServiceRequest") referrals.push(r as ServiceRequest);
        }

        return referrals.map((ref) => {
            const subjectRef = ref.subject?.reference;
            const pid = parseFhirId(subjectRef, "Patient");
            return { referral: ref, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}
