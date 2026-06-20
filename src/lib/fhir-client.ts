import type {
    AllergyIntolerance,
    Appointment,
    Bundle,
    Composition,
    Consent,
    Condition,
    DiagnosticReport,
    DocumentReference,
    Encounter,
    FamilyMemberHistory,
    Flag,
    Immunization,
    MedicationAdministration,
    MedicationRequest,
    Observation,
    Organization,
    Patient,
    Practitioner,
    PractitionerRole,
    Procedure,
    QuestionnaireResponse,
    RelatedPerson,
    Resource,
    ServiceRequest,
    Task,
} from "@medplum/fhirtypes";
import { customAlphabet } from "nanoid";
import config from "./config.json";
import { authHeaders, clearAuthToken } from "./auth";
import type { StatusColor } from "@/components/ui/StatusPill";

const generateMRN        = customAlphabet(config.idGeneration.alphabet, config.idGeneration.maxLength);
const generateVisitId    = customAlphabet(config.idGeneration.alphabet, config.idGeneration.maxLength);
const generateResourceId = customAlphabet(config.idGeneration.alphabet, config.idGeneration.maxLength);

const ALLERGY_ID_SYSTEM            = config.fhir.identifierSystems.allergy;
const CONDITION_ID_SYSTEM          = config.fhir.identifierSystems.condition;
const COMPOSITION_ID_SYSTEM        = config.fhir.identifierSystems.composition;
const APPOINTMENT_ID_SYSTEM        = config.fhir.identifierSystems.appointment;
const SERVICE_REQUEST_ID_SYSTEM    = config.fhir.identifierSystems.serviceRequest;
const MEDICATION_REQUEST_ID_SYSTEM = config.fhir.identifierSystems.medicationRequest;
const OBSERVATION_ID_SYSTEM        = config.fhir.identifierSystems.observation;
const FLAG_ID_SYSTEM               = config.fhir.identifierSystems.flag;
const DIAGNOSTIC_REPORT_ID_SYSTEM  = config.fhir.identifierSystems.diagnosticReport;
const FAMILY_HISTORY_ID_SYSTEM     = config.fhir.identifierSystems.familyHistory;
const RELATED_PERSON_ID_SYSTEM     = config.fhir.identifierSystems.relatedPerson;
const CONSENT_ID_SYSTEM            = config.fhir.identifierSystems.consent;
const TASK_ID_SYSTEM               = config.fhir.identifierSystems.task;
const DOCUMENT_REF_ID_SYSTEM       = config.fhir.identifierSystems.documentRef;
const PRACTITIONER_ID_SYSTEM       = config.fhir.identifierSystems.practitioner;
const ORG_INTERNAL_ID_SYSTEM       = config.fhir.identifierSystems.organization;
const PRACTITIONER_ROLE_ID_SYSTEM  = config.fhir.identifierSystems.practitionerRole;

export const FHIR_STORAGE_KEY = config.fhir.storageKey;

export function getFhirBaseUrl(): string {
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem(FHIR_STORAGE_KEY);
        if (stored?.trim()) return stored.trim();
    }
    return process.env.NEXT_PUBLIC_FHIR_BASE_URL ?? config.fhir.defaultUrl;
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

const MRN_SYSTEM = config.fhir.identifierSystems.mrn;
export const VISIT_ID_SYSTEM = config.fhir.identifierSystems.visitId;
export const QID_SYSTEM = config.fhir.identifierSystems.qid;
const PASSPORT_SYSTEM = config.fhir.identifierSystems.passport;
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
const CS_IDENTIFIER_TYPE = config.fhir.codeSystems.identifierType;
const CS_COUNTRY_CODE = config.fhir.codeSystems.countryCode;
const CS_PERSON_TYPE = config.fhir.codeSystems.personType;
const CS_LANGUAGE = config.fhir.codeSystems.language;

export interface CodeOption {
    code: string;
    display: string;
    system?: string
}

export const PERSON_TYPE_OPTIONS: CodeOption[] = config.fhir.options.personType;
export const ETHNICITY_OPTIONS: CodeOption[] = config.fhir.options.ethnicity;

// ─── Fetch helpers ──────────────────────────────────────────────────────────

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

