"use client";

import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  searchPatients,
  getPatient,
  getPatientEncounters,
  getPatientObservations,
  getPatientConditions,
  getPatientMedications,
  getPatientAllergies,
  getPatientAppointments,
  getPatientOrders,
  getPatientImmunizations,
  getPatientFlags,
  getPatientDiagnosticReports,
  getPatientFamilyHistory,
  getPatientRelatedPersons,
  getPatientAdvanceDirectives,
  getPatientTasks,
  getPatientDocuments,
  getPatientReferrals,
  getPatientQuestionnaireResponses,
  searchEncounters,
  searchAppointments,
  searchPractitioners,
  getDashboardCounts,
  getRecentPatients,
  getRecentEncountersWithPatients,
  getNotificationBundles,
  type EncounterSearchParams,
  type AppointmentSearchParams,
  type DashboardCounts,
  type EncounterWithPatient,
  type AppointmentWithPatient,
} from "@/lib/fhir-client";
import type { Patient, Practitioner, Bundle } from "@medplum/fhirtypes";
import { fhirQueryDefaults } from "./config";
import { queryKeys } from "./query-keys";
import { useDebouncedValue } from "./use-debounced-value";
import {
  invalidateAllPatientQueries,
  invalidateDashboard,
  invalidatePatientSearch,
} from "./invalidate";

const defaults = fhirQueryDefaults;

// ─── Search hooks ─────────────────────────────────────────────────────────────

export function usePatientSearch(query: string, debounceMs = 400) {
  const debounced = useDebouncedValue(query.trim(), debounceMs);
  const enabled = debounced.length >= 2;

  return useQuery({
    queryKey: queryKeys.patients.search(debounced),
    queryFn: () => searchPatients(debounced),
    enabled,
    ...defaults,
  });
}

export function useEncounterSearch(params: EncounterSearchParams, debounceMs = 400) {
  const debouncedPatient = useDebouncedValue(params.patientQuery ?? "", debounceMs);
  const debouncedPractitioner = useDebouncedValue(params.practitionerQuery ?? "", debounceMs);

  const searchParams: EncounterSearchParams = {
    ...params,
    patientQuery: debouncedPatient.trim() || undefined,
    practitionerQuery: debouncedPractitioner.trim() || undefined,
  };

  return useQuery({
    queryKey: queryKeys.encounters.search(searchParams),
    queryFn: () => searchEncounters(searchParams),
    ...defaults,
  });
}

export function useAppointmentSearch(
  params: AppointmentSearchParams,
  debounceMs = 400,
  refreshKey = 0,
) {
  const debouncedPatient = useDebouncedValue(params.patientQuery ?? "", debounceMs);

  const searchParams: AppointmentSearchParams = {
    ...params,
    patientQuery: debouncedPatient.trim() || undefined,
  };

  return useQuery({
    queryKey: [...queryKeys.appointments.search(searchParams), refreshKey],
    queryFn: () => searchAppointments(searchParams),
    ...defaults,
  });
}

export function useAppointmentCalendar(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: queryKeys.appointments.calendar(dateFrom, dateTo),
    queryFn: () => searchAppointments({ dateFrom, dateTo, count: 200 }),
    enabled: Boolean(dateFrom && dateTo),
    ...defaults,
  });
}

export function usePractitionerSearch(query: string, enabled = true, debounceMs = 300) {
  const debounced = useDebouncedValue(query.trim(), debounceMs);

  return useQuery({
    queryKey: queryKeys.practitioners.search(debounced),
    queryFn: () => searchPractitioners(debounced),
    enabled: enabled && debounced.length >= 1,
    ...defaults,
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useDashboardCounts(
  options?: Omit<UseQueryOptions<DashboardCounts>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.counts(),
    queryFn: getDashboardCounts,
    ...defaults,
    ...options,
  });
}

export function useRecentPatients(
  limit = 8,
  options?: Omit<UseQueryOptions<Patient[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentPatients(limit),
    queryFn: () => getRecentPatients(limit),
    ...defaults,
    ...options,
  });
}

export function useRecentEncounters(
  limit = 6,
  options?: Omit<UseQueryOptions<EncounterWithPatient[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentEncounters(limit),
    queryFn: () => getRecentEncountersWithPatients(limit),
    ...defaults,
    ...options,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications(limit = 10) {
  return useQuery({
    queryKey: queryKeys.notifications.list(limit),
    queryFn: () => getNotificationBundles(limit),
    ...defaults,
  });
}

// ─── Patient detail ───────────────────────────────────────────────────────────

export function usePatient(
  id: string,
  options?: Omit<UseQueryOptions<Patient>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => getPatient(id),
    enabled: Boolean(id),
    ...defaults,
    ...options,
  });
}

type PatientResourceQuery = {
  key: readonly unknown[];
  queryFn: () => Promise<unknown>;
};

