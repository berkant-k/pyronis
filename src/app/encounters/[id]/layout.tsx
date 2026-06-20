import type { AllergyIntolerance, Consent, Flag } from "@medplum/fhirtypes";
import {
  getEncounter,
  getPatient,
  getPatientFlags,
  getPatientAllergies,
  getPatientAdvanceDirectives,
  parseFhirId,
} from "@/lib/fhir-client";
import { EncounterPatientBar } from "@/components/patients/EncounterPatientBar";

export default async function EncounterDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let encounter = null;
  let patientId: string | null = null;

  try {
    encounter = await getEncounter(id);
    patientId = parseFhirId(encounter.subject?.reference, "Patient") ?? null;
  } catch {
    return <>{children}</>;
  }

  if (!patientId) return <>{children}</>;

  const [patientRes, flagsRes, allergiesRes, directivesRes] = await Promise.allSettled([
    getPatient(patientId),
    getPatientFlags(patientId),
    getPatientAllergies(patientId),
    getPatientAdvanceDirectives(patientId),
  ]);

  const patient    = patientRes.status    === "fulfilled" ? patientRes.value    : null;
  const flags      = flagsRes.status      === "fulfilled" ? flagsRes.value      : [] as Flag[];
  const allergies  = allergiesRes.status  === "fulfilled" ? allergiesRes.value  : [] as AllergyIntolerance[];
  const directives = directivesRes.status === "fulfilled" ? directivesRes.value : [] as Consent[];

  if (!patient) return <>{children}</>;

  const activeFlags = flags.filter((f) => f.status === "active");

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden print:relative print:overflow-visible">
      {/* Docked context bar — patient identity + encounter metadata */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm shadow-sm print:hidden">
        <EncounterPatientBar
          patient={patient}
          patientId={patientId}
          encounter={encounter}
          activeFlags={activeFlags}
          directives={directives}
          allergies={allergies}
        />
      </div>

      {/* Scrollable encounter content */}
      <div className="flex-1 overflow-auto p-6 bg-background print:overflow-visible print:p-0">
        {children}
      </div>
    </div>
  );
}
