import type {
    AllergyIntolerance,
    Bundle,
    Condition,
    Consent,
    FamilyMemberHistory,
    Flag,
    Immunization,
    Patient,
    QuestionnaireResponse,
    RelatedPerson,
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

const ALLERGY_ID_SYSTEM = config.fhir.identifierSystems.allergy;
const CONDITION_ID_SYSTEM = config.fhir.identifierSystems.condition;
const FLAG_ID_SYSTEM = config.fhir.identifierSystems.flag;
const FAMILY_HISTORY_ID_SYSTEM = config.fhir.identifierSystems.familyHistory;
const RELATED_PERSON_ID_SYSTEM = config.fhir.identifierSystems.relatedPerson;
const CONSENT_ID_SYSTEM = config.fhir.identifierSystems.consent;
const EXT_DIRECTIVE_NOTES = config.fhir.extensions.directiveNotes;

// ─── Condition color helpers ──────────────────────────────────────────────────

export function conditionClinicalStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        active:      "red",
        recurrence:  "orange",
        relapse:     "orange",
        inactive:    "slate",
        remission:   "blue",
        resolved:    "green",
    };
    return map[status] ?? "gray";
}

export function conditionVerificationStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        confirmed:          "green",
        unconfirmed:        "yellow",
        provisional:        "yellow",
        differential:       "purple",
        refuted:            "red",
        "entered-in-error": "gray",
    };
    return map[status] ?? "gray";
}

export function conditionSeverityColor(severity: string): StatusColor {
    const map: Record<string, StatusColor> = {
        mild:     "yellow",
        moderate: "orange",
        severe:   "red",
    };
    return map[severity] ?? "gray";
}

export function conditionCategoryColor(category: string): StatusColor {
    const map: Record<string, StatusColor> = {
        "encounter-diagnosis": "blue",
        "problem-list-item":   "purple",
    };
    return map[category] ?? "gray";
}

// ─── Allergies ────────────────────────────────────────────────────────────────

export interface AllergyIntoleranceInput {
    patientId: string;
    code: string;
    type?: "allergy" | "intolerance";
    category?: "food" | "medication" | "environment" | "biologic";
    criticality?: "low" | "high" | "unable-to-assess";
    clinicalStatus: "active" | "inactive" | "resolved";
    verificationStatus: "unconfirmed" | "confirmed" | "refuted";
    onsetDate?: string;
    reactionManifestation?: string;
    reactionSeverity?: "mild" | "moderate" | "severe";
    note?: string;
}

function buildAllergyBody(input: AllergyIntoleranceInput, id?: string): AllergyIntolerance {
    return {
        resourceType: "AllergyIntolerance",
        ...(id ? { id } : {}),
        clinicalStatus: {
            coding: [{
                system: config.fhir.codeSystems.allergyClinical,
                code: input.clinicalStatus,
            }],
        },
        verificationStatus: {
            coding: [{
                system: config.fhir.codeSystems.allergyVerification,
                code: input.verificationStatus,
            }],
        },
        ...(input.type ? { type: input.type } : {}),
        ...(input.category ? { category: [input.category] } : {}),
        ...(input.criticality ? { criticality: input.criticality } : {}),
        code: { text: input.code },
        patient: { reference: `Patient/${input.patientId}` },
        recordedDate: new Date().toISOString().split("T")[0],
        ...(input.onsetDate ? { onsetDateTime: input.onsetDate } : {}),
        ...(input.note ? { note: [{ text: input.note }] } : {}),
        ...(input.reactionManifestation ? {
            reaction: [{
                manifestation: [{ text: input.reactionManifestation }],
                ...(input.reactionSeverity ? { severity: input.reactionSeverity } : {}),
            }],
        } : {}),
    };
}

