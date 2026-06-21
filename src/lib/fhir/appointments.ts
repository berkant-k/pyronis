import type {
    Appointment,
    Bundle,
    Patient,
} from "@medplum/fhirtypes";
import config from "../config.json";
import { authHeaders } from "../auth";
import {
    fhirRequest,
    fhirFetch,
    getFhirBaseUrl,
    generateResourceId,
    parseFhirId,
    parseFhirReference,
} from "./client";
import { searchPatients } from "./patients";
import type { StatusColor } from "@/components/ui/StatusPill";

const APPOINTMENT_ID_SYSTEM = config.fhir.identifierSystems.appointment;

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
            const pid = parseFhirId(
                appt.participant?.find((p) => parseFhirReference(p.actor?.reference)?.resourceType === "Patient")?.actor?.reference,
                "Patient"
            );
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
    return parseFhirId(
        appt.participant?.find((p) => parseFhirReference(p.actor?.reference)?.resourceType === "Patient")?.actor?.reference,
        "Patient"
    );
}

export function getAppointmentPractitionerRefs(appt: Appointment): string[] {
    return (appt.participant ?? [])
        .filter((p) => parseFhirReference(p.actor?.reference)?.resourceType === "Practitioner")
        .map((p) => p.actor!.reference!);
}
