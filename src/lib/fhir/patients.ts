import type {
    AllergyIntolerance,
    Bundle,
    Condition,
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
    EXT_LANGUAGE,
    EXT_NAME_LANGUAGE,
    EXT_NATIONALITY,
    EXT_VIP,
    EXT_INSURANCE,
    EXT_ADMIN_NOTES,
    EXT_PERSON_TYPE,
    EXT_CADAVERIC_DONOR,
    EXT_ETHNICITY,
    EXT_BIRTH_PLACE,
    EXT_ADDR_BUILDING,
    EXT_ADDR_STREET,
    EXT_ADDR_UNIT,
    EXT_ADDR_ZONE,
    EXT_ADDR_LANGUAGE,
    MANAGING_ORG_IDENTIFIER,
    QID_SYSTEM,
    PERSON_TYPE_OPTIONS,
    ETHNICITY_OPTIONS,
} from "./client";

const generateMRN = customAlphabet(config.idGeneration.alphabet, config.idGeneration.maxLength);

const MRN_SYSTEM     = config.fhir.identifierSystems.mrn;
const PASSPORT_SYSTEM = config.fhir.identifierSystems.passport;
const OBSERVATION_ID_SYSTEM = config.fhir.identifierSystems.observation;
const CS_IDENTIFIER_TYPE = config.fhir.codeSystems.identifierType;
const CS_COUNTRY_CODE    = config.fhir.codeSystems.countryCode;
const CS_PERSON_TYPE     = config.fhir.codeSystems.personType;
const CS_LANGUAGE        = config.fhir.codeSystems.language;

export function bundleToPatients(bundle: Bundle): Patient[] {
    return (bundle.entry ?? [])
        .map((e) => e.resource as Patient)
        .filter((r): r is Patient => r?.resourceType === "Patient");
}

export async function generateNextMRN(): Promise<string> {
    return generateMRN();
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

export async function searchPatients(query: string): Promise<Patient[]> {
    const q = query.trim();
    if (!q) return [];

    const normalized = /^MRN?-/i.test(q) ? q.replace(/^MRN?-/i, "") : q;

    const isAllDigits = /^\d+$/.test(normalized);
    const hasLetters = /[a-zA-Z]/.test(normalized);
    const hasSpaces = normalized.includes(" ");
    const digitOnly = normalized.replace(/\D/g, "");
    const isPhoneLike = !hasLetters && digitOnly.length >= 7;
    const isIdentLike = isAllDigits || (!hasSpaces && normalized.length >= 2 && normalized.length <= 20);

    const searches: Promise<Patient[]>[] = [];

    if (hasLetters || hasSpaces) {
        searches.push(
            fhirFetch<Bundle>("Patient", {name: normalized, _count: "20", _sort: "family"})
                .then(bundleToPatients)
                .catch(() => [])
        );
    }

    if (isIdentLike) {
        searches.push(
            fhirFetch<Bundle>("Patient", {identifier: normalized, _count: "20"})
                .then(bundleToPatients)
                .catch(() => [])
        );
    }

    if (isPhoneLike) {
        searches.push(
            fhirFetch<Bundle>("Patient", {phone: digitOnly, _count: "20"})
                .then(bundleToPatients)
                .catch(() => [])
        );
    }

    if (searches.length === 0) {
        searches.push(
            fhirFetch<Bundle>("Patient", {name: q, _count: "20", _sort: "family"})
                .then(bundleToPatients)
                .catch(() => [])
        );
    }

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

export interface NewPatientInput {
    mrn: string;
    active: boolean;
    vip: boolean;
    givenEn: string;
    middleEn?: string;
    familyEn: string;
    givenAr?: string;
    middleAr?: string;
    familyAr?: string;
    qid: string;
    passport?: string;
    birthDate: string;
    nationality: string;
    nationalityDisplay: string;
    gender: "male" | "female" | "other" | "unknown";
    personType?: string;
    ethnicity?: string;
    deceased?: boolean;
    deceasedDateTime?: string;
    birthPlaceCountry?: string;
    birthPlaceCity?: string;
    birthPlaceText?: string;
    insuranceCompany?: string;
    addressCountry?: string;
    addressCity?: string;
    addressText?: string;
    addressBuildingNumber?: string;
    addressStreetNumber?: string;
    addressUnit?: string;
    addressZone?: string;
    addressLang?: string;
    phone?: string;
    email?: string;
    preferredLanguage?: string;
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
    const telecom: Patient["telecom"] =
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
    const existingMrn = existing.identifier?.find((i) => i.system === MRN_SYSTEM)?.value;
    const mrn = input.mrn || existingMrn || await generateNextMRN();
    const body = buildPatientBody({ ...input, mrn }, id);
    if (existing.photo?.length) body.photo = existing.photo;
    const res = await fhirRequest(`${getFhirBaseUrl()}/Patient/${id}`, {
        method: "PUT",
        headers: await authHeaders({"Content-Type": "application/fhir+json", Accept: "application/fhir+json","prefer":"return=representation"}),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to update patient: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Patient>;
}

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