export function parseAllergyIntolerance(a: AllergyIntolerance): AllergyIntoleranceInput {
    return {
        patientId: parseFhirId(a.patient?.reference, "Patient") ?? "",
        code: a.code?.coding?.[0]?.display ?? a.code?.text ?? "",
        type: a.type as AllergyIntoleranceInput["type"],
        category: a.category?.[0] as AllergyIntoleranceInput["category"],
        criticality: a.criticality as AllergyIntoleranceInput["criticality"],
        clinicalStatus: (a.clinicalStatus?.coding?.[0]?.code ?? "active") as AllergyIntoleranceInput["clinicalStatus"],
        verificationStatus: (a.verificationStatus?.coding?.[0]?.code ?? "unconfirmed") as AllergyIntoleranceInput["verificationStatus"],
        onsetDate: a.onsetDateTime?.split("T")[0],
        reactionManifestation: a.reaction?.[0]?.manifestation?.[0]?.text,
        reactionSeverity: a.reaction?.[0]?.severity as AllergyIntoleranceInput["reactionSeverity"],
        note: a.note?.[0]?.text,
    };
}

export async function createAllergyIntolerance(input: AllergyIntoleranceInput): Promise<AllergyIntolerance> {
    const body = buildAllergyBody(input);
    body.identifier = [{ system: ALLERGY_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/AllergyIntolerance`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create allergy: ${res.status} ${await res.text()}`);
    return res.json() as Promise<AllergyIntolerance>;
}

export async function updateAllergyIntolerance(id: string, input: AllergyIntoleranceInput): Promise<AllergyIntolerance> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/AllergyIntolerance/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildAllergyBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update allergy: ${res.status} ${await res.text()}`);
    return res.json() as Promise<AllergyIntolerance>;
}

// ─── Conditions ──────────────────────────────────────────────────────────────

const SEVERITY_SNOMED: Record<string, { code: string; display: string }> = {
    mild:     { code: "255604002", display: "Mild" },
    moderate: { code: "6736007",   display: "Moderate" },
    severe:   { code: "24484000",  display: "Severe" },
};

const SNOMED_TO_SEVERITY: Record<string, "mild" | "moderate" | "severe"> = {
    "255604002": "mild",
    "6736007":   "moderate",
    "24484000":  "severe",
};

export interface ConditionInput {
    patientId: string;
    encounterId?: string;
    code: string;
    icdCode?: string;
    category: "problem-list-item" | "encounter-diagnosis";
    clinicalStatus: "active" | "recurrence" | "relapse" | "inactive" | "remission" | "resolved";
    verificationStatus: "unconfirmed" | "provisional" | "differential" | "confirmed" | "refuted" | "entered-in-error";
    severity?: "mild" | "moderate" | "severe";
    onsetDate?: string;
    note?: string;
}

function buildConditionBody(input: ConditionInput, id?: string): Condition {
    return {
        resourceType: "Condition",
        ...(id ? { id } : {}),
        clinicalStatus: { coding: [{ system: config.fhir.codeSystems.conditionClinicalStatus, code: input.clinicalStatus }] },
        verificationStatus: { coding: [{ system: config.fhir.codeSystems.conditionVerificationStatus, code: input.verificationStatus }] },
        category: [{ coding: [{ system: config.fhir.codeSystems.conditionCategory, code: input.category }] }],
        ...(input.severity ? {
            severity: { coding: [{ system: config.fhir.codeSystems.snomedCt, ...SEVERITY_SNOMED[input.severity] }] },
        } : {}),
        code: {
            ...(input.icdCode ? { coding: [{ system: config.fhir.codeSystems.icd10, code: input.icdCode, display: input.code }] } : {}),
            text: input.code,
        },
        subject: { reference: `Patient/${input.patientId}` },
        ...(input.encounterId ? { encounter: { reference: `Encounter/${input.encounterId}` } } : {}),
        recordedDate: new Date().toISOString().split("T")[0],
        ...(input.onsetDate ? { onsetDateTime: input.onsetDate } : {}),
        ...(input.note?.trim() ? { note: [{ text: input.note }] } : {}),
    };
}

export function parseCondition(c: Condition): ConditionInput {
    return {
        patientId: parseFhirId(c.subject?.reference, "Patient") ?? "",
        encounterId: parseFhirId(c.encounter?.reference, "Encounter") ?? "",
        code: c.code?.text ?? c.code?.coding?.[0]?.display ?? "",
        icdCode: c.code?.coding?.find((x) => x.system === config.fhir.codeSystems.icd10 || x.system?.includes("icd-10"))?.code,
        category: (c.category?.[0]?.coding?.[0]?.code as ConditionInput["category"]) ?? "encounter-diagnosis",
        clinicalStatus: (c.clinicalStatus?.coding?.[0]?.code as ConditionInput["clinicalStatus"]) ?? "active",
        verificationStatus: (c.verificationStatus?.coding?.[0]?.code as ConditionInput["verificationStatus"]) ?? "unconfirmed",
        severity: SNOMED_TO_SEVERITY[c.severity?.coding?.[0]?.code ?? ""],
        onsetDate: c.onsetDateTime?.split("T")[0],
        note: c.note?.[0]?.text,
    };
}

export async function createCondition(input: ConditionInput): Promise<Condition> {
    const body = buildConditionBody(input);
    body.identifier = [{ system: CONDITION_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/Condition`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create condition: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Condition>;
}