function patientResourceQueries(patientId: string): PatientResourceQuery[] {
  return [
    { key: queryKeys.patients.encounters(patientId), queryFn: () => getPatientEncounters(patientId) },
    { key: queryKeys.patients.observations(patientId), queryFn: () => getPatientObservations(patientId) },
    { key: queryKeys.patients.conditions(patientId), queryFn: () => getPatientConditions(patientId) },
    { key: queryKeys.patients.medications(patientId), queryFn: () => getPatientMedications(patientId) },
    { key: queryKeys.patients.allergies(patientId), queryFn: () => getPatientAllergies(patientId) },
    { key: queryKeys.patients.appointments(patientId), queryFn: () => getPatientAppointments(patientId) },
    { key: queryKeys.patients.orders(patientId), queryFn: () => getPatientOrders(patientId) },
    { key: queryKeys.patients.immunizations(patientId), queryFn: () => getPatientImmunizations(patientId) },
    { key: queryKeys.patients.flags(patientId), queryFn: () => getPatientFlags(patientId) },
    { key: queryKeys.patients.reports(patientId), queryFn: () => getPatientDiagnosticReports(patientId) },
    { key: queryKeys.patients.familyHistory(patientId), queryFn: () => getPatientFamilyHistory(patientId) },
    { key: queryKeys.patients.relatedPersons(patientId), queryFn: () => getPatientRelatedPersons(patientId) },
    { key: queryKeys.patients.directives(patientId), queryFn: () => getPatientAdvanceDirectives(patientId) },
    { key: queryKeys.patients.tasks(patientId), queryFn: () => getPatientTasks(patientId) },
    { key: queryKeys.patients.documents(patientId), queryFn: () => getPatientDocuments(patientId) },
    { key: queryKeys.patients.referrals(patientId), queryFn: () => getPatientReferrals(patientId) },
    {
      key: queryKeys.patients.questionnaireResponses(patientId),
      queryFn: () => getPatientQuestionnaireResponses(patientId),
    },
  ];
}

const PATIENT_RESOURCE_LABELS = [
  "Encounters",
  "Vitals",
  "Conditions",
  "Medications",
  "Allergies",
  "Appointments",
  "Orders",
  "Immunizations",
  "Flags",
  "Reports",
  "Family History",
  "Contacts",
  "Directives",
  "Tasks",
  "Documents",
  "Referrals",
  "Questionnaires",
] as const;

/** Parallel cached queries for all patient-detail tab data. */
export function usePatientDetailResources(patientId: string) {
  const queries = useQueries({
    queries: patientResourceQueries(patientId).map(({ key, queryFn }) => ({
      queryKey: key,
      queryFn,
      enabled: Boolean(patientId),
      ...defaults,
    })),
  });

  const failedSections = PATIENT_RESOURCE_LABELS.filter((_, i) => queries[i]?.isError);

  return {
    encounters: (queries[0]?.data ?? []) as Awaited<ReturnType<typeof getPatientEncounters>>,
    observations: (queries[1]?.data ?? []) as Awaited<ReturnType<typeof getPatientObservations>>,
    conditions: (queries[2]?.data ?? []) as Awaited<ReturnType<typeof getPatientConditions>>,
    medications: (queries[3]?.data ?? []) as Awaited<ReturnType<typeof getPatientMedications>>,
    allergies: (queries[4]?.data ?? []) as Awaited<ReturnType<typeof getPatientAllergies>>,
    appointments: (queries[5]?.data ?? []) as Awaited<ReturnType<typeof getPatientAppointments>>,
    orders: (queries[6]?.data ?? []) as Awaited<ReturnType<typeof getPatientOrders>>,
    immunizations: (queries[7]?.data ?? []) as Awaited<ReturnType<typeof getPatientImmunizations>>,
    flags: (queries[8]?.data ?? []) as Awaited<ReturnType<typeof getPatientFlags>>,
    reports: (queries[9]?.data ?? []) as Awaited<ReturnType<typeof getPatientDiagnosticReports>>,
    familyHistory: (queries[10]?.data ?? []) as Awaited<ReturnType<typeof getPatientFamilyHistory>>,
    relatedPersons: (queries[11]?.data ?? []) as Awaited<ReturnType<typeof getPatientRelatedPersons>>,
    directives: (queries[12]?.data ?? []) as Awaited<ReturnType<typeof getPatientAdvanceDirectives>>,
    tasks: (queries[13]?.data ?? []) as Awaited<ReturnType<typeof getPatientTasks>>,
    documents: (queries[14]?.data ?? []) as Awaited<ReturnType<typeof getPatientDocuments>>,
    referrals: (queries[15]?.data ?? []) as Awaited<ReturnType<typeof getPatientReferrals>>,
    questionnaireResponses: (queries[16]?.data ?? []) as Awaited<
      ReturnType<typeof getPatientQuestionnaireResponses>
    >,
    isLoading: queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),
    failedSections: [...failedSections],
  };
}

// ─── Mutation helper ──────────────────────────────────────────────────────────

export function useInvalidatePatient() {
  const queryClient = useQueryClient();
  return (patientId: string) => invalidateAllPatientQueries(queryClient, patientId);
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => invalidateDashboard(queryClient);
}

export function useInvalidatePatientSearch() {
  const queryClient = useQueryClient();
  return () => invalidatePatientSearch(queryClient);
}

/** Wrap a FHIR mutation with automatic cache invalidation. */
export function useFhirMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables> & {
    invalidate?: (queryClient: ReturnType<typeof useQueryClient>, data: TData, vars: TVariables) => void;
  },
) {
  const queryClient = useQueryClient();
  const { invalidate, ...rest } = options ?? {};

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, onMutateResult, context) => {
      invalidate?.(queryClient, data, variables);
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...rest,
  });
}

export type { AppointmentWithPatient, EncounterWithPatient, Practitioner, Bundle };
