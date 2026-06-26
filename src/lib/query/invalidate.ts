import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

export function invalidatePatientQueries(queryClient: QueryClient, patientId: string) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
}

export function invalidateAllPatientQueries(queryClient: QueryClient, patientId: string) {
  return queryClient.invalidateQueries({
    queryKey: [...queryKeys.patients.all, patientId],
  });
}

export function invalidateEncounterQueries(queryClient: QueryClient, encounterId: string) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.encounters.detail(encounterId) });
}

export function invalidateDashboard(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

export function invalidatePatientSearch(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
}