export async function updateCondition(id: string, input: ConditionInput): Promise<Condition> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Condition/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildConditionBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update condition: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Condition>;
}

// ─── Immunizations ────────────────────────────────────────────────────────────

export interface ImmunizationInput {
    patientId:       string;
    encounterId?:    string;
    vaccineName:     string;
    vaccineCode?:    string;
    status:          "completed" | "not-done";
    occurrenceDate:  string;
    lotNumber?:      string;
    expirationDate?: string;
    site?:           string;
    route?:          string;
    doseNumber?:     number;
    series?:         string;
    primarySource?:  boolean;
    performer?:      string;
    statusReason?:   string;
    notes?:          string;
}

export interface ImmunizationWithPatient {
    immunization: Immunization;
    patient?: Patient;
}

function buildImmunizationBody(input: ImmunizationInput, id?: string): Immunization {
    return {
        resourceType: "Immunization",
        ...(id ? { id } : {}),
        status: input.status,
        vaccineCode: {
            ...(input.vaccineCode
                ? { coding: [{ system: config.fhir.codeSystems.cvx, code: input.vaccineCode, display: input.vaccineName }] }
                : {}),
            text: input.vaccineName,
        },
        patient: { reference: `Patient/${input.patientId}` },
        ...(input.encounterId ? { encounter: { reference: `Encounter/${input.encounterId}` } } : {}),
        occurrenceDateTime: input.occurrenceDate,
        ...(input.lotNumber      ? { lotNumber:      input.lotNumber }      : {}),
        ...(input.expirationDate ? { expirationDate: input.expirationDate } : {}),
        ...(input.site  ? { site:  { text: input.site  } } : {}),
        ...(input.route ? { route: { text: input.route } } : {}),
        ...(input.doseNumber !== undefined || input.series
            ? { protocolApplied: [{ doseNumberPositiveInt: input.doseNumber, ...(input.series ? { series: input.series } : {}) }] }
            : {}),
        ...(input.primarySource !== undefined ? { primarySource: input.primarySource } : {}),
        ...(input.performer ? { performer: [{ actor: { display: input.performer } }] } : {}),
        ...(input.status === "not-done" && input.statusReason
            ? { statusReason: { text: input.statusReason } }
            : {}),
        ...(input.notes ? { note: [{ text: input.notes }] } : {}),
    };
}

export function parseImmunization(imm: Immunization): ImmunizationInput {
    return {
        patientId:      parseFhirId(imm.patient?.reference, "Patient")    ?? "",
        encounterId:    parseFhirId(imm.encounter?.reference, "Encounter"),
        vaccineName:    imm.vaccineCode?.text ?? imm.vaccineCode?.coding?.[0]?.display ?? "",
        vaccineCode:    imm.vaccineCode?.coding?.[0]?.code,
        status:         (imm.status as ImmunizationInput["status"]) ?? "completed",
        occurrenceDate: (imm.occurrenceDateTime ?? "").split("T")[0],
        lotNumber:      imm.lotNumber,
        expirationDate: imm.expirationDate,
        site:           imm.site?.text,
        route:          imm.route?.text,
        doseNumber:     imm.protocolApplied?.[0]?.doseNumberPositiveInt,
        series:         imm.protocolApplied?.[0]?.series,
        primarySource:  imm.primarySource,
        performer:      imm.performer?.[0]?.actor?.display,
        statusReason:   imm.statusReason?.text,
        notes:          imm.note?.[0]?.text,
    };
}

export async function recordImmunization(input: ImmunizationInput): Promise<Immunization> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Immunization`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(buildImmunizationBody(input)),
    });
    if (!res.ok) throw new Error(`Failed to record immunization: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Immunization>;
}

