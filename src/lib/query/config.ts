/** Default TanStack Query options for FHIR data. */
export const FHIR_STALE_TIME = 30_000;
export const FHIR_GC_TIME = 5 * 60_000;

export const fhirQueryDefaults = {
  staleTime: FHIR_STALE_TIME,
  gcTime: FHIR_GC_TIME,
  refetchOnWindowFocus: true,
  retry: 1,
} as const;