async function fhirRequest(url: string, init: RequestInit): Promise<Response> {
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

async function fhirFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${getFhirBaseUrl()}/${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fhirRequest(url.toString(), {headers: await authHeaders({Accept: "application/fhir+json"})});
    if (!res.ok) throw new Error(`FHIR request failed: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
}

// ─── MRN ────────────────────────────────────────────────────────────────────

export async function generateNextMRN(): Promise<string> {
    return generateMRN();
}

export async function generateNextVisitId(): Promise<string> {
    return generateVisitId();
}

export function getEncounterVisitId(enc: Encounter): string {
    return enc.identifier?.find((i) => i.system === VISIT_ID_SYSTEM)?.value ?? "";
}

export function getPatientMRN(p: Patient): string {
    return p.identifier?.find((i) => i.system === MRN_SYSTEM)?.value ?? "";
}

export function getPatientQID(p: Patient): string {
    return p.identifier?.find((i) => i.system === QID_SYSTEM)?.value ?? "";
}

export function getPatientPassport(p: Patient): string {
    return p.identifier?.find((i) => i.system === PASSPORT_SYSTEM)?.value ?? "";
}

export function getPatientPhone(p: Patient): string {
    return p.telecom?.find((t) => t.system === "phone")?.value ?? "";
}

export function getPatientNationality(p: Patient): string {
    return (
        p.extension
            ?.find((x) => x.url === EXT_NATIONALITY)
            ?.extension?.find((x) => x.url === "code")
            ?.valueCodeableConcept?.coding?.[0]?.code ?? ""
    );
}

// ─── Search / Get ────────────────────────────────────────────────────────────

function bundleToPatients(bundle: Bundle): Patient[] {
    return (bundle.entry ?? [])
        .map((e) => e.resource as Patient)
        .filter((r): r is Patient => r?.resourceType === "Patient");
}

export async function searchPatients(query: string): Promise<Patient[]> {
    const q = query.trim();
    if (!q) return [];

    // Strip "MR-" / "MRN-" prefix so "MR-000123" becomes "000123"
    const normalized = /^MRN?-/i.test(q) ? q.replace(/^MRN?-/i, "") : q;

    const isAllDigits = /^\d+$/.test(normalized);
    const hasLetters = /[a-zA-Z]/.test(normalized);
    const hasSpaces = normalized.includes(" ");
    const digitOnly = normalized.replace(/\D/g, "");
    // Phone-like: no letters, enough digits (local or international)
    const isPhoneLike = !hasLetters && digitOnly.length >= 7;
    // Identifier-like: all-digits OR short alphanumeric without spaces (MRN/QID/passport)
    const isIdentLike = isAllDigits || (!hasSpaces && normalized.length >= 2 && normalized.length <= 20);

    const searches: Promise<Patient[]>[] = [];

    // Name search when input contains letters or spaces
    if (hasLetters || hasSpaces) {
        searches.push(
            fhirFetch<Bundle>("Patient", {name: normalized, _count: "20", _sort: "family"})
                .then(bundleToPatients)
                .catch(() => [])
        );
    }

    // Identifier search: matches MRN, QID, passport across all systems
    if (isIdentLike) {
        searches.push(
            fhirFetch<Bundle>("Patient", {identifier: normalized, _count: "20"})
                .then(bundleToPatients)
                .catch(() => [])
        );
    }

    // Phone search: digit strings that are long enough to be a phone number
    if (isPhoneLike) {
        searches.push(
            fhirFetch<Bundle>("Patient", {phone: digitOnly, _count: "20"})
                .then(bundleToPatients)
                .catch(() => [])
        );
    }

    // Fallback in case none of the above matched (shouldn't happen)
    if (searches.length === 0) {
        searches.push(
            fhirFetch<Bundle>("Patient", {name: q, _count: "20", _sort: "family"})
                .then(bundleToPatients)
                .catch(() => [])
        );
    }

    // Merge and deduplicate; name-search results come first (already sorted by family)
    const seen = new Set<string>();
    return (await Promise.all(searches))
        .flat()
        .filter((p) => {
            if (!p.id || seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
}

export async function getPatient(id: string): Promise<Patient> {
    return fhirFetch<Patient>(`Patient/${id}`);
}

export async function getEncounter(id: string): Promise<Encounter> {
    return fhirFetch<Encounter>(`Encounter/${id}`);
}

export function encounterStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        "in-progress":      "green",
        finished:           "slate",
        cancelled:          "red",
        planned:            "blue",
        "on-hold":          "amber",
        "entered-in-error": "rose",
    };
    return map[status] ?? "muted";
}

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

export async function getPractitioner(id: string): Promise<Practitioner> {
    return fhirFetch<Practitioner>(`Practitioner/${id}`);
}

export async function searchPractitioners(query?: string): Promise<Practitioner[]> {
    const params: Record<string, string> = { _count: "50", _sort: "family" };
    if (query?.trim()) params.name = query.trim();
    const bundle = await fhirFetch<Bundle>("Practitioner", params);
    return (bundle.entry ?? [])
        .map((e) => e.resource as Practitioner)
        .filter((r): r is Practitioner => r?.resourceType === "Practitioner");
}

export async function getPatientEncounters(patientId: string): Promise<Encounter[]> {
    const bundle = await fhirFetch<Bundle>("Encounter", {patient: patientId, _count: "20", _sort: "-date"});
    return (bundle.entry ?? []).map((e) => e.resource as Encounter).filter((r): r is Encounter => r?.resourceType === "Encounter");
}

export async function getPatientObservations(patientId: string): Promise<Observation[]> {
    const bundle = await fhirFetch<Bundle>("Observation", {
        patient: patientId,
        category: "vital-signs",
        _count: "20",
        _sort: "-date"
    });
    return (bundle.entry ?? []).map((e) => e.resource as Observation).filter((r): r is Observation => r?.resourceType === "Observation");
}

export async function getPatientConditions(patientId: string): Promise<Condition[]> {
    const bundle = await fhirFetch<Bundle>("Condition", {patient: patientId, _count: "50"});
    return (bundle.entry ?? []).map((e) => e.resource as Condition).filter((r): r is Condition => r?.resourceType === "Condition");
}

export async function getPatientMedications(patientId: string): Promise<MedicationRequest[]> {
    const bundle = await fhirFetch<Bundle>("MedicationRequest", {patient: patientId, _count: "50"});
    return (bundle.entry ?? []).map((e) => e.resource as MedicationRequest).filter((r): r is MedicationRequest => r?.resourceType === "MedicationRequest");
}

export async function getPatientAllergies(patientId: string): Promise<AllergyIntolerance[]> {
    const bundle = await fhirFetch<Bundle>("AllergyIntolerance", {patient: patientId, _count: "50"});
    return (bundle.entry ?? []).map((e) => e.resource as AllergyIntolerance).filter((r): r is AllergyIntolerance => r?.resourceType === "AllergyIntolerance");
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NewPatientInput {
    mrn: string;
    active: boolean;
    vip: boolean;
    // English name
    givenEn: string;
    middleEn?: string;
    familyEn: string;
    // Arabic name (optional)
    givenAr?: string;
    middleAr?: string;
    familyAr?: string;
    // Identifiers
    qid: string;
    passport?: string;
    // Demographics
    birthDate: string;
    nationality: string;
    nationalityDisplay: string;
    gender: "male" | "female" | "other" | "unknown";
    personType?: string;
    ethnicity?: string;
    // Deceased
    deceased?: boolean;
    deceasedDateTime?: string;
    // Birth place (separate from residential address)
    birthPlaceCountry?: string;
    birthPlaceCity?: string;
    birthPlaceText?: string;
    // Insurance
    insuranceCompany?: string;
    // Address
    addressCountry?: string;
    addressCity?: string;
    addressText?: string;
    // Address extensions (Unwani)
    addressBuildingNumber?: string;
    addressStreetNumber?: string;
    addressUnit?: string;
    addressZone?: string;
    addressLang?: string;
    // Contact
    phone?: string;
    email?: string;
    // Communication
    preferredLanguage?: string;
    // Admin
    adminNotes?: string;
    cadavericDonor?: boolean;
}

export interface PatientFormState {
    mrn: string;
    active: boolean;
    vip: boolean;
    givenEn: string;
    middleEn: string;
    familyEn: string;
    givenAr: string;
    middleAr: string;
    familyAr: string;
    qid: string;
    passport: string;
    birthDate: string;
    nationality: string;
    gender: string;
    personType: string;
    ethnicity: string;
    birthPlaceCountry: string;
    birthPlaceCity: string;
    birthPlaceText: string;
    insuranceCompany: string;
    addressCountry: string;
    addressCity: string;
    addressText: string;
    addressBuildingNumber: string;
    addressStreetNumber: string;
    addressUnit: string;
    addressZone: string;
    addressLang: string;
    phone: string;
    email: string;
    adminNotes: string;
    cadavericDonor: boolean;
    deceased: boolean;
    deceasedDateTime: string;
    preferredLanguage: string;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

export function patientToFormState(p: Patient): PatientFormState {
    const enName = p.name?.find(
        (n) => !n.extension?.some((x) => x.url === EXT_LANGUAGE || x.url === EXT_NAME_LANGUAGE)
    ) ?? p.name?.[0];
    const arName = p.name?.find((n) =>
        n.extension?.some(
            (x) =>
                (x.url === EXT_LANGUAGE && x.valueCode === "ar") ||
                (x.url === EXT_NAME_LANGUAGE && x.valueCodeableConcept?.coding?.[0]?.code === "ar")
        )
    );

    const qid = p.identifier?.find((i) => i.system === QID_SYSTEM)?.value ?? "";
    const mrn = p.identifier?.find((i) => i.system === MRN_SYSTEM)?.value ?? "";
    const passport = p.identifier?.find((i) => i.system === PASSPORT_SYSTEM)?.value ?? "";

    const nationalityCode =
        p.extension
            ?.find((x) => x.url === EXT_NATIONALITY)
            ?.extension?.find((x) => x.url === "code")
            ?.valueCodeableConcept?.coding?.[0]?.code ?? "";

    const vip = p.extension?.find((x) => x.url === EXT_VIP)?.valueBoolean ?? false;
    const insuranceCompany = p.extension?.find((x) => x.url === EXT_INSURANCE)?.valueString ?? "";
    const adminNotes = p.extension?.find((x) => x.url === EXT_ADMIN_NOTES)?.valueString ?? "";
    const personType = p.extension?.find((x) => x.url === EXT_PERSON_TYPE)?.valueCoding?.code ?? "";
    const cadavericDonor = p.extension?.find((x) => x.url === EXT_CADAVERIC_DONOR)?.valueBoolean ?? false;
    const ethnicity = p.extension?.find((x) => x.url === EXT_ETHNICITY)?.valueCodeableConcept?.coding?.[0]?.code ?? "";

    const birthPlaceExt = p.extension?.find((x) => x.url === EXT_BIRTH_PLACE);
    const birthPlaceCountry = birthPlaceExt?.valueAddress?.country ?? "";
    const birthPlaceCity = birthPlaceExt?.valueAddress?.city ?? "";
    const birthPlaceText = birthPlaceExt?.valueAddress?.text ?? "";

    const addr = p.address?.[0];
    const addressBuildingNumber = addr?.extension?.find((x) => x.url === EXT_ADDR_BUILDING)?.valueString ?? "";
    const addressStreetNumber = addr?.extension?.find((x) => x.url === EXT_ADDR_STREET)?.valueString ?? "";
    const addressUnit = addr?.extension?.find((x) => x.url === EXT_ADDR_UNIT)?.valueString ?? "";
    const addressZone = addr?.extension?.find((x) => x.url === EXT_ADDR_ZONE)?.valueString ?? "";
    const addressLang = addr?.extension?.find((x) => x.url === EXT_ADDR_LANGUAGE)?.valueCodeableConcept?.coding?.[0]?.code ?? "";

    return {
        mrn,
        active: p.active ?? true,
        vip,
        givenEn: enName?.given?.[0] ?? "",
        middleEn: enName?.given?.[1] ?? "",
        familyEn: enName?.family ?? "",
        givenAr: arName?.given?.[0] ?? "",
        middleAr: arName?.given?.[1] ?? "",
        familyAr: arName?.family ?? "",
        qid,
        passport,
        birthDate: p.birthDate ?? "",
        nationality: nationalityCode,
        gender: p.gender ?? "",
        personType,
        ethnicity,
        birthPlaceCountry,
        birthPlaceCity,
        birthPlaceText,
        cadavericDonor,
        insuranceCompany,
        addressCountry: addr?.country ?? "",
        addressCity: addr?.city ?? "",
        addressText: addr?.text ?? "",
        addressBuildingNumber,
        addressStreetNumber,
        addressUnit,
        addressZone,
        addressLang,
        phone: p.telecom?.find((t) => t.system === "phone")?.value ?? "",
        email: p.telecom?.find((t) => t.system === "email")?.value ?? "",
        adminNotes,
        deceased: !!(p.deceasedBoolean || (typeof p.deceasedDateTime === "string" && p.deceasedDateTime.length > 0)),
        deceasedDateTime: typeof p.deceasedDateTime === "string" ? p.deceasedDateTime.slice(0, 10) : "",
        preferredLanguage: p.communication?.find((c) => c.preferred)?.language?.coding?.[0]?.code ?? "",
    };
}

// ─── Body builder (shared between create & update) ───────────────────────────

function buildPatientBody(input: NewPatientInput, id?: string): Patient {
    const givenEn = [input.givenEn, ...(input.middleEn ? [input.middleEn] : [])];
    const givenAr = input.givenAr
        ? [input.givenAr, ...(input.middleAr ? [input.middleAr] : [])]
        : undefined;

    const identifiers: Patient["identifier"] = [
        {
            type: {
                coding: [{system: CS_IDENTIFIER_TYPE, code: "MR", display: "Medical record number"}],
                text: "Medical Record Number"
            },
            system: MRN_SYSTEM,
            value: input.mrn,
        },
        {
            type: {
                coding: [{
                    system: CS_IDENTIFIER_TYPE,
                    code: config.fhir.identifierTypes.NN,
                    display: config.fhir.identifierTypes.NN_DISPLAY
                }]
            },
            system: QID_SYSTEM,
            value: input.qid,
        },
        ...(input.passport
            ? [{
                type: {
                    coding: [{system: CS_IDENTIFIER_TYPE, code: "PPN", display: "Passport number"}],
                    text: "Passport"
                },
                system: PASSPORT_SYSTEM,
                value: input.passport,
            }]
            : []),
    ];

    const personTypeOpt = PERSON_TYPE_OPTIONS.find((o) => o.code === input.personType);
    const ethnicityOpt = ETHNICITY_OPTIONS.find((o) => o.code === input.ethnicity);

    const extensions: NonNullable<Patient["extension"]> = [
        {
            url: EXT_NATIONALITY,
            extension: [{
                url: "code",
                valueCodeableConcept: {
                    coding: [{
                        system: CS_COUNTRY_CODE,
                        code: input.nationality,
                        display: input.nationalityDisplay
                    }]
                }
            }],
        },
        {url: EXT_VIP, valueBoolean: input.vip},
        ...(input.personType ? [{
            url: EXT_PERSON_TYPE,
            valueCoding: {
                system: CS_PERSON_TYPE,
                code: input.personType,
                display: personTypeOpt?.display ?? input.personType,
            },
        }] : []),
        ...(input.cadavericDonor ? [{url: EXT_CADAVERIC_DONOR, valueBoolean: true}] : []),
        ...(input.ethnicity && ethnicityOpt ? [{
            url: EXT_ETHNICITY,
            valueCodeableConcept: {
                coding: [{
                    system: ethnicityOpt.system ?? config.fhir.codeSystems.snomedCt,
                    code: input.ethnicity,
                    display: ethnicityOpt.display,
                }],
                text: ethnicityOpt.display,
            },
        }] : []),
        ...((input.birthPlaceCountry || input.birthPlaceCity || input.birthPlaceText) ? [{
            url: EXT_BIRTH_PLACE,
            valueAddress: {
                ...(input.birthPlaceCountry ? {country: input.birthPlaceCountry} : {}),
                ...(input.birthPlaceCity ? {city: input.birthPlaceCity} : {}),
                ...(input.birthPlaceText ? {text: input.birthPlaceText} : {}),
            },
        }] : []),
        ...(input.insuranceCompany ? [{url: EXT_INSURANCE, valueString: input.insuranceCompany}] : []),
        ...(input.adminNotes ? [{url: EXT_ADMIN_NOTES, valueString: input.adminNotes}] : []),
    ];

    const names: Patient["name"] = [
        {
            use: "official", family: input.familyEn, given: givenEn, extension: [
                {
                    url: EXT_NAME_LANGUAGE,
                    valueCodeableConcept: {
                        coding: [{system: CS_LANGUAGE, code: "en", display: "English"}],
                    },
                },
            ]
        },
        ...(givenAr || input.familyAr
            ? [{
                use: "official" as const,
                family: input.familyAr ?? "",
                given: givenAr ?? [],
                extension: [{
                    url: EXT_NAME_LANGUAGE,
                    valueCodeableConcept: {
                        coding: [{system: CS_LANGUAGE, code: "ar", display: "Arabic"}],
                    },
                }],
            }]
            : []),
    ];

    const addrExtensions: NonNullable<Patient["extension"]> = [
        ...(input.addressBuildingNumber ? [{url: EXT_ADDR_BUILDING, valueString: input.addressBuildingNumber}] : []),
        ...(input.addressStreetNumber ? [{url: EXT_ADDR_STREET, valueString: input.addressStreetNumber}] : []),
        ...(input.addressUnit ? [{url: EXT_ADDR_UNIT, valueString: input.addressUnit}] : []),
        ...(input.addressZone ? [{url: EXT_ADDR_ZONE, valueString: input.addressZone}] : []),
        ...(input.addressLang ? [{
            url: EXT_ADDR_LANGUAGE,
            valueCodeableConcept: {
                coding: [{
                    system: CS_LANGUAGE,
                    code: input.addressLang,
                    display: input.addressLang === "ar" ? "Arabic" : "English",
                }],
            },
        }] : []),
    ];

    const address: Patient["address"] =
        input.addressCountry || input.addressCity || input.addressText || addrExtensions.length
            ? [{
                use: "home" as const,
                text: input.addressText,
                city: input.addressCity,
                country: input.addressCountry,
                ...(addrExtensions.length ? {extension: addrExtensions} : {}),
            }]
            : undefined;
    const telecom:Patient["telecom"] =
        input.phone || input.email
            ? [
                ...(input.phone ? [{system: "phone" as const, value: input.phone, use: "mobile" as const}] : []),
                ...(input.email ? [{system: "email" as const, value: input.email}] : []),
            ]
            : undefined;

    const meta = {"profile": [config.fhir.profiles.patient]}

    return {
        "meta": meta,
        resourceType: "Patient",
        ...(id ? {id} : {}),
        active: input.active,
        identifier: identifiers,
        name: names,
        gender: input.gender,
        birthDate: input.birthDate,
        extension: extensions,
        "managingOrganization": {"reference": "Organization?identifier="+MANAGING_ORG_IDENTIFIER},
        address,
        telecom,
        ...(input.deceased
            ? input.deceasedDateTime
                ? {deceasedDateTime: input.deceasedDateTime}
                : {deceasedBoolean: true}
            : {deceasedBoolean: false}),
        ...(input.preferredLanguage ? {
            communication: [{
                language: {
                    coding: [{system: "urn:ietf:bcp:47", code: input.preferredLanguage}],
                },
                preferred: true,
            }],
        } : {}),
    };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createPatient(input: NewPatientInput): Promise<Patient> {
    console.log(input)
    const res = await fhirRequest(`${getFhirBaseUrl()}/Patient`, {
        method: "POST",
        headers: await authHeaders({"Content-Type": "application/fhir+json", Accept: "application/fhir+json","prefer":"return=representation"}),
        body: JSON.stringify(buildPatientBody(input)),
    });
    if (!res.ok) throw new Error(`Failed to create patient: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Patient>;
}

export async function updatePatient(id: string, input: NewPatientInput): Promise<Patient> {
    const existing = await getPatient(id);
    const body = buildPatientBody(input, id);
    if (existing.photo?.length) body.photo = existing.photo;
    const res = await fhirRequest(`${getFhirBaseUrl()}/Patient/${id}`, {
        method: "PUT",
        headers: await authHeaders({"Content-Type": "application/fhir+json", Accept: "application/fhir+json","prefer":"return=representation"}),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to update patient: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Patient>;
}

// Fetches the current patient, replaces the photo array, and PUTs it back.
export async function updatePatientPhoto(
    patientId: string,
    base64Data: string,
    contentType: string,
): Promise<Patient> {
    const current = await getPatient(patientId);
    const updated: Patient = {
        ...current,
        photo: [{ contentType, data: base64Data, title: "Patient photo" }],
    };
    const res = await fhirRequest(`${getFhirBaseUrl()}/Patient/${patientId}`, {
        method: "PUT",
        headers: await authHeaders({"Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation"}),
        body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error(`Failed to update patient photo: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Patient>;
}

export async function mergePatients(survivorId: string, losingId: string): Promise<void> {
    const [survivor, loser] = await Promise.all([
        getPatient(survivorId),
        getPatient(losingId),
    ]);

    const headers = await authHeaders({
        "Content-Type": "application/fhir+json",
        Accept: "application/fhir+json",
        prefer: "return=minimal",
    });
    const base = getFhirBaseUrl();

    const updatedLoser: Patient = {
        ...loser,
        active: false,
        link: [
            ...(loser.link ?? []),
            { other: { reference: `Patient/${survivorId}` }, type: "replaced-by" },
        ],
    };

    const updatedSurvivor: Patient = {
        ...survivor,
        link: [
            ...(survivor.link ?? []),
            { other: { reference: `Patient/${losingId}` }, type: "replaces" },
        ],
    };

    const [loserRes, survivorRes] = await Promise.all([
        fetch(`${base}/Patient/${losingId}`, { method: "PUT", headers, body: JSON.stringify(updatedLoser) }),
        fetch(`${base}/Patient/${survivorId}`, { method: "PUT", headers, body: JSON.stringify(updatedSurvivor) }),
    ]);

    if (!loserRes.ok) throw new Error(`Failed to deactivate merged patient: ${loserRes.status}`);
    if (!survivorRes.ok) throw new Error(`Failed to update surviving patient: ${survivorRes.status}`);
}

export async function removePatientPhoto(patientId: string): Promise<Patient> {
    const current = await getPatient(patientId);
    const updated: Patient = { ...current, photo: [] };
    const res = await fhirRequest(`${getFhirBaseUrl()}/Patient/${patientId}`, {
        method: "PUT",
        headers: await authHeaders({"Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation"}),
        body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error(`Failed to remove patient photo: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Patient>;
}

export function patientPhotoDataUrl(patient: Patient): string | null {
    const photo = patient.photo?.[0];
    if (!photo?.data) return null;
    const mime = photo.contentType ?? "image/jpeg";
    return `data:${mime};base64,${photo.data}`;
}

export interface VitalInput {
    patientId: string;
    encounterId?: string;
    effectiveDateTime: string;
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    respiratoryRate?: number;
    spo2?: number;
    temperature?: number;
    weight?: number;
    height?: number;
}

// ─── Vital sign alert rules ────────────────────────────────────────────────────

export type VitalAlertSeverity = "critical" | "abnormal";

export interface VitalAlertRule {
    field: keyof Omit<VitalInput, "patientId" | "encounterId" | "effectiveDateTime">;
    label: string;
    unit: string;
    criticalLow?: number;
    normalLow?: number;
    normalHigh?: number;
    criticalHigh?: number;
}

export const VITAL_ALERT_RULES: VitalAlertRule[] = [
    { field: "systolicBP",      label: "Systolic BP",        unit: "mmHg", criticalLow: 70,  normalLow: 90,   normalHigh: 140, criticalHigh: 180 },
    { field: "diastolicBP",     label: "Diastolic BP",       unit: "mmHg", criticalLow: 40,  normalLow: 60,   normalHigh: 90,  criticalHigh: 120 },
    { field: "heartRate",       label: "Heart Rate",         unit: "/min", criticalLow: 40,  normalLow: 60,   normalHigh: 100, criticalHigh: 150 },
    { field: "respiratoryRate", label: "Respiratory Rate",   unit: "/min", criticalLow: 8,   normalLow: 12,   normalHigh: 20,  criticalHigh: 30  },
    { field: "spo2",            label: "SpO₂",               unit: "%",    criticalLow: 85,  normalLow: 95,   normalHigh: 100                   },
    { field: "temperature",     label: "Temperature",        unit: "°C",   criticalLow: 35,  normalLow: 36.1, normalHigh: 37.5, criticalHigh: 40 },
];

export interface VitalAlert {
    label: string;
    value: number;
    unit: string;
    severity: VitalAlertSeverity;
    direction: "low" | "high";
    threshold: number;
}

export function checkVitalAlerts(values: Partial<Record<string, number>>): VitalAlert[] {
    const alerts: VitalAlert[] = [];
    for (const rule of VITAL_ALERT_RULES) {
        const value = values[rule.field];
        if (value === undefined) continue;
        if (rule.criticalLow !== undefined && value < rule.criticalLow) {
            alerts.push({ label: rule.label, value, unit: rule.unit, severity: "critical", direction: "low",  threshold: rule.criticalLow });
        } else if (rule.criticalHigh !== undefined && value > rule.criticalHigh) {
            alerts.push({ label: rule.label, value, unit: rule.unit, severity: "critical", direction: "high", threshold: rule.criticalHigh });
        } else if (rule.normalLow !== undefined && value < rule.normalLow) {
            alerts.push({ label: rule.label, value, unit: rule.unit, severity: "abnormal", direction: "low",  threshold: rule.normalLow });
        } else if (rule.normalHigh !== undefined && value > rule.normalHigh) {
            alerts.push({ label: rule.label, value, unit: rule.unit, severity: "abnormal", direction: "high", threshold: rule.normalHigh });
        }
    }
    return alerts;
}

export async function createVitals(input: VitalInput): Promise<void> {
    const defs: Array<{ code: string; display: string; unit: string; ucum: string; value: number | undefined }> = [
        { code: "8480-6",  display: "Systolic blood pressure", unit: "mmHg", ucum: "mm[Hg]", value: input.systolicBP },
        { code: "8462-4",  display: "Diastolic blood pressure", unit: "mmHg", ucum: "mm[Hg]", value: input.diastolicBP },
        { code: "8867-4",  display: "Heart rate",               unit: "/min", ucum: "/min",   value: input.heartRate },
        { code: "9279-1",  display: "Respiratory rate",         unit: "/min", ucum: "/min",   value: input.respiratoryRate },
        { code: "59408-5", display: "Oxygen saturation",        unit: "%",    ucum: "%",      value: input.spo2 },
        { code: "8310-5",  display: "Body temperature",         unit: "°C",   ucum: "Cel",    value: input.temperature },
        { code: "29463-7", display: "Body weight",              unit: "kg",   ucum: "kg",     value: input.weight },
        { code: "8302-2",  display: "Body height",              unit: "cm",   ucum: "cm",     value: input.height },
    ].filter((d): d is typeof d & { value: number } => d.value !== undefined && !isNaN(d.value));

    if (defs.length === 0) return;

    await Promise.all(defs.map(async (def) => {
        const obs: Observation = {
            resourceType: "Observation",
            identifier: [{ system: OBSERVATION_ID_SYSTEM, value: generateResourceId() }],
            status: "final",
            category: [{
                coding: [{
                    system: config.fhir.codeSystems.observationCategory,
                    code: "vital-signs",
                    display: "Vital Signs",
                }],
            }],
            code: {
                coding: [{ system: config.fhir.codeSystems.loinc, code: def.code, display: def.display }],
                text: def.display,
            },
            subject: { reference: `Patient/${input.patientId}` },
            ...(input.encounterId ? { encounter: { reference: `Encounter/${input.encounterId}` } } : {}),
            effectiveDateTime: input.effectiveDateTime,
            valueQuantity: {
                value: def.value,
                unit: def.unit,
                system: config.fhir.codeSystems.ucum,
                code: def.ucum,
            },
        };
        const res = await fhirRequest(`${getFhirBaseUrl()}/Observation`, {
            method: "POST",
            headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
            body: JSON.stringify(obs),
        });
        if (!res.ok) throw new Error(`Failed to record ${def.display}: ${res.status} ${await res.text()}`);
    }));
}

// ─── Non-vital observations (exam / social-history) ───────────────────────────

export interface NonVitalObservationInput {
    patientId:   string
    encounterId?: string
    category:    "exam" | "social-history"
    loincCode:   string
    display:     string
    valueString?: string
    valueCoding?: { system: string; code: string; display: string }
    effectiveDateTime: string
}

export async function createNonVitalObservation(input: NonVitalObservationInput): Promise<Observation> {
    const catCfg = input.category === "exam"
        ? config.fhir.observations.categories.exam
        : config.fhir.observations.categories.socialHistory

    const obs: Observation = {
        resourceType: "Observation",
        identifier: [{ system: config.fhir.identifierSystems.observation, value: generateResourceId() }],
        status: "final",
        category: [{ coding: [{ system: catCfg.system, code: catCfg.code, display: catCfg.display }] }],
        code: { coding: [{ system: config.fhir.codeSystems.loinc, code: input.loincCode, display: input.display }], text: input.display },
        subject: { reference: `Patient/${input.patientId}` },
        ...(input.encounterId ? { encounter: { reference: `Encounter/${input.encounterId}` } } : {}),
        effectiveDateTime: input.effectiveDateTime,
        ...(input.valueCoding
            ? { valueCodeableConcept: { coding: [input.valueCoding], text: input.valueCoding.display } }
            : { valueString: input.valueString ?? "" }),
    }

    const res = await fhirRequest(`${getFhirBaseUrl()}/Observation`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(obs),
    })
    if (!res.ok) throw new Error(`Failed to save observation: ${res.status} ${await res.text()}`)
    return res.json() as Promise<Observation>
}

export async function getEncounterNonVitalObservations(encounterId: string): Promise<Observation[]> {
    const [examBundle, socialBundle] = await Promise.all([
        fhirFetch<Bundle>("Observation", { encounter: `Encounter/${encounterId}`, category: "exam",           _count: "50", _sort: "-date" }),
        fhirFetch<Bundle>("Observation", { encounter: `Encounter/${encounterId}`, category: "social-history", _count: "50", _sort: "-date" }),
    ])
    const all = [
        ...(examBundle.entry ?? []).map((e) => e.resource as Observation),
        ...(socialBundle.entry ?? []).map((e) => e.resource as Observation),
    ]
    return all.filter((r): r is Observation => r?.resourceType === "Observation")
}

export async function deleteObservation(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Observation/${id}`, {
        method: "DELETE",
        headers: await authHeaders({ Accept: "application/fhir+json" }),
    })
    if (!res.ok) throw new Error(`Failed to delete observation: ${res.status}`)
}

export function observationDisplayValue(obs: Observation): string {
    if (obs.valueCodeableConcept?.text) return obs.valueCodeableConcept.text
    if (obs.valueCodeableConcept?.coding?.[0]?.display) return obs.valueCodeableConcept.coding[0].display
    if (obs.valueString) return obs.valueString
    if (obs.valueQuantity) {
        const { value, unit } = obs.valueQuantity
        return `${value ?? ""}${unit ? " " + unit : ""}`
    }
    return "—"
}

export interface NewEncounterInput {
    patientId: string;
    classCode: string;
    classDisplay: string;
    typeText?: string;
    serviceType?: string;
    reasonText?: string;
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

// ─── Allergies & intolerances ────────────────────────────────────────────────

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
        patientId: a.patient?.reference?.replace("Patient/", "") ?? "",
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
        patientId: c.subject?.reference?.replace("Patient/", "") ?? "",
        encounterId: c.encounter?.reference?.replace("Encounter/", "") ?? "",
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

// ─── SOAP notes ──────────────────────────────────────────────────────────────

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

export interface EncounterWithPatient {
    encounter: Encounter;
    patient?: Patient;
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

export interface EncounterSearchParams {
    patientQuery?: string;
    status?: string;
    classCode?: string;
    count?: number;
}

export async function searchEncounters(params: EncounterSearchParams = {}): Promise<EncounterWithPatient[]> {
    const {patientQuery, status, classCode, count = 50} = params;

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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
            return {encounter: enc, patient: pid ? patientMap.get(pid) : undefined};
        });
    } catch {
        return [];
    }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface NewAppointmentInput {
    patientId: string;
    start: string;
    durationMinutes: number;
    serviceType?: string;
    appointmentType?: string;
    reasonText?: string;
    participantIds?: string[];
}

export interface AppointmentWithPatient {
    appointment: Appointment;
    patient?: Patient;
}

export interface AppointmentSearchParams {
    patientQuery?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    count?: number;
}

const APPT_TYPE_MAP: Record<string, { code: string; display: string }> = {
    ROUTINE:   { code: "ROUTINE",   display: "Routine appointment" },
    WALKIN:    { code: "WALKIN",    display: "Walk-in" },
    CHECKUP:   { code: "CHECKUP",   display: "Check-up" },
    FOLLOWUP:  { code: "FOLLOWUP",  display: "Follow-up" },
    EMERGENCY: { code: "EMERGENCY", display: "Emergency" },
    URGENT:    { code: "URGENT",    display: "Urgent" },
};

function buildAppointmentBody(input: NewAppointmentInput, id?: string): Appointment {
    const startDate = new Date(input.start);
    const endDate = new Date(startDate.getTime() + input.durationMinutes * 60_000);
    const typeMeta = input.appointmentType ? APPT_TYPE_MAP[input.appointmentType] : undefined;
    return {
        resourceType: "Appointment",
        ...(id ? { id } : {}),
        status: "booked",
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        minutesDuration: input.durationMinutes,
        ...(input.serviceType ? { serviceType: [{ text: input.serviceType }] } : {}),
        ...(typeMeta ? {
            appointmentType: {
                coding: [{ system: config.fhir.codeSystems.appointmentType, ...typeMeta }],
                text: typeMeta.display,
            },
        } : {}),
        ...(input.reasonText ? { reasonCode: [{ text: input.reasonText }] } : {}),
        participant: [
            {
                actor: { reference: `Patient/${input.patientId}` },
                status: "accepted",
                type: [{ coding: [{ system: config.fhir.codeSystems.participationType, code: "SBJ", display: "Subject" }] }],
            },
            ...(input.participantIds ?? []).map((pid) => ({
                actor: { reference: `Practitioner/${pid}` },
                status: "accepted" as const,
            })),
        ],
    };
}

export async function getAppointment(id: string): Promise<Appointment> {
    return fhirFetch<Appointment>(`Appointment/${id}`);
}

export async function getPatientAppointments(patientId: string): Promise<Appointment[]> {
    const bundle = await fhirFetch<Bundle>("Appointment", {
        patient: patientId,
        _count: "50",
        _sort: "-date",
    });
    return (bundle.entry ?? [])
        .map((e) => e.resource as Appointment)
        .filter((r): r is Appointment => r?.resourceType === "Appointment");
}

export async function searchAppointments(params: AppointmentSearchParams = {}): Promise<AppointmentWithPatient[]> {
    const { patientQuery, status, dateFrom, dateTo, count = 50 } = params;

    const base = getFhirBaseUrl();
    const url = new URL(`${base}/Appointment`);
    url.searchParams.set("_sort", "-date");
    url.searchParams.set("_count", String(count));
    url.searchParams.set("_include", "Appointment:patient");
    if (status) url.searchParams.set("status", status);
    if (dateFrom) url.searchParams.append("date", `ge${dateFrom}`);
    if (dateTo)   url.searchParams.append("date", `le${dateTo}`);

    let knownPatients: Patient[] = [];
    if (patientQuery?.trim()) {
        knownPatients = await searchPatients(patientQuery.trim());
        if (knownPatients.length === 0) return [];
        url.searchParams.set(
            "patient",
            knownPatients.slice(0, 20).map((p) => `Patient/${p.id}`).join(",")
        );
    }

    try {
        const res = await fhirRequest(url.toString(), { headers: await authHeaders({ Accept: "application/fhir+json" }) });
        if (!res.ok) return [];
        const bundle: Bundle = await res.json();
        const patientMap = new Map<string, Patient>(
            knownPatients.filter((p) => p.id).map((p) => [p.id!, p])
        );
        const appointments: Appointment[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Patient" && r.id) patientMap.set(r.id, r as Patient);
            else if (r.resourceType === "Appointment") appointments.push(r as Appointment);
        }
        return appointments.map((appt) => {
            const pid = appt.participant
                ?.find((p) => p.actor?.reference?.startsWith("Patient/"))
                ?.actor?.reference?.slice(8);
            return { appointment: appt, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

export async function createAppointment(input: NewAppointmentInput): Promise<Appointment> {
    const body = buildAppointmentBody(input);
    body.identifier = [{ system: APPOINTMENT_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/Appointment`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create appointment: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Appointment>;
}

export async function rescheduleAppointment(id: string, start: string, durationMinutes: number): Promise<Appointment> {
    const existing = await getAppointment(id);
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
    const body: Appointment = {
        ...existing,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        minutesDuration: durationMinutes,
        status: "booked",
    };
    const res = await fhirRequest(`${getFhirBaseUrl()}/Appointment/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to reschedule appointment: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Appointment>;
}

export async function cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    const existing = await getAppointment(id);
    const body: Appointment = {
        ...existing,
        status: "cancelled",
        ...(reason?.trim() ? { cancelationReason: { text: reason.trim() } } : {}),
    };
    const res = await fhirRequest(`${getFhirBaseUrl()}/Appointment/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to cancel appointment: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Appointment>;
}

export function appointmentStatusColor(status: string): StatusColor {
    const map: Record<string, StatusColor> = {
        proposed:          "slate",
        pending:           "amber",
        booked:            "blue",
        arrived:           "indigo",
        fulfilled:         "green",
        cancelled:         "red",
        noshow:            "orange",
        "entered-in-error":"rose",
        "checked-in":      "teal",
        waitlist:          "purple",
    };
    return map[status] ?? "muted";
}

export async function checkInAppointment(id: string): Promise<Appointment> {
    const existing = await getAppointment(id);
    const body: Appointment = { ...existing, status: "checked-in" };
    const res = await fhirRequest(`${getFhirBaseUrl()}/Appointment/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to check in: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Appointment>;
}

export async function fulfillAppointment(id: string): Promise<Appointment> {
    const existing = await getAppointment(id);
    const body: Appointment = { ...existing, status: "fulfilled" };
    const res = await fhirRequest(`${getFhirBaseUrl()}/Appointment/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to fulfill appointment: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Appointment>;
}

export function getAppointmentPatientId(appt: Appointment): string | undefined {
    return appt.participant
        ?.find((p) => p.actor?.reference?.startsWith("Patient/"))
        ?.actor?.reference?.slice(8);
}

export function getAppointmentPractitionerRefs(appt: Appointment): string[] {
    return (appt.participant ?? [])
        .filter((p) => p.actor?.reference?.startsWith("Practitioner/"))
        .map((p) => p.actor!.reference!);
}

// ─── Discharge prescriptions ──────────────────────────────────────────────────

const EXT_RX_STRUCTURED = config.fhir.extensions.rxStructured;

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
        patientId:    m.subject?.reference?.replace("Patient/", "")   ?? "",
        encounterId:  m.encounter?.reference?.replace("Encounter/", "") ?? "",
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

// ─── Service requests (Lab & Radiology orders) ────────────────────────────────

const SR_CAT_LAB    = "108252007"; // Laboratory procedure
const SR_CAT_RAD    = "363679005"; // Imaging
const SR_CAT_PROC   = "71388002";  // Procedure

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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
            return { order, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

// ─── Inpatient Medication Orders & Administration (MAR) ───────────────────────

const INPT_CAT_CODE      = "inpatient";
const EXT_INPT_STRUCTURED = config.fhir.extensions.inpatientMed;

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
        patientId:   m.subject?.reference?.replace("Patient/", "")   ?? "",
        encounterId: m.encounter?.reference?.replace("Encounter/", "") ?? "",
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
        patientId:      p.subject?.reference?.replace("Patient/", "")   ?? "",
        encounterId:    p.encounter?.reference?.replace("Encounter/", "") ?? "",
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
        basedOnOrderId: p.basedOn?.[0]?.reference?.replace("ServiceRequest/", ""),
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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
            return { condition: cond, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
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
        patientId:      imm.patient?.reference?.replace("Patient/", "")    ?? "",
        encounterId:    imm.encounter?.reference?.replace("Encounter/", ""),
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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
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
        patientId:   f.subject?.reference?.replace("Patient/", "") ?? "",
        encounterId: f.encounter?.reference?.replace("Encounter/", ""),
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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
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
            const pid = ref?.startsWith("Patient/") ? ref.slice(8) : undefined;
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

const EXT_DIRECTIVE_NOTES     = config.fhir.extensions.directiveNotes

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
        ...(id ? { id } : {}),
        status: input.status as Consent["status"],
        scope: {
            coding: [{ system: config.fhir.codeSystems.consentScope, code: "adr", display: "Advanced Care Directive" }],
        },
        category: [{
            coding: [{ system: config.fhir.codeSystems.actCode, code: input.type, display: typeDisplay }],
            text: typeDisplay,
        }],
        patient: { reference: `Patient/${input.patientId}` },
        dateTime: input.date,
        ...(input.witness ? { performer: [{ display: input.witness }] } : {}),
        ...(input.notes ? {
            extension: [{ url: EXT_DIRECTIVE_NOTES, valueString: input.notes }],
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

// ─── Tasks / Worklist ─────────────────────────────────────────────────────────

const TASK_CAT_SYSTEM = config.fhir.codeSystems.taskCategory;

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
        patientId:   (t.for as { reference?: string })?.reference?.replace("Patient/", ""),
        patientName: (t.for as { display?: string })?.display,
        encounterId: t.encounter?.reference?.replace("Encounter/", ""),
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

const REFERRAL_CAT_SYSTEM     = config.fhir.codeSystems.referralCategory;
const REFERRAL_CAT_CODE       = "referral";
const REFERRAL_SPECIALTY_SYSTEM = config.fhir.codeSystems.referralSpecialty;

function isReferralResource(sr: ServiceRequest): boolean {
    return sr.category?.some(
        (c) => c.coding?.some(
            (cc) => cc.system === REFERRAL_CAT_SYSTEM && cc.code === REFERRAL_CAT_CODE
        )
    ) ?? false;
}

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
            const pid = subjectRef?.startsWith("Patient/") ? subjectRef.slice(8) : undefined;
            return { referral: ref, patient: pid ? patientMap.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

// ─── Practitioner ─────────────────────────────────────────────────────────────

const LICENCE_SYSTEM             = config.fhir.identifierSystems.licence;
const EXT_PRACTITIONER_SPECIALTY = config.fhir.extensions.practitionerSpecialty;

export const PRACTITIONER_SPECIALTIES = [
    "Cardiology", "Dermatology", "Emergency Medicine", "Endocrinology",
    "Family Medicine", "Gastroenterology", "General Surgery", "Hematology",
    "Internal Medicine", "Nephrology", "Neurology", "Neurosurgery",
    "Obstetrics & Gynecology", "Oncology", "Ophthalmology", "Orthopedics",
    "Otolaryngology", "Pediatrics", "Psychiatry", "Pulmonology",
    "Radiology", "Rheumatology", "Urology", "Vascular Surgery",
    "Anesthesiology", "Critical Care", "Infectious Disease", "Pathology",
    "Physiotherapy", "Dentistry", "Pharmacy", "Nursing", "Administration", "Other",
];

export const PRACTITIONER_QUALIFICATIONS = [
    "MD", "DO", "MBBS", "MBChB", "PhD", "MSc", "BSc",
    "RN", "NP", "BSN", "MSN",
    "PA", "PharmD", "DDS", "DMD",
    "PT", "OT", "MSW", "MBA", "MHA",
];

export interface NewPractitionerInput {
    active: boolean;
    givenName: string;
    familyName: string;
    gender?: "male" | "female" | "other" | "unknown";
    birthDate?: string;
    phone?: string;
    email?: string;
    licenceNumber?: string;
    qualificationText?: string;
    specialty?: string;
}

export interface PractitionerFormState {
    active: boolean;
    givenName: string;
    familyName: string;
    gender: string;
    birthDate: string;
    phone: string;
    email: string;
    licenceNumber: string;
    qualificationText: string;
    specialty: string;
}

function buildPractitionerBody(input: NewPractitionerInput, id?: string): Practitioner {
    const hasQualification = !!(input.licenceNumber?.trim() || input.qualificationText?.trim());
    return {
        resourceType: "Practitioner",
        ...(id ? { id } : {}),
        active: input.active,
        name: [{ use: "official" as const, family: input.familyName.trim(), given: [input.givenName.trim()] }],
        ...(input.gender ? { gender: input.gender } : {}),
        ...(input.birthDate ? { birthDate: input.birthDate } : {}),
        telecom: [
            ...(input.phone?.trim() ? [{ system: "phone" as const, value: input.phone.trim() }] : []),
            ...(input.email?.trim() ? [{ system: "email" as const, value: input.email.trim() }] : []),
        ],
        ...(hasQualification ? {
            qualification: [{
                ...(input.licenceNumber?.trim() ? { identifier: [{ system: LICENCE_SYSTEM, value: input.licenceNumber.trim() }] } : {}),
                code: { text: input.qualificationText?.trim() || "Qualification" },
            }],
        } : {}),
        ...(input.specialty?.trim() ? {
            extension: [{ url: EXT_PRACTITIONER_SPECIALTY, valueString: input.specialty.trim() }],
        } : {}),
    };
}

export async function createPractitioner(input: NewPractitionerInput): Promise<Practitioner> {
    const body = buildPractitionerBody(input);
    body.identifier = [{ system: PRACTITIONER_ID_SYSTEM, value: generateResourceId() }];
    const res = await fhirRequest(`${getFhirBaseUrl()}/Practitioner`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create practitioner: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Practitioner>;
}

export async function updatePractitioner(id: string, input: NewPractitionerInput): Promise<Practitioner> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Practitioner/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildPractitionerBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update practitioner: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Practitioner>;
}

export function getPractitionerLicence(p: Practitioner): string {
    return p.qualification?.[0]?.identifier?.[0]?.value ?? "";
}

export function getPractitionerSpecialty(p: Practitioner): string {
    return p.extension?.find((x) => x.url === EXT_PRACTITIONER_SPECIALTY)?.valueString ?? "";
}

export function getPractitionerQualText(p: Practitioner): string {
    return p.qualification?.[0]?.code?.text ?? "";
}

export function practitionerToFormState(p: Practitioner): PractitionerFormState {
    const name = p.name?.[0];
    return {
        active: p.active !== false,
        givenName: name?.given?.[0] ?? "",
        familyName: name?.family ?? "",
        gender: p.gender ?? "",
        birthDate: p.birthDate ?? "",
        phone: p.telecom?.find((t) => t.system === "phone")?.value ?? "",
        email: p.telecom?.find((t) => t.system === "email")?.value ?? "",
        licenceNumber: getPractitionerLicence(p),
        qualificationText: getPractitionerQualText(p),
        specialty: getPractitionerSpecialty(p),
    };
}

// ─── Organization ─────────────────────────────────────────────────────────────

const ORG_ID_SYSTEM   = config.fhir.identifierSystems.orgId;

export const ORG_TYPE_OPTIONS = [
    { code: "prov", display: "Healthcare Provider" },
    { code: "dept", display: "Hospital Department" },
    { code: "team", display: "Care Team" },
    { code: "other", display: "Other" },
] as const;

export interface NewOrganizationInput {
    active: boolean;
    name: string;
    type?: string;
    identifier?: string;
    partOfId?: string;
    phone?: string;
    email?: string;
    addressText?: string;
    addressCity?: string;
    addressCountry?: string;
}

export interface OrganizationFormState {
    active: boolean;
    name: string;
    type: string;
    identifier: string;
    partOfId: string;
    partOfName: string;
    phone: string;
    email: string;
    addressText: string;
    addressCity: string;
    addressCountry: string;
}

function buildOrganizationBody(input: NewOrganizationInput, id?: string): Organization {
    const typeOption = ORG_TYPE_OPTIONS.find((o) => o.code === input.type);
    return {
        resourceType: "Organization",
        ...(id ? { id } : {}),
        active: input.active,
        name: input.name.trim(),
        ...(input.type ? {
            type: [{ coding: [{ system: config.fhir.codeSystems.organizationType, code: input.type, display: typeOption?.display }], text: typeOption?.display ?? input.type }],
        } : {}),
        ...(input.identifier?.trim() ? { identifier: [{ system: ORG_ID_SYSTEM, value: input.identifier.trim() }] } : {}),
        ...(input.partOfId ? { partOf: { reference: `Organization/${input.partOfId}` } } : {}),
        telecom: [
            ...(input.phone?.trim() ? [{ system: "phone" as const, value: input.phone.trim() }] : []),
            ...(input.email?.trim() ? [{ system: "email" as const, value: input.email.trim() }] : []),
        ],
        ...((input.addressText || input.addressCity || input.addressCountry) ? {
            address: [{ text: input.addressText?.trim(), city: input.addressCity?.trim(), country: input.addressCountry?.trim() }],
        } : {}),
    };
}

export async function getOrganization(id: string): Promise<Organization> {
    return fhirFetch<Organization>(`Organization/${id}`);
}

export async function searchOrganizations(query?: string): Promise<Organization[]> {
    const params: Record<string, string> = { _count: "100", _sort: "name" };
    if (query?.trim()) params.name = query.trim();
    const bundle = await fhirFetch<Bundle>("Organization", params);
    return (bundle.entry ?? [])
        .map((e) => e.resource as Organization)
        .filter((r): r is Organization => r?.resourceType === "Organization");
}

export async function createOrganization(input: NewOrganizationInput): Promise<Organization> {
    const body = buildOrganizationBody(input);
    body.identifier = [
        { system: ORG_INTERNAL_ID_SYSTEM, value: generateResourceId() },
        ...(body.identifier ?? []),
    ];
    const res = await fhirRequest(`${getFhirBaseUrl()}/Organization`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create organization: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Organization>;
}

export async function updateOrganization(id: string, input: NewOrganizationInput): Promise<Organization> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Organization/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildOrganizationBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update organization: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Organization>;
}

export function organizationDisplayName(o: Organization): string {
    return o.name ?? "Unknown Organization";
}

export function organizationTypeLabel(o: Organization): string {
    const code = o.type?.[0]?.coding?.[0]?.code;
    return (ORG_TYPE_OPTIONS as readonly { code: string; display: string }[]).find((opt) => opt.code === code)?.display ?? o.type?.[0]?.text ?? "";
}

export function organizationToFormState(o: Organization): OrganizationFormState {
    return {
        active: o.active !== false,
        name: o.name ?? "",
        type: o.type?.[0]?.coding?.[0]?.code ?? "",
        identifier: o.identifier?.[0]?.value ?? "",
        partOfId: o.partOf?.reference?.replace("Organization/", "") ?? "",
        partOfName: "",
        phone: o.telecom?.find((t) => t.system === "phone")?.value ?? "",
        email: o.telecom?.find((t) => t.system === "email")?.value ?? "",
        addressText: o.address?.[0]?.text ?? "",
        addressCity: o.address?.[0]?.city ?? "",
        addressCountry: o.address?.[0]?.country ?? "",
    };
}

// ─── PractitionerRole ─────────────────────────────────────────────────────────

export const ROLE_CODE_OPTIONS = [
    { code: "doctor",       display: "Doctor" },
    { code: "nurse",        display: "Nurse" },
    { code: "pharmacist",   display: "Pharmacist" },
    { code: "admin",        display: "Administrator" },
    { code: "receptionist", display: "Receptionist" },
    { code: "allied",       display: "Allied Health" },
    { code: "resident",     display: "Resident" },
    { code: "intern",       display: "Intern" },
] as const;

export interface NewPractitionerRoleInput {
    practitionerId: string;
    organizationId: string;
    roleCode?: string;
    specialty?: string;
}

export async function getPractitionerRoles(
    practitionerId: string,
): Promise<{ role: PractitionerRole; org?: Organization }[]> {
    try {
        const bundle = await fhirFetch<Bundle>("PractitionerRole", {
            practitioner: `Practitioner/${practitionerId}`,
            "_include": "PractitionerRole:organization",
            _count: "50",
        });
        const orgs = new Map<string, Organization>();
        const roles: PractitionerRole[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Organization" && r.id) orgs.set(r.id, r as Organization);
            else if (r.resourceType === "PractitionerRole") roles.push(r as PractitionerRole);
        }
        return roles.map((role) => {
            const ref = role.organization?.reference;
            const orgId = ref?.startsWith("Organization/") ? ref.slice(13) : undefined;
            return { role, org: orgId ? orgs.get(orgId) : undefined };
        });
    } catch {
        return [];
    }
}

export async function getOrganizationPractitioners(
    orgId: string,
): Promise<{ role: PractitionerRole; practitioner?: Practitioner }[]> {
    try {
        const bundle = await fhirFetch<Bundle>("PractitionerRole", {
            organization: `Organization/${orgId}`,
            "_include": "PractitionerRole:practitioner",
            _count: "100",
        });
        const practs = new Map<string, Practitioner>();
        const roles: PractitionerRole[] = [];
        for (const entry of bundle.entry ?? []) {
            const r = entry.resource;
            if (!r) continue;
            if (r.resourceType === "Practitioner" && r.id) practs.set(r.id, r as Practitioner);
            else if (r.resourceType === "PractitionerRole") roles.push(r as PractitionerRole);
        }
        return roles.map((role) => {
            const ref = role.practitioner?.reference;
            const pid = ref?.startsWith("Practitioner/") ? ref.slice(13) : undefined;
            return { role, practitioner: pid ? practs.get(pid) : undefined };
        });
    } catch {
        return [];
    }
}

export async function createPractitionerRole(input: NewPractitionerRoleInput): Promise<PractitionerRole> {
    const roleOption = (ROLE_CODE_OPTIONS as readonly { code: string; display: string }[]).find((r) => r.code === input.roleCode);
    const body: PractitionerRole = {
        resourceType: "PractitionerRole",
        identifier: [{ system: PRACTITIONER_ROLE_ID_SYSTEM, value: generateResourceId() }],
        active: true,
        practitioner: { reference: `Practitioner/${input.practitionerId}` },
        organization: { reference: `Organization/${input.organizationId}` },
        ...(input.roleCode ? {
            code: [{ coding: [{ system: config.fhir.codeSystems.practitionerRoleCode, code: input.roleCode, display: roleOption?.display ?? input.roleCode }], text: roleOption?.display ?? input.roleCode }],
        } : {}),
        ...(input.specialty ? { specialty: [{ text: input.specialty }] } : {}),
    };
    const res = await fhirRequest(`${getFhirBaseUrl()}/PractitionerRole`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create practitioner role: ${res.status} ${await res.text()}`);
    return res.json() as Promise<PractitionerRole>;
}

export async function deletePractitionerRole(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/PractitionerRole/${id}`, {
        method: "DELETE",
        headers: await authHeaders({}),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete practitioner role: ${res.status}`);
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