export async function updateImmunization(id: string, input: ImmunizationInput): Promise<Immunization> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Immunization/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(buildImmunizationBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update immunization: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Immunization>;
}

export async function getPatientImmunizations(patientId: string): Promise<Immunization[]> {
    const bundle = await fhirFetch<Bundle>("Immunization", {
        patient: patientId,
        _count:  "100",
        _sort:   "-date",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as Immunization)
        .filter((r): r is Immunization => r?.resourceType === "Immunization");
}

export async function getEncounterImmunizations(encounterId: string): Promise<Immunization[]> {
    const bundle = await fhirFetch<Bundle>("Immunization", {
        encounter: `Encounter/${encounterId}`,
        _count:    "50",
        _sort:     "-date",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as Immunization)
        .filter((r): r is Immunization => r?.resourceType === "Immunization");
}

export async function searchImmunizations(params: {
    patientQuery?: string;
    patientId?: string;
    status?: string;
    count?: number;
}): Promise<ImmunizationWithPatient[]> {
    const { patientQuery, patientId, status, count = 50 } = params;

    const fhirParams: Record<string, string> = {
        _sort:    "-date",
        _count:   String(count),
        _include: "Immunization:patient",
    };
    if (status)    fhirParams.status  = status;
    if (patientId) fhirParams.patient = patientId;

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.patient = knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("Immunization", fhirParams);
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const immunizations: Immunization[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "Immunization") immunizations.push(r as Immunization);
        }
        return immunizations.map((imm) => {
            const ref = imm.patient?.reference;
            const pid = parseFhirId(ref, "Patient");
            return { immunization: imm, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

export function immunizationStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        completed:          "green",
        "not-done":         "red",
        "entered-in-error": "rose",
    };
    return map[status] ?? "gray";
}

// ─── Flags ────────────────────────────────────────────────────────────────────

export const FLAG_CATEGORY_DISPLAY: Record<string, string> = {
    safety:              "Safety",
    behavioral:          "Behavioral",
    clinical:            "Clinical",
    drug:                "Drug",
    admin:               "Administrative",
    research:            "Research",
    "advance-directive": "Advance Directive",
};

export interface FlagInput {
    patientId:    string;
    encounterId?: string;
    code:         string;
    category?:    "safety" | "behavioral" | "clinical" | "drug" | "admin" | "research" | "advance-directive";
    status:       "active" | "inactive";
    periodStart?: string;
    periodEnd?:   string;
    author?:      string;
}

export interface FlagWithPatient {
    flag: Flag;
    patient?: Patient;
}

function buildFlagBody(input: FlagInput, id?: string): Flag {
    return {
        resourceType: "Flag",
        ...(id ? { id } : {}),
        status: input.status,
        ...(input.category ? {
            category: [{
                coding: [{
                    system:  config.fhir.codeSystems.flagCategory,
                    code:    input.category,
                    display: FLAG_CATEGORY_DISPLAY[input.category] ?? input.category,
                }],
                text: FLAG_CATEGORY_DISPLAY[input.category] ?? input.category,
            }],
        } : {}),
        code:    { text: input.code },
        subject: { reference: `Patient/${input.patientId}` },
        ...(input.encounterId ? { encounter: { reference: `Encounter/${input.encounterId}` } } : {}),
        ...(input.periodStart ? {
            period: {
                start: input.periodStart,
                ...(input.periodEnd ? { end: input.periodEnd } : {}),
            },
        } : {}),
        ...(input.author ? { author: { display: input.author } } : {}),
    };
}

export function parseFlag(f: Flag): FlagInput {
    return {
        patientId:   parseFhirId(f.subject?.reference, "Patient") ?? "",
        encounterId: parseFhirId(f.encounter?.reference, "Encounter"),
        code:        f.code?.text ?? f.code?.coding?.[0]?.display ?? "",
        category:    f.category?.[0]?.coding?.[0]?.code as FlagInput["category"],
        status:      (f.status as "active" | "inactive") ?? "active",
        periodStart: f.period?.start?.split("T")[0],
        periodEnd:   f.period?.end?.split("T")[0],
        author:      (f.author as { display?: string } | undefined)?.display,
    };
}

export async function createFlag(input: FlagInput): Promise<Flag> {
    const body = buildFlagBody(input);
    body.identifier = [{ system: FLAG_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/Flag`, {
        method:  "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create flag: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Flag>;
}

export async function updateFlag(id: string, input: FlagInput): Promise<Flag> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Flag/${id}`, {
        method:  "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body:    JSON.stringify(buildFlagBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update flag: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Flag>;
}

export async function getPatientFlags(patientId: string): Promise<Flag[]> {
    const bundle = await fhirFetch<Bundle>("Flag", {
        patient: patientId,
        _count:  "100",
        _sort:   "-_lastUpdated",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as Flag)
        .filter((r): r is Flag => r?.resourceType === "Flag");
}

export async function searchFlags(params: {
    patientQuery?: string;
    patientId?: string;
    status?: string;
    count?: number;
}): Promise<FlagWithPatient[]> {
    const { patientQuery, patientId, status, count = 50 } = params;

    const fhirParams: Record<string, string> = {
        _sort:    "-_lastUpdated",
        _count:   String(count),
        _include: "Flag:subject",
    };
    if (status)    fhirParams.status  = status;
    if (patientId) fhirParams.patient = patientId;

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        fhirParams.patient = knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",");
    }

    try {
        const bundle = await fhirFetch<Bundle>("Flag", fhirParams);
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const flags: Flag[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "Flag") flags.push(r as Flag);
        }
        return flags.map((flag) => {
            const ref = flag.subject?.reference;
            const pid = parseFhirId(ref, "Patient");
            return { flag, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

export function flagCategoryColor(category?: string): StatusColor {
    const map: Record<string, StatusColor> = {
        safety:              "red",
        behavioral:          "orange",
        clinical:            "blue",
        drug:                "purple",
        admin:               "slate",
        research:            "teal",
        "advance-directive": "rose",
    };
    return map[category ?? ""] ?? "amber";
}

export function flagStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        active:             "red",
        inactive:           "slate",
        "entered-in-error": "rose",
    };
    return map[status] ?? "gray";
}

// ─── Family Member History ─────────────────────────────────────────────────

export const FAMILY_RELATIONSHIP_DISPLAY: Record<string, string> = {
    FTH:      "Father",
    MTH:      "Mother",
    BRO:      "Brother",
    SIS:      "Sister",
    SON:      "Son",
    DAU:      "Daughter",
    NSIBLING: "Sibling",
    HBRO:     "Half-Brother",
    HSIS:     "Half-Sister",
    GRFTH:    "Grandfather (Paternal)",
    GRMTH:    "Grandmother (Paternal)",
    MGRFTH:   "Grandfather (Maternal)",
    MGRMTH:   "Grandmother (Maternal)",
    UNCLE:    "Uncle",
    AUNT:     "Aunt",
    COUSN:    "Cousin",
    STPFTH:   "Stepfather",
    STPMTH:   "Stepmother",
}

export const FAMILY_HISTORY_STATUS_DISPLAY: Record<string, string> = {
    partial:           "Partial",
    completed:         "Completed",
    "health-unknown":  "Health Unknown",
}

export interface FamilyConditionInput {
    code:   string
    onset?: string
    note?:  string
}

export interface FamilyMemberHistoryInput {
    patientId:    string
    relationship: string
    name?:        string
    sex?:         string
    bornYear?:    string
    deceased?:    boolean
    deceasedAge?: string
    status:       "partial" | "completed" | "health-unknown"
    conditions:   FamilyConditionInput[]
    note?:        string
}

function buildFamilyMemberHistoryBody(input: FamilyMemberHistoryInput, id?: string): FamilyMemberHistory {
    const relDisplay = FAMILY_RELATIONSHIP_DISPLAY[input.relationship] ?? input.relationship
    const filteredConditions = input.conditions.filter((c) => c.code.trim())

    return {
        resourceType: "FamilyMemberHistory",
        ...(id ? { id } : {}),
        status: input.status as FamilyMemberHistory["status"],
        patient: { reference: `Patient/${input.patientId}` },
        relationship: {
            coding: [{ system: config.fhir.codeSystems.familyRelationship, code: input.relationship, display: relDisplay }],
            text: relDisplay,
        },
        ...(input.name     ? { name: input.name } : {}),
        ...(input.sex      ? { sex: { coding: [{ system: "http://hl7.org/fhir/administrative-gender", code: input.sex }] } } : {}),
        ...(input.bornYear ? { bornDate: input.bornYear } : {}),
        deceasedBoolean: input.deceased ?? false,
        ...(input.deceased && input.deceasedAge ? {
            deceasedAge: { value: Number(input.deceasedAge), unit: "years", system: config.fhir.codeSystems.ucum, code: "a" },
        } : {}),
        ...(filteredConditions.length ? {
            condition: filteredConditions.map((c) => ({
                code: { text: c.code.trim() },
                ...(c.onset ? { onsetAge: { value: Number(c.onset), unit: "years", system: config.fhir.codeSystems.ucum, code: "a" } } : {}),
                ...(c.note  ? { note: [{ text: c.note }] } : {}),
            })),
        } : {}),
        ...(input.note ? { note: [{ text: input.note }] } : {}),
    }
}

export async function getPatientFamilyHistory(patientId: string): Promise<FamilyMemberHistory[]> {
    const res = await fhirRequest(
        `${getFhirBaseUrl()}/FamilyMemberHistory?patient=${patientId}&_sort=-_lastUpdated&_count=100`,
        { headers: await authHeaders() },
    )
    if (!res.ok) throw new Error(`Failed to fetch family history: ${res.status}`)
    const bundle = await res.json() as Bundle
    return (bundle.entry ?? []).map((e) => e.resource as FamilyMemberHistory)
}

export async function createFamilyMemberHistory(input: FamilyMemberHistoryInput): Promise<FamilyMemberHistory> {
    const body = buildFamilyMemberHistoryBody(input);
    body.identifier = [{ system: FAMILY_HISTORY_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/FamilyMemberHistory`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Failed to create family member history: ${res.status} ${await res.text()}`)
    return res.json() as Promise<FamilyMemberHistory>
}

export async function updateFamilyMemberHistory(id: string, input: FamilyMemberHistoryInput): Promise<FamilyMemberHistory> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/FamilyMemberHistory/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildFamilyMemberHistoryBody(input, id)),
    })
    if (!res.ok) throw new Error(`Failed to update family member history: ${res.status} ${await res.text()}`)
    return res.json() as Promise<FamilyMemberHistory>
}

export function familyHistoryStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        partial:          "yellow",
        completed:        "green",
        "health-unknown": "gray",
    }
    return map[status] ?? "gray"
}

// ─── Related Person ───────────────────────────────────────────────────────────

export const RELATED_PERSON_RELATIONSHIP_DISPLAY: Record<string, string> = {
    C:   "Emergency Contact",
    E:   "Employer",
    F:   "Federal Agency",
    I:   "Insurance Company",
    N:   "Next of Kin",
    S:   "State Agency",
    U:   "Unknown",
    O:   "Other",
    BP:  "Billing Contact Person",
    CP:  "Contact Person",
    EP:  "Emergency Contact Person",
    GR:  "Guarantor",
    GT:  "Guarantor (Primary)",
    PR:  "Person Preparing Referral",
    SK:  "Seeker",
    WRD: "Ward of Court",
}

export interface RelatedPersonInput {
    patientId:    string
    relationship: string
    givenName:    string
    familyName:   string
    phone?:       string
    email?:       string
    gender?:      string
    birthDate?:   string
    address?:     string
    priority?:    "primary" | "secondary"
    note?:        string
}

function buildRelatedPersonBody(input: RelatedPersonInput, id?: string): RelatedPerson {
    const relDisplay = RELATED_PERSON_RELATIONSHIP_DISPLAY[input.relationship] ?? input.relationship

    return {
        resourceType: "RelatedPerson",
        ...(id ? { id } : {}),
        active: true,
        patient: { reference: `Patient/${input.patientId}` },
        relationship: [{
            coding: [{ system: config.fhir.codeSystems.relatedPersonRelationship, code: input.relationship, display: relDisplay }],
            text: relDisplay,
        }],
        name: [{
            use: "official",
            family: input.familyName,
            given: [input.givenName].filter(Boolean),
        }],
        ...(input.gender ? { gender: input.gender as RelatedPerson["gender"] } : {}),
        ...(input.birthDate ? { birthDate: input.birthDate } : {}),
        telecom: [
            ...(input.phone ? [{ system: "phone" as const, value: input.phone, use: "mobile" as const }] : []),
            ...(input.email ? [{ system: "email" as const, value: input.email }] : []),
        ],
        ...(input.address ? { address: [{ text: input.address }] } : {}),
    }
}

export async function getPatientRelatedPersons(patientId: string): Promise<RelatedPerson[]> {
    const res = await fhirRequest(
        `${getFhirBaseUrl()}/RelatedPerson?patient=${patientId}&_sort=-_lastUpdated&_count=100`,
        { headers: await authHeaders() },
    )
    if (!res.ok) throw new Error(`Failed to fetch related persons: ${res.status}`)
    const bundle = await res.json() as Bundle
    return (bundle.entry ?? []).map((e) => e.resource as RelatedPerson)
}

export async function createRelatedPerson(input: RelatedPersonInput): Promise<RelatedPerson> {
    const body = buildRelatedPersonBody(input);
    body.identifier = [{ system: RELATED_PERSON_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/RelatedPerson`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Failed to create related person: ${res.status} ${await res.text()}`)
    return res.json() as Promise<RelatedPerson>
}

export async function updateRelatedPerson(id: string, input: RelatedPersonInput): Promise<RelatedPerson> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/RelatedPerson/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildRelatedPersonBody(input, id)),
    })
    if (!res.ok) throw new Error(`Failed to update related person: ${res.status} ${await res.text()}`)
    return res.json() as Promise<RelatedPerson>
}

