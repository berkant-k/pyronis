import type { AppointmentSearchParams } from "@/lib/fhir/appointments";
import type { EncounterSearchParams } from "@/lib/fhir/encounters";

export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    counts: () => [...queryKeys.dashboard.all, "counts"] as const,
    recentPatients: (limit: number) =>
      [...queryKeys.dashboard.all, "recent-patients", limit] as const,
    recentEncounters: (limit: number) =>
      [...queryKeys.dashboard.all, "recent-encounters", limit] as const,
  },
  patients: {
    all: ["patients"] as const,
    search: (query: string) => [...queryKeys.patients.all, "search", query] as const,
    detail: (id: string) => [...queryKeys.patients.all, "detail", id] as const,
    encounters: (id: string) => [...queryKeys.patients.all, id, "encounters"] as const,
    observations: (id: string) => [...queryKeys.patients.all, id, "observations"] as const,
    conditions: (id: string) => [...queryKeys.patients.all, id, "conditions"] as const,
    medications: (id: string) => [...queryKeys.patients.all, id, "medications"] as const,
    allergies: (id: string) => [...queryKeys.patients.all, id, "allergies"] as const,
    appointments: (id: string) => [...queryKeys.patients.all, id, "appointments"] as const,
    orders: (id: string) => [...queryKeys.patients.all, id, "orders"] as const,
    immunizations: (id: string) => [...queryKeys.patients.all, id, "immunizations"] as const,
    flags: (id: string) => [...queryKeys.patients.all, id, "flags"] as const,
    reports: (id: string) => [...queryKeys.patients.all, id, "reports"] as const,
    familyHistory: (id: string) => [...queryKeys.patients.all, id, "family-history"] as const,
    relatedPersons: (id: string) => [...queryKeys.patients.all, id, "related-persons"] as const,
    directives: (id: string) => [...queryKeys.patients.all, id, "directives"] as const,
    tasks: (id: string) => [...queryKeys.patients.all, id, "tasks"] as const,
    documents: (id: string) => [...queryKeys.patients.all, id, "documents"] as const,
    referrals: (id: string) => [...queryKeys.patients.all, id, "referrals"] as const,
    questionnaireResponses: (id: string) =>
      [...queryKeys.patients.all, id, "questionnaire-responses"] as const,
  },
  encounters: {
    all: ["encounters"] as const,
    search: (params: EncounterSearchParams) =>
      [...queryKeys.encounters.all, "search", params] as const,
    detail: (id: string) => [...queryKeys.encounters.all, "detail", id] as const,
  },
  appointments: {
    all: ["appointments"] as const,
    search: (params: AppointmentSearchParams) =>
      [...queryKeys.appointments.all, "search", params] as const,
    calendar: (dateFrom: string, dateTo: string) =>
      [...queryKeys.appointments.all, "calendar", dateFrom, dateTo] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (limit: number) => [...queryKeys.notifications.all, "list", limit] as const,
  },
  practitioners: {
    all: ["practitioners"] as const,
    search: (query: string) => [...queryKeys.practitioners.all, "search", query] as const,
  },
} as const;
