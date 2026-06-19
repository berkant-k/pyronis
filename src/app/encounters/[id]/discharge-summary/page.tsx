import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Observation } from "@medplum/fhirtypes";
import {
  getEncounter,
  getEncounterConditions,
  getEncounterObservations,
  getEncounterProcedures,
  getEncounterDischargeRx,
  getEncounterSoapNotes,
  getPatient,
  patientDisplayName,
  patientAge,
  formatDate,
  formatDateTime,
  getPatientMRN,
  getEncounterVisitId,
  parseSoapNote,
} from "@/lib/fhir-client";
import { PrintButton } from "@/components/encounters/PrintButton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const enc = await getEncounter(id);
    const pid = enc.subject?.reference?.startsWith("Patient/") ? enc.subject.reference.slice(8) : null;
    const patient = pid ? await getPatient(pid) : null;
    return { title: `Discharge Summary — ${patient ? patientDisplayName(patient) : "Patient"} | Pyronis EMR` };
  } catch {
    return { title: "Discharge Summary | Pyronis EMR" };
  }
}

// Simple vitals labels
const VITAL_LABELS: Record<string, string> = {
  "8480-6":  "Systolic BP",
  "8462-4":  "Diastolic BP",
  "8867-4":  "Heart Rate",
  "9279-1":  "Resp. Rate",
  "59408-5": "SpO₂",
  "8310-5":  "Temperature",
  "29463-7": "Weight",
  "8302-2":  "Height",
  "39156-5": "BMI",
};

const VITAL_ORDER = Object.keys(VITAL_LABELS);

function latestVitals(observations: Observation[]) {
  const map = new Map<string, Observation>();
  for (const obs of observations) {
    const code = obs.code?.coding?.[0]?.code ?? "";
    if (!code) continue;
    const existing = map.get(code);
    if (!existing || (obs.effectiveDateTime ?? "") > (existing.effectiveDateTime ?? "")) {
      map.set(code, obs);
    }
  }
  return VITAL_ORDER
    .filter((c) => map.has(c))
    .map((c) => {
      const obs = map.get(c)!;
      const val = obs.valueQuantity?.value !== undefined
        ? `${obs.valueQuantity.value}${obs.valueQuantity.unit ? " " + obs.valueQuantity.unit : ""}`
        : obs.valueString ?? "—";
      return {
        label: VITAL_LABELS[c] ?? obs.code?.text ?? c,
        value: val,
        date: obs.effectiveDateTime,
      };
    });
}