export function relatedPersonDisplayName(r: RelatedPerson): string {
    const n = r.name?.[0]
    if (!n) return "Unknown"
    return [n.given?.join(" "), n.family].filter(Boolean).join(" ")
}

export function relatedPersonRelationship(r: RelatedPerson): string {
    const code = r.relationship?.[0]?.coding?.[0]?.code ?? ""
    return RELATED_PERSON_RELATIONSHIP_DISPLAY[code] ?? r.relationship?.[0]?.text ?? code
}

// ─── Advance Directives (Consent / ADR) ──────────────────────────────────────

export const ADVANCE_DIRECTIVE_DISPLAY: Record<string, string> = {
    DNR:        "Do Not Resuscitate (DNR)",
    DNI:        "Do Not Intubate (DNI)",
    POLST:      "POLST",
    LIVINGWILL: "Living Will",
    HCPOA:      "Healthcare Power of Attorney",
    COMFORT:    "Comfort Care Only",
    LIMITED:    "Limited Resuscitation",
    FULLCODE:   "Full Code",
}

// Directives that must be shown prominently on the patient header
export const CRITICAL_DIRECTIVE_CODES = new Set(["DNR", "DNI", "POLST", "COMFORT", "LIMITED"])

export const ADVANCE_DIRECTIVE_STATUS_DISPLAY: Record<string, string> = {
    active:   "Active",
    inactive: "Inactive",
    draft:    "Draft",
    rejected: "Revoked",
}

