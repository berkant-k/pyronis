import type {
    Bundle,
    Device,
    HealthcareService,
    Location,
    Organization,
    Practitioner,
    PractitionerRole,
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

const PRACTITIONER_ID_SYSTEM      = config.fhir.identifierSystems.practitioner;
const ORG_INTERNAL_ID_SYSTEM      = config.fhir.identifierSystems.organization;
const PRACTITIONER_ROLE_ID_SYSTEM = config.fhir.identifierSystems.practitionerRole;
const ORG_ID_SYSTEM               = config.fhir.identifierSystems.orgId;
const LOCATION_ID_SYSTEM          = config.fhir.identifierSystems.location;
const HS_ID_SYSTEM                = config.fhir.identifierSystems.healthcareService;
const DEVICE_ID_SYSTEM            = config.fhir.identifierSystems.device;
const LICENCE_SYSTEM              = config.fhir.identifierSystems.licence;
const EXT_PRACTITIONER_SPECIALTY  = config.fhir.extensions.practitionerSpecialty;

// ─── Practitioner ─────────────────────────────────────────────────────────────

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
        partOfId: parseFhirId(o.partOf?.reference, "Organization") ?? "",
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
            const orgId = parseFhirId(ref, "Organization");
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
            const pid = parseFhirId(ref, "Practitioner");
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

// ─── Location ─────────────────────────────────────────────────────────────────

export interface NewLocationInput {
    name: string;
    identifier?: string;
    description?: string;
    status?: "active" | "suspended" | "inactive";
    physicalType?: string;
    type?: string;
    partOfId?: string;
    managingOrganizationId?: string;
    addressText?: string;
    addressCity?: string;
    addressCountry?: string;
    phone?: string;
}

export interface LocationFormState {
    identifier: string;
    name: string;
    description: string;
    status: string;
    physicalType: string;
    type: string;
    partOfId: string;
    partOfName: string;
    managingOrganizationId: string;
    managingOrganizationName: string;
    addressText: string;
    addressCity: string;
    addressCountry: string;
    phone: string;
}

function buildLocationBody(input: NewLocationInput, id?: string): Location {
    const physOpt = config.fhir.options.locationPhysicalType.find((t) => t.code === input.physicalType);
    const typeOpt = config.fhir.options.locationType.find((t) => t.code === input.type);
    return {
        resourceType: "Location",
        ...(id ? { id } : {}),
        name: input.name.trim(),
        status: (input.status ?? "active") as Location["status"],
        ...(input.identifier?.trim() ? { identifier: [{ system: LOCATION_ID_SYSTEM, value: input.identifier.trim() }] } : {}),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.physicalType ? {
            physicalType: {
                coding: [{ system: config.fhir.codeSystems.locationPhysicalType, code: input.physicalType, display: physOpt?.display }],
                text: physOpt?.display ?? input.physicalType,
            },
        } : {}),
        ...(input.type ? {
            type: [{
                coding: [{ system: config.fhir.codeSystems.locationType, code: input.type, display: typeOpt?.display }],
                text: typeOpt?.display ?? input.type,
            }],
        } : {}),
        ...(input.partOfId ? { partOf: { reference: `Location/${input.partOfId}` } } : {}),
        ...(input.managingOrganizationId ? { managingOrganization: { reference: `Organization/${input.managingOrganizationId}` } } : {}),
        ...(input.phone?.trim() ? { telecom: [{ system: "phone" as const, value: input.phone.trim() }] } : {}),
        ...((input.addressText || input.addressCity || input.addressCountry) ? {
            address: {
                text: input.addressText?.trim(),
                city: input.addressCity?.trim(),
                country: input.addressCountry?.trim(),
            },
        } : {}),
    };
}

export async function getLocation(id: string): Promise<Location> {
    return fhirFetch<Location>(`Location/${id}`);
}

export async function searchLocations(query?: string): Promise<Location[]> {
    const params: Record<string, string> = { _count: "100", _sort: "name" };
    if (query?.trim()) params.name = query.trim();
    const bundle = await fhirFetch<Bundle>("Location", params);
    return (bundle.entry ?? [])
        .map((e) => e.resource as Location)
        .filter((r): r is Location => r?.resourceType === "Location");
}

