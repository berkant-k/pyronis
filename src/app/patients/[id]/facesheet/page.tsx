import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getPatient,
  getPatientConditions,
  getPatientAllergies,
  getPatientMedications,
  getPatientFlags,
  getPatientRelatedPersons,
  getPatientAdvanceDirectives,
  patientDisplayName,
  patientAge,
  formatDate,
  formatDateTime,
  getPatientMRN,
  getPatientQID,
  getPatientPassport,
  relatedPersonDisplayName,
  relatedPersonRelationship,
  getDirectiveType,
  ADVANCE_DIRECTIVE_DISPLAY,
  CRITICAL_DIRECTIVE_CODES,
  EXT_INSURANCE,
  EXT_VIP,
  EXT_NATIONALITY,
} from "@/lib/fhir-client";
import { PrintButton } from "@/components/encounters/PrintButton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await getPatient(id);
    return { title: `Face Sheet — ${patientDisplayName(p)} | Pyronis EMR` };
  } catch {
    return { title: "Patient Face Sheet | Pyronis EMR" };
  }
}

export default async function PatientFaceSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let patient;
  try {
    patient = await getPatient(id);
  } catch {
    notFound();
  }

  const [condRes, algRes, medRes, flagRes, relRes, dirRes] = await Promise.allSettled([
    getPatientConditions(id),
    getPatientAllergies(id),
    getPatientMedications(id),
    getPatientFlags(id),
    getPatientRelatedPersons(id),
    getPatientAdvanceDirectives(id),
  ]);

  const allConditions = condRes.status === "fulfilled" ? condRes.value : [];
  const allergies     = algRes.status  === "fulfilled" ? algRes.value  : [];
  const allMeds       = medRes.status  === "fulfilled" ? medRes.value  : [];
  const flags         = flagRes.status === "fulfilled" ? flagRes.value : [];
  const relatedPersons = relRes.status === "fulfilled" ? relRes.value  : [];
  const directives    = dirRes.status  === "fulfilled" ? dirRes.value  : [];

  // Active problem list conditions
  const activeProblems = allConditions.filter((c) => {
    const cat    = c.category?.[0]?.coding?.[0]?.code;
    const status = c.clinicalStatus?.coding?.[0]?.code ?? "";
    return cat === "problem-list-item" && ["active", "recurrence", "relapse"].includes(status);
  });

  // Active medications
  const activeMeds = allMeds.filter((m) => m.status === "active");

  // Active flags
  const activeFlags = flags.filter((f) => f.status === "active");

  // Emergency / next-of-kin contacts
  const emergencyContacts = relatedPersons.filter((r) => {
    const code = r.relationship?.[0]?.coding?.[0]?.code ?? "";
    return ["C", "E", "EP", "N", "NOK"].includes(code);
  }).slice(0, 3);

  // Active directives — critical first
  const activeDirectives = directives.filter((d) => d.status === "active");
  const criticalDirs = activeDirectives.filter((d) => CRITICAL_DIRECTIVE_CODES.has(getDirectiveType(d)));
  const otherDirs    = activeDirectives.filter((d) => !CRITICAL_DIRECTIVE_CODES.has(getDirectiveType(d)));

  const mrn       = getPatientMRN(patient);
  const qid       = getPatientQID(patient);
  const passport  = getPatientPassport(patient);
  const insurance = patient.extension?.find((x) => x.url === EXT_INSURANCE)?.valueString;
  const isVip     = patient.extension?.find((x) => x.url === EXT_VIP)?.valueBoolean ?? false;
  const phone     = patient.telecom?.find((t) => t.system === "phone")?.value;
  const email     = patient.telecom?.find((t) => t.system === "email")?.value;
  const address   = patient.address?.[0];
  const nationality = patient.extension
    ?.find((x) => x.url === EXT_NATIONALITY)
    ?.extension?.find((e) => e.url === "code")?.valueCodeableConcept?.coding?.[0]?.code;

  return (
    <div className="min-h-screen bg-white">
      {/* Print toolbar */}
      <div className="print:hidden flex items-center justify-between gap-4 border-b bg-muted/30 px-6 py-3">
        <Link
          href={`/patients/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to patient
        </Link>
        <div className="text-sm text-muted-foreground">Patient Face Sheet — preview before printing</div>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-8 py-6 print:px-4 print:py-3">

        {/* Document header */}
        <div className="border-b-2 border-gray-800 pb-3 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pyronis EMR</h1>
              <p className="text-sm text-gray-500">Patient Face Sheet</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Printed: {formatDate(new Date().toISOString())}</p>
              {mrn && <p className="font-mono font-semibold">MR-{mrn}</p>}
            </div>
          </div>
        </div>

        {/* Critical directives banner */}
        {criticalDirs.length > 0 && (
          <div className="mb-4 rounded border border-red-400 bg-red-50 px-4 py-2 flex flex-wrap gap-3 items-center">
            <span className="text-xs font-bold uppercase tracking-wide text-red-700">Critical Directives:</span>
            {criticalDirs.map((d) => {
              const code = getDirectiveType(d);
              return (
                <span key={d.id} className="font-bold text-sm text-red-800 border border-red-400 bg-white rounded px-2 py-0.5">
                  {ADVANCE_DIRECTIVE_DISPLAY[code] ?? code}
                </span>
              );
            })}
          </div>
        )}

        {/* Demographics */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{patientDisplayName(patient)}</h2>
              {isVip && (
                <span className="inline-block text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-2 py-0.5 mt-0.5">VIP</span>
              )}
            </div>
            <div className="text-right text-sm text-gray-600 space-y-0.5">
              {patient.birthDate && (
                <p>DOB: {formatDate(patient.birthDate)} · {patientAge(patient)} years</p>
              )}
              {patient.gender && <p className="capitalize">{patient.gender}</p>}
              {nationality && <p>Nationality: {nationality}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            {mrn      && <FieldRow label="MRN"          value={`MR-${mrn}`}  mono />}
            {qid      && <FieldRow label="QID"          value={qid}          mono />}
            {passport && <FieldRow label="Passport"     value={passport}     mono />}
            {phone    && <FieldRow label="Phone"        value={phone} />}
            {email    && <FieldRow label="Email"        value={email} />}
            {insurance && <FieldRow label="Insurance"   value={insurance} />}
            {address && (
              <div className="col-span-2 flex gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 w-20 shrink-0 pt-0.5">Address</span>
                <span className="text-gray-700">
                  {[address.text, address.city, address.country].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Emergency contacts */}
        {emergencyContacts.length > 0 && (
          <FaceSection title="Emergency Contacts">
            <div className="grid grid-cols-2 gap-3">
              {emergencyContacts.map((r) => {
                const rPhone = r.telecom?.find((t) => t.system === "phone")?.value;
                const rEmail = r.telecom?.find((t) => t.system === "email")?.value;
                return (
                  <div key={r.id} className="text-sm space-y-0.5">
                    <p className="font-semibold text-gray-800">{relatedPersonDisplayName(r)}</p>
                    <p className="text-gray-500 text-xs capitalize">{relatedPersonRelationship(r)}</p>
                    {rPhone && <p className="text-gray-700">📞 {rPhone}</p>}
                    {rEmail && <p className="text-gray-700">✉ {rEmail}</p>}
                  </div>
                );
              })}
            </div>
          </FaceSection>
        )}

        <div className="grid grid-cols-2 gap-4">

          {/* Active problem list */}
          <FaceSection title="Active Problem List">
            {activeProblems.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No active problems</p>
            ) : (
              <ol className="list-decimal list-inside space-y-1">
                {activeProblems.map((c, i) => (
                  <li key={c.id ?? i} className="text-sm text-gray-800">
                    {c.code?.text ?? c.code?.coding?.[0]?.display ?? "—"}
                    {c.code?.coding?.[0]?.code && (
                      <span className="ml-1.5 font-mono text-xs text-gray-400">{c.code.coding[0].code}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </FaceSection>

          {/* Allergies */}
          <FaceSection title="Allergies & Intolerances">
            {allergies.length === 0 ? (
              <p className="text-sm font-semibold text-green-700">NKDA — No known drug allergies</p>
            ) : (
              <ul className="space-y-1">
                {allergies.map((a, i) => {
                  const substance  = a.code?.text ?? a.code?.coding?.[0]?.display ?? "Unknown";
                  const criticality = a.criticality === "high" ? " ⚠" : "";
                  const reaction   = a.reaction?.[0]?.manifestation?.[0]?.text
                    ?? a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display;
                  return (
                    <li key={a.id ?? i} className="text-sm text-gray-800">
                      <span className="font-semibold">{substance}{criticality}</span>
                      {reaction && <span className="ml-1 text-gray-500">({reaction})</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </FaceSection>

          {/* Active medications */}
          <FaceSection title="Active Medications">
            {activeMeds.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No active medications</p>
            ) : (
              <ol className="list-decimal list-inside space-y-1">
                {activeMeds.map((m, i) => {
                  const drug = m.medicationCodeableConcept?.text ?? "—";
                  const sig  = m.dosageInstruction?.[0]?.text;
                  return (
                    <li key={m.id ?? i} className="text-sm text-gray-800">
                      <span className="font-semibold">{drug}</span>
                      {sig && <span className="ml-1 text-gray-500">— {sig}</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </FaceSection>

          {/* Flags / alerts */}
          <FaceSection title="Active Alerts">
            {activeFlags.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No active alerts</p>
            ) : (
              <ul className="space-y-1">
                {activeFlags.map((f, i) => (
                  <li key={f.id ?? i} className="text-sm text-gray-800 font-medium">
                    {f.code?.text ?? f.code?.coding?.[0]?.display ?? "Alert"}
                  </li>
                ))}
              </ul>
            )}
          </FaceSection>

        </div>

        {/* Other directives */}
        {otherDirs.length > 0 && (
          <FaceSection title="Advance Directives">
            <div className="flex flex-wrap gap-2">
              {otherDirs.map((d) => {
                const code = getDirectiveType(d);
                return (
                  <span key={d.id} className="text-xs font-medium border border-gray-300 rounded px-2 py-0.5 text-gray-700">
                    {ADVANCE_DIRECTIVE_DISPLAY[code] ?? code}
                  </span>
                );
              })}
            </div>
          </FaceSection>
        )}

        {/* Footer */}
        <div className="mt-6 border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400">
          Generated by Pyronis EMR · {formatDateTime(new Date().toISOString())} · FHIR Patient ID: {id}
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 w-20 shrink-0 pt-0.5">{label}</span>
      <span className={`text-gray-700 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function FaceSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-1.5 border-b border-gray-200 pb-0.5 text-xs font-bold uppercase tracking-widest text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}