export interface AdvanceDirectiveInput {
    patientId: string
    type:      string
    status:    "active" | "inactive" | "draft" | "rejected"
    date:      string
    witness?:  string
    notes?:    string
}

function buildConsentBody(input: AdvanceDirectiveInput, id?: string): Consent {
    const typeDisplay = ADVANCE_DIRECTIVE_DISPLAY[input.type] ?? input.type
    return {
        resourceType: "Consent",
        ...(id ? {id} : {}),
        status: input.status as Consent["status"],
        scope: {
            coding: [{system: config.fhir.codeSystems.consentScope, code: "adr", display: "Advanced Care Directive"}],
        },
        category: [{
            coding: [{system: config.fhir.codeSystems.actCode, code: input.type, display: typeDisplay}],
            text: typeDisplay,
        }],
        patient: {reference: `Patient/${input.patientId}`},
        policyRule: {coding: [{system: config.fhir.codeSystems.actCode, code: "OPTIN", display: "opt-in"}]},
        dateTime: input.date,
        ...(input.witness ? {performer: [{display: input.witness}]} : {}),
        ...(input.notes ? {
            extension: [{url: EXT_DIRECTIVE_NOTES, valueString: input.notes}],
        } : {}),
    }
}

export function getDirectiveNotes(c: Consent): string | undefined {
    return c.extension?.find((x) => x.url === EXT_DIRECTIVE_NOTES)?.valueString
}