export async function createLocation(input: NewLocationInput): Promise<Location> {
    const body = buildLocationBody(input);
    const res = await fhirRequest(`${getFhirBaseUrl()}/Location`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create location: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Location>;
}

export async function updateLocation(id: string, input: NewLocationInput): Promise<Location> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Location/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildLocationBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update location: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Location>;
}

export async function deleteLocation(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Location/${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete location: ${res.status}`);
}

export function locationDisplayName(loc: Location): string {
    return loc.name ?? "Unknown Location";
}

export function locationPhysicalTypeLabel(loc: Location): string | null {
    const code = loc.physicalType?.coding?.[0]?.code;
    if (!code) return null;
    return config.fhir.options.locationPhysicalType.find((t) => t.code === code)?.display
        ?? loc.physicalType?.text
        ?? code;
}

export function locationTypeLabel(loc: Location): string | null {
    const code = loc.type?.[0]?.coding?.[0]?.code;
    if (!code) return null;
    return config.fhir.options.locationType.find((t) => t.code === code)?.display
        ?? loc.type?.[0]?.text
        ?? code;
}

export function locationStatusColor(status: string | undefined): StatusColor {
    const map: Record<string, StatusColor> = {
        active:    "green",
        suspended: "amber",
        inactive:  "slate",
    };
    return map[status ?? ""] ?? "muted";
}

export function locationToFormState(loc: Location): LocationFormState {
    return {
        identifier:              loc.identifier?.find((i) => i.system === LOCATION_ID_SYSTEM)?.value ?? loc.identifier?.[0]?.value ?? "",
        name:                    loc.name ?? "",
        description:             loc.description ?? "",
        status:                  loc.status ?? "active",
        physicalType:            loc.physicalType?.coding?.[0]?.code ?? "",
        type:                    loc.type?.[0]?.coding?.[0]?.code ?? "",
        partOfId:                parseFhirId(loc.partOf?.reference, "Location") ?? "",
        partOfName:              loc.partOf?.display ?? "",
        managingOrganizationId:  parseFhirId(loc.managingOrganization?.reference, "Organization") ?? "",
        managingOrganizationName: loc.managingOrganization?.display ?? "",
        addressText:             loc.address?.text ?? "",
        addressCity:             loc.address?.city ?? "",
        addressCountry:          loc.address?.country ?? "",
        phone:                   loc.telecom?.find((t) => t.system === "phone")?.value ?? "",
    };
}

// ─── HealthcareService ────────────────────────────────────────────────────────

export interface NewHealthcareServiceInput {
    name: string;
    identifier?: string;
    active: boolean;
    comment?: string;
    category?: string;
    specialty?: string;
    providedByOrgId?: string;
    locationId?: string;
    phone?: string;
    availDays?: string[];
    availStartTime?: string;
    availEndTime?: string;
    availabilityExceptions?: string;
}

export interface HealthcareServiceFormState {
    name: string;
    identifier: string;
    active: boolean;
    comment: string;
    category: string;
    specialty: string;
    providedByOrgId: string;
    providedByOrgName: string;
    locationId: string;
    locationName: string;
    phone: string;
    availDays: string[];
    availStartTime: string;
    availEndTime: string;
    availabilityExceptions: string;
}

function buildHealthcareServiceBody(input: NewHealthcareServiceInput, id?: string): HealthcareService {
    const catOpt = config.fhir.options.healthcareServiceCategory.find((c) => c.code === input.category);
    return {
        resourceType: "HealthcareService",
        ...(id ? { id } : {}),
        active: input.active,
        name: input.name.trim(),
        ...(input.identifier?.trim() ? { identifier: [{ system: HS_ID_SYSTEM, value: input.identifier.trim() }] } : {}),
        ...(input.comment?.trim() ? { comment: input.comment.trim() } : {}),
        ...(input.category ? {
            category: [{
                coding: [{ system: config.fhir.codeSystems.healthcareServiceCategory, code: input.category, display: catOpt?.display }],
                text: catOpt?.display ?? input.category,
            }],
        } : {}),
        ...(input.specialty ? { specialty: [{ text: input.specialty }] } : {}),
        ...(input.providedByOrgId ? { providedBy: { reference: `Organization/${input.providedByOrgId}` } } : {}),
        ...(input.locationId ? { location: [{ reference: `Location/${input.locationId}` }] } : {}),
        ...(input.phone?.trim() ? { telecom: [{ system: "phone" as const, value: input.phone.trim() }] } : {}),
        ...((input.availDays?.length || input.availStartTime || input.availEndTime) ? {
            availableTime: [{
                ...(input.availDays?.length ? { daysOfWeek: input.availDays as ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] } : {}),
                ...(input.availStartTime ? { availableStartTime: input.availStartTime } : {}),
                ...(input.availEndTime ? { availableEndTime: input.availEndTime } : {}),
            }],
        } : {}),
        ...(input.availabilityExceptions?.trim() ? { availabilityExceptions: input.availabilityExceptions.trim() } : {}),
    };
}

export async function getHealthcareService(id: string): Promise<HealthcareService> {
    return fhirFetch<HealthcareService>(`HealthcareService/${id}`);
}

export async function searchHealthcareServices(query?: string): Promise<HealthcareService[]> {
    const params: Record<string, string> = { _count: "100", _sort: "name" };
    if (query?.trim()) params.name = query.trim();
    const bundle = await fhirFetch<Bundle>("HealthcareService", params);
    return (bundle.entry ?? [])
        .map((e) => e.resource as HealthcareService)
        .filter((r): r is HealthcareService => r?.resourceType === "HealthcareService");
}

export async function createHealthcareService(input: NewHealthcareServiceInput): Promise<HealthcareService> {
    const body = buildHealthcareServiceBody(input);
    const res = await fhirRequest(`${getFhirBaseUrl()}/HealthcareService`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create healthcare service: ${res.status} ${await res.text()}`);
    return res.json() as Promise<HealthcareService>;
}

