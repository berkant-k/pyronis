import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type {
  DiagnosticReport,
  MedicationAdministration,
  MedicationRequest,
  Observation,
  Patient,
  Procedure,
  QuestionnaireResponse,
  ServiceRequest,
} from "@medplum/fhirtypes";
import {
  getEncounter,
  getEncounterConditions,
  getEncounterMedications,
  getEncounterObservations,
  getEncounterOrders,
  getEncounterSoapNotes,
  getEncounterDischargeRx,
  getEncounterInpatientRx,
  getEncounterAdministrations,
  getEncounterProcedureOrders,
  getEncounterProcedures,
  getPatient,
  getEncounterImmunizations,
  getEncounterDiagnosticReports,
  getEncounterReferrals,
  getEncounterQuestionnaireResponses,
  getEncounterNonVitalObservations,
  isDischargeRx,
  isInpatientRx,
  patientDisplayName,
  parseFhirId,
} from "@/lib/fhir-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  User,
  Stethoscope,
  AlertCircle,
  Printer,
  FileText,
} from "lucide-react";
import { RecordVitalsButton } from "@/components/vitals/RecordVitalsButton";
import { CloseEncounterButton } from "@/components/encounters/CloseEncounterButton";
import { SoapNoteEditor } from "@/components/encounters/SoapNoteEditor";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";
import { EncounterTabsSection } from "@/components/encounters/EncounterTabsSection";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const enc = await getEncounter(id);
    const typeLabel =
      enc.type?.[0]?.coding?.[0]?.display ??
      enc.type?.[0]?.text ??
      enc.class?.display ??
      "Encounter";
    return { title: `${typeLabel} | Pyronis EMR` };
  } catch {
    return { title: "Encounter | Pyronis EMR" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EncounterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let encounter: Awaited<ReturnType<typeof getEncounter>>;
  try {
    encounter = await getEncounter(id);
  } catch {
    notFound();
  }

  const patientId = parseFhirId(encounter.subject?.reference, "Patient") ?? null;

  const [patientRes, obsRes, condRes, medRes, soapRes, ordersRes, dischargeRxRes, inpatientRxRes, adminsRes, procOrdersRes, procsRes, immRes, drRes, referralsRes, qrRes, nonVitalObsRes] = await Promise.allSettled([
    patientId ? getPatient(patientId) : Promise.resolve(null as Patient | null),
    getEncounterObservations(id),
    getEncounterConditions(id),
    getEncounterMedications(id),
    getEncounterSoapNotes(id),
    getEncounterOrders(id),
    getEncounterDischargeRx(id),
    getEncounterInpatientRx(id),
    getEncounterAdministrations(id),
    getEncounterProcedureOrders(id),
    getEncounterProcedures(id),
    getEncounterImmunizations(id),
    getEncounterDiagnosticReports(id),
    getEncounterReferrals(id),
    getEncounterQuestionnaireResponses(id),
    getEncounterNonVitalObservations(id),
  ]);

  const patient      = patientRes.status === "fulfilled" ? patientRes.value : null;
  const observations = obsRes.status === "fulfilled" ? obsRes.value : [];
  const conditions   = condRes.status === "fulfilled" ? condRes.value : [];
  const allMeds      = medRes.status === "fulfilled" ? medRes.value : [];
  const medications: MedicationRequest[] = allMeds.filter((m) => !isDischargeRx(m) && !isInpatientRx(m));
  const soapNote     = soapRes.status === "fulfilled" ? soapRes.value[0] : undefined;
  const orders: ServiceRequest[] = ordersRes.status === "fulfilled" ? ordersRes.value : [];
  const dischargeRx: MedicationRequest[] = dischargeRxRes.status === "fulfilled"
    ? dischargeRxRes.value
    : allMeds.filter(isDischargeRx);
  const inpatientOrders: MedicationRequest[] = inpatientRxRes.status === "fulfilled"
    ? inpatientRxRes.value
    : allMeds.filter(isInpatientRx);
  const administrations: MedicationAdministration[] = adminsRes.status === "fulfilled" ? adminsRes.value : [];
  const procedureOrders: ServiceRequest[] = procOrdersRes.status === "fulfilled" ? procOrdersRes.value : [];
  const procedures: Procedure[]           = procsRes.status === "fulfilled" ? procsRes.value : [];
  const encounterImmunizations            = immRes.status === "fulfilled" ? immRes.value : [];
  const encounterReports: DiagnosticReport[] = drRes.status === "fulfilled" ? drRes.value : [];
  const encounterReferrals: ServiceRequest[] = referralsRes.status === "fulfilled" ? referralsRes.value : [];
  const encounterQRs: QuestionnaireResponse[] = qrRes.status === "fulfilled" ? qrRes.value : [];
  const nonVitalObs: Observation[] = nonVitalObsRes.status === "fulfilled" ? nonVitalObsRes.value : [];

  const reason =
    encounter.reasonCode?.[0]?.text ??
    encounter.reasonCode?.[0]?.coding?.[0]?.display;
  const patientName = patient
    ? patientDisplayName(patient)
    : encounter.subject?.display ?? "Unknown patient";
  const patientInfo = patient ? { name: patientName, gender: patient.gender, birthDate: patient.birthDate } : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* ── Back nav + actions ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/encounters"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Encounters
        </Link>
        <div className="flex items-center gap-2">
          {encounter.status === "in-progress" && (
            <CloseEncounterButton encounterId={id} />
          )}
          {patientId && (
            <RecordVitalsButton patientId={patientId} encounterId={id} />
          )}
          <Link
            href={`/encounters/${id}/soap-print`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Printer className="h-3.5 w-3.5" />
            Print SOAP
          </Link>
          <Link
            href={`/encounters/${id}/discharge-summary`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <FileText className="h-3.5 w-3.5" />
            Discharge Summary
          </Link>
          {patient && (
            <Link
              href={`/patients/${patientId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <User className="h-3.5 w-3.5" />
              Patient record
            </Link>
          )}
          <RawFhirDialog resource={encounter as unknown as Record<string, unknown>} />
        </div>
      </div>

      {/* ── Chief complaint + encounter diagnoses ── */}
      {(reason || (encounter.diagnosis?.length ?? 0) > 0) && (
        <Card>
          <CardContent className="pt-5 pb-5 space-y-4">
            {reason && (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Chief Complaint
                  </p>
                  <p className="text-sm leading-relaxed">{reason}</p>
                </div>
              </div>
            )}
            {reason && (encounter.diagnosis?.length ?? 0) > 0 && <Separator />}
            {(encounter.diagnosis?.length ?? 0) > 0 && (
              <div className="flex items-start gap-3">
                <Stethoscope className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Encounter Diagnoses
                  </p>
                  <ul className="space-y-1">
                    {encounter.diagnosis!.map((d, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                        <span className="flex-1 truncate">
                          {d.condition?.display ?? d.condition?.reference ?? "—"}
                        </span>
                        {d.use?.coding?.[0]?.display && (
                          <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                            {d.use.coding[0].display}
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SOAP Note — primary surface ── */}
      {patientId && (
        <SoapNoteEditor
          patientId={patientId}
          encounterId={id}
          initialNote={soapNote}
        />
      )}

      {/* ── Supporting data — tabbed ── */}
      {patientId && (
        <EncounterTabsSection
          encounter={encounter}
          patientId={patientId}
          encounterId={id}
          patientInfo={patientInfo}
          observations={observations}
          nonVitalObs={nonVitalObs}
          conditions={conditions}
          inpatientOrders={inpatientOrders}
          administrations={administrations}
          medications={medications}
          orders={orders}
          procedureOrders={procedureOrders}
          procedures={procedures}
          encounterReferrals={encounterReferrals}
          encounterReports={encounterReports}
          encounterImmunizations={encounterImmunizations}
          encounterQRs={encounterQRs}
          dischargeRx={dischargeRx}
        />
      )}
    </div>
  );
}