export function getDirectiveType(c: Consent): string {
    return c.category?.[0]?.coding?.[0]?.code ?? ""
}

export async function getPatientAdvanceDirectives(patientId: string): Promise<Consent[]> {
    const res = await fhirRequest(
        `${getFhirBaseUrl()}/Consent?patient=${patientId}&_sort=-dateTime&_count=50`,
        { headers: await authHeaders() },
    )
    if (!res.ok) throw new Error(`Failed to fetch advance directives: ${res.status}`)
    const bundle = await res.json() as Bundle
    return (bundle.entry ?? []).map((e) => e.resource as Consent)
}

export async function createAdvanceDirective(input: AdvanceDirectiveInput): Promise<Consent> {
    const body = buildConsentBody(input);
    body.identifier = [{ system: CONSENT_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/Consent`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Failed to create advance directive: ${res.status} ${await res.text()}`)
    return res.json() as Promise<Consent>
}

export async function updateAdvanceDirective(id: string, input: AdvanceDirectiveInput): Promise<Consent> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Consent/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildConsentBody(input, id)),
    })
    if (!res.ok) throw new Error(`Failed to update advance directive: ${res.status} ${await res.text()}`)
    return res.json() as Promise<Consent>
}

export function advanceDirectiveStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        active:   "red",
        inactive: "gray",
        draft:    "yellow",
        rejected: "slate",
    }
    return map[status] ?? "gray"
}