export async function updateHealthcareService(id: string, input: NewHealthcareServiceInput): Promise<HealthcareService> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/HealthcareService/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildHealthcareServiceBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update healthcare service: ${res.status} ${await res.text()}`);
    return res.json() as Promise<HealthcareService>;
}

export async function deleteHealthcareService(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/HealthcareService/${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete healthcare service: ${res.status}`);
}

export function healthcareServiceDisplayName(svc: HealthcareService): string {
    return svc.name ?? "Unknown Service";
}

export function healthcareServiceCategoryLabel(svc: HealthcareService): string | null {
    const code = svc.category?.[0]?.coding?.[0]?.code;
    if (!code) return null;
    return config.fhir.options.healthcareServiceCategory.find((c) => c.code === code)?.display
        ?? svc.category?.[0]?.text
        ?? code;
}

export function healthcareServiceToFormState(svc: HealthcareService): HealthcareServiceFormState {
    const avail = svc.availableTime?.[0];
    return {
        name:                   svc.name ?? "",
        identifier:             svc.identifier?.find((i) => i.system === HS_ID_SYSTEM)?.value ?? svc.identifier?.[0]?.value ?? "",
        active:                 svc.active !== false,
        comment:                svc.comment ?? "",
        category:               svc.category?.[0]?.coding?.[0]?.code ?? "",
        specialty:              svc.specialty?.[0]?.text ?? "",
        providedByOrgId:        parseFhirId(svc.providedBy?.reference, "Organization") ?? "",
        providedByOrgName:      svc.providedBy?.display ?? "",
        locationId:             parseFhirId(svc.location?.[0]?.reference, "Location") ?? "",
        locationName:           svc.location?.[0]?.display ?? "",
        phone:                  svc.telecom?.find((t) => t.system === "phone")?.value ?? "",
        availDays:              avail?.daysOfWeek ?? [],
        availStartTime:         avail?.availableStartTime ?? "",
        availEndTime:           avail?.availableEndTime ?? "",
        availabilityExceptions: svc.availabilityExceptions ?? "",
    };
}

// ─── Device ───────────────────────────────────────────────────────────────────

export interface NewDeviceInput {
    name: string;
    identifier?: string;
    status?: "active" | "inactive" | "entered-in-error" | "unknown";
    type?: string;
    manufacturer?: string;
    modelNumber?: string;
    serialNumber?: string;
    udi?: string;
    ownerOrgId?: string;
    locationId?: string;
    note?: string;
}

export interface DeviceFormState {
    name: string;
    identifier: string;
    status: string;
    type: string;
    manufacturer: string;
    modelNumber: string;
    serialNumber: string;
    udi: string;
    ownerOrgId: string;
    ownerOrgName: string;
    locationId: string;
    locationName: string;
    note: string;
}

