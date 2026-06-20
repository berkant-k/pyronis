import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getEncounter,
  getEncounterDischargeRx,
  getPatient,
  patientDisplayName,
  patientAge,
  formatDate,
  formatDateTime,
  getPatientMRN,
  getEncounterVisitId,
  parseFhirId,
} from "@/lib/fhir-client";
import { PrintButton } from "@/components/encounters/PrintButton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const [, patient] = await Promise.all([
      getEncounter(id),
      getEncounter(id).then((e) => {
        const pid = parseFhirId(e.subject?.reference, "Patient") ?? null;
        return pid ? getPatient(pid) : null;
      }),
    ]);
    return { title: `Discharge Rx — ${patient ? patientDisplayName(patient) : "Patient"} | Pyronis EMR` };
  } catch {
    return { title: "Discharge Prescription | Pyronis EMR" };
  }
}

export default async function DischargePrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let encounter;
  try {
    encounter = await getEncounter(id);
  } catch {
    notFound();
  }

  const patientId = parseFhirId(encounter.subject?.reference, "Patient") ?? null;

  const [patientRes, rxRes] = await Promise.allSettled([
    patientId ? getPatient(patientId) : Promise.resolve(null),
    getEncounterDischargeRx(id),
  ]);

  const patient = patientRes.status === "fulfilled" ? patientRes.value : null;
  const rxList  = rxRes.status === "fulfilled" ? rxRes.value : [];

  const mrn     = patient ? getPatientMRN(patient) : null;
  const visitId = getEncounterVisitId(encounter);

  const activeRx = rxList.filter((r) => r.status !== "cancelled" && r.status !== "entered-in-error");

  return (
    <div className="min-h-screen bg-white">
      {/* Print toolbar — hidden in print */}
      <div className="print:hidden flex items-center justify-between gap-4 border-b bg-muted/30 px-6 py-3">
        <div className="text-sm text-muted-foreground">
          Discharge Prescription — preview before printing
        </div>
        <PrintButton />
      </div>

      {/* Printable content */}
      <div className="mx-auto max-w-3xl px-8 py-8 print:px-4 print:py-4">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pyronis EMR</h1>
              <p className="text-sm text-gray-500">Discharge Prescription</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Date: {formatDate(new Date().toISOString())}</p>
              {visitId && <p className="font-mono font-semibold">Visit: VID-{visitId}</p>}
            </div>
          </div>
        </div>

        {/* Patient details */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Patient</p>
            <p className="text-base font-bold text-gray-900">
              {patient ? patientDisplayName(patient) : "—"}
            </p>
            {mrn && (
              <p className="font-mono text-sm text-gray-600">MR-{mrn}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Demographics</p>
            {patient?.birthDate && (
              <p className="text-sm text-gray-700">
                DOB: {formatDate(patient.birthDate)} · {patientAge(patient)} years
              </p>
            )}
            {patient?.gender && (
              <p className="text-sm text-gray-700 capitalize">{patient.gender}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Encounter</p>
            <p className="text-sm text-gray-700">
              {encounter.type?.[0]?.text ?? encounter.class?.display ?? "Encounter"}
            </p>
            {encounter.period?.start && (
              <p className="text-sm text-gray-700">
                {formatDateTime(encounter.period.start)}
                {encounter.period.end && ` — ${formatDateTime(encounter.period.end)}`}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Provider</p>
            {encounter.participant?.map((p, i) => (
              <p key={i} className="text-sm text-gray-700">
                {p.individual?.display ?? p.individual?.reference ?? "—"}
              </p>
            )) ?? <p className="text-sm text-gray-500">—</p>}
          </div>
        </div>

        {/* Prescriptions table */}
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
            Medications Prescribed for Discharge
            {activeRx.length > 0 && (
              <span className="ml-2 font-mono text-gray-500">({activeRx.length} item{activeRx.length !== 1 ? "s" : ""})</span>
            )}
          </h2>

          {activeRx.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
              No active discharge prescriptions
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300 text-left">
                  <th className="pb-2 pr-4 font-semibold text-gray-700 w-8">#</th>
                  <th className="pb-2 pr-4 font-semibold text-gray-700">Drug / Medication</th>
                  <th className="pb-2 pr-4 font-semibold text-gray-700">Instructions (SIG)</th>
                  <th className="pb-2 pr-4 font-semibold text-gray-700 w-24">Quantity</th>
                  <th className="pb-2 font-semibold text-gray-700 w-16">Refills</th>
                </tr>
              </thead>
              <tbody>
                {activeRx.map((rx, idx) => {
                  const sig      = rx.dosageInstruction?.[0]?.text ?? "—";
                  const prn      = rx.dosageInstruction?.[0]?.asNeededBoolean;
                  const qty      = rx.dispenseRequest?.quantity;
                  const refills  = rx.dispenseRequest?.numberOfRepeatsAllowed;
                  const notes    = rx.note?.[0]?.text;
                  return (
                    <tr key={rx.id} className="border-b border-gray-200 align-top">
                      <td className="py-3 pr-4 text-gray-400 font-mono text-xs">{idx + 1}.</td>
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-gray-900">
                          {rx.medicationCodeableConcept?.text ?? "—"}
                        </span>
                        {prn && (
                          <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
                            PRN
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {sig}
                        {notes && <div className="text-xs text-gray-500 mt-0.5 italic">{notes}</div>}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {qty ? `${qty.value} ${qty.unit ?? ""}`.trim() : "—"}
                      </td>
                      <td className="py-3 text-gray-700">
                        {refills !== undefined ? refills : 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Allergy reminder / notes */}
        <div className="mb-8 rounded-lg border border-gray-300 bg-yellow-50 px-4 py-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-800 mb-1">Patient instructions</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Complete the full course of any antibiotic prescribed, even if you feel better.</li>
            <li>Do not share medications with others.</li>
            <li>Keep all medications out of reach of children.</li>
            <li>Return to the Emergency Department or contact your doctor if your condition worsens.</li>
          </ul>
        </div>

        {/* Signature block */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div>
            <div className="h-px w-full bg-gray-400 mb-2" />
            <p className="text-xs text-gray-500">Prescribing Clinician Signature &amp; Stamp</p>
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