// ─── QuestionnaireResponse ─────────────────────────────────────────────────────

export async function getPatientQuestionnaireResponses(
    patientId: string,
): Promise<QuestionnaireResponse[]> {
    try {
        const bundle = await fhirFetch<Bundle>("QuestionnaireResponse", {
            subject: `Patient/${patientId}`,
            _sort: "-authored",
            _count: "100",
        });
        return (bundle.entry ?? [])
            .map((e) => e.resource)
            .filter((r): r is QuestionnaireResponse => r?.resourceType === "QuestionnaireResponse");
    } catch {
        return [];
    }
}

export async function getEncounterQuestionnaireResponses(
    encounterId: string,
): Promise<QuestionnaireResponse[]> {
    try {
        const bundle = await fhirFetch<Bundle>("QuestionnaireResponse", {
            encounter: `Encounter/${encounterId}`,
            _sort: "-authored",
            _count: "50",
        });
        return (bundle.entry ?? [])
            .map((e) => e.resource)
            .filter((r): r is QuestionnaireResponse => r?.resourceType === "QuestionnaireResponse");
    } catch {
        return [];
    }
}

export async function getQuestionnaireResponse(id: string): Promise<QuestionnaireResponse> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/QuestionnaireResponse/${id}`, {
        headers: await authHeaders({ Accept: "application/fhir+json" }),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`QuestionnaireResponse/${id} not found: ${res.status}`);
    return res.json() as Promise<QuestionnaireResponse>;
}

export async function submitQuestionnaireResponse(
    body: QuestionnaireResponse,
): Promise<QuestionnaireResponse> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/QuestionnaireResponse`, {
        method: "POST",
        headers: await authHeaders({
            "Content-Type": "application/fhir+json",
            Accept: "application/fhir+json",
            prefer: "return=representation",
        }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to submit QuestionnaireResponse: ${res.status} ${await res.text()}`);
    return res.json() as Promise<QuestionnaireResponse>;
}

export async function updateQuestionnaireResponse(
    id: string,
    body: QuestionnaireResponse,
): Promise<QuestionnaireResponse> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/QuestionnaireResponse/${id}`, {
        method: "PUT",
        headers: await authHeaders({
            "Content-Type": "application/fhir+json",
            Accept: "application/fhir+json",
            prefer: "return=representation",
        }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to update QuestionnaireResponse: ${res.status} ${await res.text()}`);
    return res.json() as Promise<QuestionnaireResponse>;
}

export async function deleteQuestionnaireResponse(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/QuestionnaireResponse/${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete QuestionnaireResponse: ${res.status}`);
}