function buildDeviceBody(input: NewDeviceInput, id?: string): Device {
    const typeOpt = config.fhir.options.deviceType.find((t) => t.code === input.type);
    return {
        resourceType: "Device",
        ...(id ? { id } : {}),
        status: (input.status ?? "active") as Device["status"],
        deviceName: [{ name: input.name.trim(), type: "user-friendly-name" as const }],
        ...(input.identifier?.trim() ? { identifier: [{ system: DEVICE_ID_SYSTEM, value: input.identifier.trim() }] } : {}),
        ...(input.type ? {
            type: {
                coding: [{ system: config.fhir.codeSystems.deviceType, code: input.type, display: typeOpt?.display }],
                text: typeOpt?.display ?? input.type,
            },
        } : {}),
        ...(input.manufacturer?.trim() ? { manufacturer: input.manufacturer.trim() } : {}),
        ...(input.modelNumber?.trim() ? { modelNumber: input.modelNumber.trim() } : {}),
        ...(input.serialNumber?.trim() ? { serialNumber: input.serialNumber.trim() } : {}),
        ...(input.udi?.trim() ? { udiCarrier: [{ carrierHRF: input.udi.trim() }] } : {}),
        ...(input.ownerOrgId ? { owner: { reference: `Organization/${input.ownerOrgId}` } } : {}),
        ...(input.locationId ? { location: { reference: `Location/${input.locationId}` } } : {}),
        ...(input.note?.trim() ? { note: [{ text: input.note.trim() }] } : {}),
    };
}

export async function getDevice(id: string): Promise<Device> {
    return fhirFetch<Device>(`Device/${id}`);
}

export async function searchDevices(query?: string): Promise<Device[]> {
    const params: Record<string, string> = { _count: "100", _sort: "_lastUpdated" };
    if (query?.trim()) params["device-name"] = query.trim();
    const bundle = await fhirFetch<Bundle>("Device", params);
    return (bundle.entry ?? [])
        .map((e) => e.resource as Device)
        .filter((r): r is Device => r?.resourceType === "Device");
}

export async function createDevice(input: NewDeviceInput): Promise<Device> {
    const body = buildDeviceBody(input);
    const res = await fhirRequest(`${getFhirBaseUrl()}/Device`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create device: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Device>;
}

export async function updateDevice(id: string, input: NewDeviceInput): Promise<Device> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Device/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildDeviceBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update device: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Device>;
}

export async function deleteDevice(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Device/${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete device: ${res.status}`);
}

export function deviceDisplayName(dev: Device): string {
    return dev.deviceName?.find((n) => n.type === "user-friendly-name")?.name
        ?? dev.deviceName?.[0]?.name
        ?? "Unknown Device";
}

export function deviceTypeLabel(dev: Device): string | null {
    const code = dev.type?.coding?.[0]?.code;
    if (!code) return null;
    return config.fhir.options.deviceType.find((t) => t.code === code)?.display
        ?? dev.type?.text
        ?? code;
}

export function deviceStatusColor(status: string | undefined): StatusColor {
    const map: Record<string, StatusColor> = {
        active:            "green",
        inactive:          "slate",
        "entered-in-error":"red",
        unknown:           "muted",
    };
    return map[status ?? ""] ?? "muted";
}

export function deviceToFormState(dev: Device): DeviceFormState {
    return {
        name:         deviceDisplayName(dev),
        identifier:   dev.identifier?.find((i) => i.system === DEVICE_ID_SYSTEM)?.value ?? dev.identifier?.[0]?.value ?? "",
        status:       dev.status ?? "active",
        type:         dev.type?.coding?.[0]?.code ?? "",
        manufacturer: dev.manufacturer ?? "",
        modelNumber:  dev.modelNumber ?? "",
        serialNumber: dev.serialNumber ?? "",
        udi:          dev.udiCarrier?.[0]?.carrierHRF ?? "",
        ownerOrgId:   parseFhirId(dev.owner?.reference, "Organization") ?? "",
        ownerOrgName: dev.owner?.display ?? "",
        locationId:   parseFhirId(dev.location?.reference, "Location") ?? "",
        locationName: dev.location?.display ?? "",
        note:         dev.note?.[0]?.text ?? "",
    };
}
