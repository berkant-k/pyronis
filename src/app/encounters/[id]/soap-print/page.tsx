import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getEncounter,
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
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const enc = await getEncounter(id);
    const pid = enc.subject?.reference?.startsWith("Patient/") ? enc.subject.reference.slice(8) : null;
    const patient = pid ? await getPatient(pid) : null;
    return { title: `SOAP Note — ${patient ? patientDisplayName(patient) : "Patient"} | Pyronis EMR` };
  } catch {
    return { title: "SOAP Note | Pyronis EMR" };
  }
}

export default async function SoapPrintPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [patientRes, soapRes] = await Promise.allSettled([
    patientId ? getPatient(patientId) : Promise.resolve(null),
    getEncounterSoapNotes(id),
  ]);

  const patient  = patientRes.status === "fulfilled" ? patientRes.value : null;
  const notes    = soapRes.status === "fulfilled" ? soapRes.value : [];
  const latest   = notes[0];
  const soap     = latest ? parseSoapNote(latest) : null;

  const mrn      = patient ? getPatientMRN(patient) : null;
  const visitId  = getEncounterVisitId(encounter);
  const typeLabel = encounter.type?.[0]?.text ?? encounter.class?.display ?? "Encounter";
  const provider  = encounter.participant?.map((p) => p.individual?.display).filter(Boolean).join(", ");

  const SECTIONS = [
    { label: "Subjective", key: "subjective" as const },
    { label: "Objective",  key: "objective"  as const },
    { label: "Assessment", key: "assessment" as const },
    { label: "Plan",       key: "plan"       as const },
  ];

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
        <div className="text-sm text-muted-foreground">Clinical Note — preview before printing</div>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-8 py-8 print:px-4 print:py-4">

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pyronis EMR</h1>
              <p className="text-sm text-gray-500">Clinical Note (SOAP)</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Date: {formatDate(latest?.date ?? encounter.period?.start ?? new Date().toISOString())}</p>
              {visitId && <p className="font-mono font-semibold">Visit: VID-{visitId}</p>}
            </div>
          </div>
        </div>

        {/* Patient + Encounter info box */}
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
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Visit Type</p>
            <p className="text-gray-700">{typeLabel}</p>
            {encounter.period?.start && (
              <p className="text-gray-600">{formatDateTime(encounter.period.start)}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Provider</p>
            <p className="text-gray-700">{provider || "—"}</p>
          </div>
        </div>

        {/* SOAP sections */}
        {!soap ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
            No clinical note recorded for this encounter
          </div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map(({ label, key }) => (
              <div key={key}>
                <h2 className="mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-widest text-gray-500">
                  {label}
                </h2>
                {soap[key] ? (
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{soap[key]}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Not recorded</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Signature */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <div>
            <div className="h-px w-full bg-gray-400 mb-2" />
            <p className="text-xs text-gray-500">Clinician Signature &amp; Stamp</p>
            <p className="text-xs text-gray-500 mt-2">Date: _______________________</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Document Info</p>
            {latest?.id && (
              <p className="font-mono text-[10px] text-gray-400">Composition: {latest.id}</p>
            )}
            <p className="font-mono text-[10px] text-gray-400">Encounter: {id}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400">
          Generated by Pyronis EMR · {formatDateTime(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
}