function durationLabel(start: string, end: string): string {
  const ms   = new Date(end).getTime() - new Date(start).getTime();
  const days = Math.floor(ms / 86_400_000);
  const hrs  = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hrs}h`;
  return `${hrs}h`;
}

export default async function DischargeSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let encounter;
  try {
    encounter = await getEncounter(id);
  } catch {
    notFound();
  }

  const patientId = encounter.subject?.reference?.startsWith("Patient/")
    ? encounter.subject.reference.slice(8)
    : null;

  const [patientRes, condRes, obsRes, procRes, rxRes, soapRes] = await Promise.allSettled([
    patientId ? getPatient(patientId) : Promise.resolve(null),
    getEncounterConditions(id),
    getEncounterObservations(id),
    getEncounterProcedures(id),
    getEncounterDischargeRx(id),
    getEncounterSoapNotes(id),
  ]);

  const patient     = patientRes.status === "fulfilled" ? patientRes.value : null;
  const conditions  = condRes.status === "fulfilled" ? condRes.value : [];
  const observations = obsRes.status === "fulfilled" ? obsRes.value : [];
  const procedures  = procRes.status === "fulfilled" ? procRes.value : [];
  const dischargeRx = rxRes.status === "fulfilled" ? rxRes.value.filter((r) => r.status !== "cancelled") : [];
  const soapNote    = soapRes.status === "fulfilled" ? soapRes.value[0] : undefined;
  const soap        = soapNote ? parseSoapNote(soapNote) : null;

  const mrn      = patient ? getPatientMRN(patient) : null;
  const visitId  = getEncounterVisitId(encounter);
  const provider = encounter.participant?.map((p) => p.individual?.display).filter(Boolean).join(", ");
  const typeLabel = encounter.type?.[0]?.text ?? encounter.class?.display ?? "Encounter";

  const principalDx  = conditions.find((c) => c.category?.[0]?.coding?.[0]?.code === "encounter-diagnosis") ?? conditions[0];
  const secondaryDx  = conditions.filter((c) => c !== principalDx);
  const vitals       = latestVitals(observations);

  const hasStart = !!encounter.period?.start;
  const hasEnd   = !!encounter.period?.end;
  const los      = hasStart && hasEnd ? durationLabel(encounter.period!.start!, encounter.period!.end!) : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Print toolbar */}
      <div className="print:hidden flex items-center justify-between gap-4 border-b bg-muted/30 px-6 py-3">
        <Link
          href={`/encounters/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to encounter
        </Link>
        <div className="text-sm text-muted-foreground">Discharge Summary — preview before printing</div>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-8 py-8 print:px-4 print:py-4">

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pyronis EMR</h1>
              <p className="text-sm text-gray-500">Discharge Summary</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Discharge Date: {formatDate(encounter.period?.end ?? new Date().toISOString())}</p>
              {visitId && <p className="font-mono font-semibold">Visit: VID-{visitId}</p>}
            </div>
          </div>
        </div>

        {/* Patient + Admission info */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Patient</p>
            <p className="text-base font-bold text-gray-900">{patient ? patientDisplayName(patient) : "—"}</p>
            {mrn && <p className="font-mono text-gray-600">MR-{mrn}</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Demographics</p>
            {patient?.birthDate && (
              <p className="text-gray-700">DOB: {formatDate(patient.birthDate)} · {patientAge(patient)} yrs</p>
            )}
            {patient?.gender && <p className="text-gray-700 capitalize">{patient.gender}</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Admission</p>
            <p className="text-gray-700">{typeLabel}</p>
            {hasStart && <p className="text-gray-600">{formatDateTime(encounter.period!.start)}</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Discharge</p>
            {hasEnd && <p className="text-gray-700">{formatDateTime(encounter.period!.end)}</p>}
            {los && <p className="text-gray-600">Length of stay: {los}</p>}
            {provider && <p className="text-gray-700 mt-1">Provider: {provider}</p>}
          </div>
        </div>

        {/* Reason for admission */}
        {encounter.reasonCode?.[0]?.text && (
          <Section title="Reason for Admission">
            <p className="text-sm text-gray-800">{encounter.reasonCode[0].text}</p>
          </Section>
        )}

        {/* Principal diagnosis */}
        <Section title="Principal Diagnosis">
          {principalDx ? (
            <div className="text-sm text-gray-800">
              <span className="font-semibold">
                {principalDx.code?.text ?? principalDx.code?.coding?.[0]?.display ?? "—"}
              </span>
              {principalDx.code?.coding?.[0]?.code && (
                <span className="ml-2 font-mono text-gray-500">{principalDx.code.coding[0].code}</span>
              )}
              {principalDx.clinicalStatus?.coding?.[0]?.code && (
                <span className="ml-2 capitalize text-gray-500">
                  ({principalDx.clinicalStatus.coding[0].code})
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No diagnosis recorded</p>
          )}
        </Section>

        {/* Secondary diagnoses */}
        {secondaryDx.length > 0 && (
          <Section title="Secondary Diagnoses">
            <ol className="list-decimal list-inside space-y-1">
              {secondaryDx.map((c, i) => (
                <li key={c.id ?? i} className="text-sm text-gray-800">
                  {c.code?.text ?? c.code?.coding?.[0]?.display ?? "—"}
                  {c.code?.coding?.[0]?.code && (
                    <span className="ml-2 font-mono text-gray-500">{c.code.coding[0].code}</span>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Procedures */}
        {procedures.length > 0 && (
          <Section title="Procedures Performed">
            <ol className="list-decimal list-inside space-y-1">
              {procedures.map((p, i) => (
                <li key={p.id ?? i} className="text-sm text-gray-800">
                  {p.code?.text ?? p.code?.coding?.[0]?.display ?? "—"}
                  {p.performedDateTime && (
                    <span className="ml-2 text-gray-500">{formatDate(p.performedDateTime)}</span>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Vitals at discharge */}
        {vitals.length > 0 && (
          <Section title="Vital Signs (Most Recent)">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-1 font-semibold text-gray-600 pr-6">Parameter</th>
                  <th className="text-left pb-1 font-semibold text-gray-600 pr-6">Value</th>
                  <th className="text-left pb-1 font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {vitals.map((v) => (
                  <tr key={v.label} className="border-b border-gray-100">
                    <td className="py-1.5 pr-6 text-gray-700">{v.label}</td>
                    <td className="py-1.5 pr-6 font-semibold text-gray-900">{v.value}</td>
                    <td className="py-1.5 text-gray-500">{formatDate(v.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Discharge medications */}
        <Section title="Discharge Medications">
          {dischargeRx.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No discharge medications prescribed</p>
          ) : (
            <ol className="list-decimal list-inside space-y-2">
              {dischargeRx.map((rx, i) => {
                const drug = rx.medicationCodeableConcept?.text ?? "—";
                const sig  = rx.dosageInstruction?.[0]?.text;
                const prn  = rx.dosageInstruction?.[0]?.asNeededBoolean;
                return (
                  <li key={rx.id ?? i} className="text-sm text-gray-800">
                    <span className="font-semibold">{drug}</span>
                    {prn && <span className="ml-1.5 text-xs font-bold text-amber-700">(PRN)</span>}
                    {sig && <span className="ml-1 text-gray-600">— {sig}</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </Section>

        {/* Follow-up plan (from SOAP) */}
        {soap?.plan && (
          <Section title="Follow-up Plan">
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{soap.plan}</p>
          </Section>
        )}

        {/* Discharge instructions (blank) */}
        <Section title="Discharge Instructions">
          <div className="space-y-2">
            {["Activity restrictions", "Diet / fluid restrictions", "Wound care", "Return to ED if"].map((label) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="text-sm text-gray-600 w-40 shrink-0">{label}:</span>
                <div className="flex-1 border-b border-gray-300" />
              </div>
            ))}
          </div>
        </Section>

        {/* Outpatient follow-up */}
        <Section title="Outpatient Follow-up">
          <div className="space-y-2">
            {["With whom", "Date / time", "Location"].map((label) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="text-sm text-gray-600 w-24 shrink-0">{label}:</span>
                <div className="flex-1 border-b border-gray-300" />
              </div>
            ))}
          </div>
        </Section>

        {/* Signature */}
        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <div className="h-px w-full bg-gray-400 mb-2" />
            <p className="text-xs text-gray-500">Discharging Clinician Signature &amp; Stamp</p>
            <p className="text-xs text-gray-500 mt-2">Date: _______________________</p>
          </div>
          <div>
            <div className="h-px w-full bg-gray-400 mb-2" />
            <p className="text-xs text-gray-500">Patient / Guardian Acknowledgement</p>
            <p className="text-xs text-gray-500 mt-2">Date: _______________________</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400">
          Generated by Pyronis EMR · {formatDateTime(new Date().toISOString())} · FHIR Encounter ID: {id}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-widest text-gray-500">
        {title}
      </h2>
      {children}
    </div>
  );
}
