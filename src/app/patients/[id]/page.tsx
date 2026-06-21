import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
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
  getDirectiveType,
  ADVANCE_DIRECTIVE_DISPLAY,
  CRITICAL_DIRECTIVE_CODES,
  flagCategoryColor,
  FLAG_CATEGORY_DISPLAY,
  patientDisplayName,
  patientAge,
  formatDate,
  formatRelativeTime,
  getPatientMRN,
  getPatientQID,
  getPatientPassport,
  patientPhotoDataUrl,
  relatedPersonDisplayName,
  relatedPersonRelationship,
  EXT_VIP,
  EXT_INSURANCE,
  EXT_ADMIN_NOTES,
  EXT_CADAVERIC_DONOR,
  EXT_BIRTH_PLACE,
  getEncounterTriageAcuity,
  triageAcuityColor,
  triageAcuityLabel,
} from "@/lib/fhir-client";
import { StatusPill } from "@/components/ui/StatusPill";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  Patient, ServiceRequest, Immunization,
  Flag, DiagnosticReport, FamilyMemberHistory, RelatedPerson,
  Consent, Task, DocumentReference, QuestionnaireResponse,
} from "@medplum/fhirtypes";
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Pencil, Star,
  Building2, Clock, StickyNote, Fingerprint, BookOpen, Heart,
  ClipboardList, ShieldAlert, Flag as FlagIcon, Ban, Printer,
  Stethoscope, Pill, ListTodo, AlertTriangle, ChevronRight, Activity,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StartEncounterButton } from "@/components/encounters/StartEncounterButton";
import { RecordVitalsButton } from "@/components/vitals/RecordVitalsButton";
import { PatientPhotoAvatar } from "@/components/patients/PatientPhotoAvatar";
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";
import { PatientTabsSection } from "@/components/patients/PatientTabsSection";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const patient = await getPatient(id);
    return { title: `${patientDisplayName(patient)} | Pyronis EMR` };
  } catch {
    return { title: "Patient | Pyronis EMR" };
  }
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let patient: Patient;
  try {
    patient = await getPatient(id);
  } catch {
    notFound();
  }

  const [
    encounters, observations, conditions, medications, allergies,
    appointments, ordersResult, immunizationsResult, flagsResult,
    reportsResult, familyHistoryResult, relatedPersonsResult,
    directivesResult, tasksResult, documentsResult, referralsResult,
    responsesResult,
  ] = await Promise.allSettled([
    getPatientEncounters(id),
    getPatientObservations(id),
    getPatientConditions(id),
    getPatientMedications(id),
    getPatientAllergies(id),
    getPatientAppointments(id),
    getPatientOrders(id),
    getPatientImmunizations(id),
    getPatientFlags(id),
    getPatientDiagnosticReports(id),
    getPatientFamilyHistory(id),
    getPatientRelatedPersons(id),
    getPatientAdvanceDirectives(id),
    getPatientTasks(id),
    getPatientDocuments(id),
    getPatientReferrals(id),
    getPatientQuestionnaireResponses(id),
  ]);

  const enc            = encounters.status         === "fulfilled" ? encounters.value         : [];
  const obs            = observations.status       === "fulfilled" ? observations.value       : [];
  const cond           = conditions.status         === "fulfilled" ? conditions.value         : [];
  const meds           = medications.status        === "fulfilled" ? medications.value        : [];
  const allg           = allergies.status          === "fulfilled" ? allergies.value          : [];
  const appts          = appointments.status       === "fulfilled" ? appointments.value       : [];
  const orders: ServiceRequest[]        = ordersResult.status        === "fulfilled" ? ordersResult.value        : [];
  const imms: Immunization[]            = immunizationsResult.status === "fulfilled" ? immunizationsResult.value : [];
  const flags: Flag[]                   = flagsResult.status         === "fulfilled" ? flagsResult.value         : [];
  const reports: DiagnosticReport[]     = reportsResult.status       === "fulfilled" ? reportsResult.value       : [];
  const familyHistory: FamilyMemberHistory[]  = familyHistoryResult.status  === "fulfilled" ? familyHistoryResult.value  : [];
  const relatedPersons: RelatedPerson[]       = relatedPersonsResult.status === "fulfilled" ? relatedPersonsResult.value : [];
  const directives: Consent[]                 = directivesResult.status     === "fulfilled" ? directivesResult.value     : [];
  const tasks: Task[]                         = tasksResult.status          === "fulfilled" ? tasksResult.value          : [];
  const documents: DocumentReference[]        = documentsResult.status      === "fulfilled" ? documentsResult.value      : [];
  const referrals: ServiceRequest[]           = referralsResult.status      === "fulfilled" ? referralsResult.value      : [];
  const responses: QuestionnaireResponse[]    = responsesResult.status      === "fulfilled" ? responsesResult.value      : [];

  // Collect failed section names for the tab warning banner
  const failedSections = (
    [
      [encounters,          "Encounters"],
      [observations,        "Vitals"],
      [conditions,          "Conditions"],
      [medications,         "Medications"],
      [allergies,           "Allergies"],
      [appointments,        "Appointments"],
      [ordersResult,        "Orders"],
      [immunizationsResult, "Immunizations"],
      [flagsResult,         "Flags"],
      [reportsResult,       "Reports"],
      [familyHistoryResult, "Family History"],
      [relatedPersonsResult,"Contacts"],
      [directivesResult,    "Directives"],
      [tasksResult,         "Tasks"],
      [documentsResult,     "Documents"],
      [referralsResult,     "Referrals"],
      [responsesResult,     "Questionnaires"],
    ] as Array<[{ status: string }, string]>
  )
    .filter(([r]) => r.status === "rejected")
    .map(([, name]) => name);

  // Clinical signals
  const activeEncounter   = enc.find((e) => e.status === "in-progress");
  const activeConditions  = cond.filter((c) => c.clinicalStatus?.coding?.[0]?.code === "active").length;
  const activeMeds        = meds.filter((m) => m.status === "active").length;
  const highAllergies     = allg.filter((a) => a.criticality === "high").length;
  const openTasks         = tasks.filter((t) => t.status === "requested" || t.status === "in-progress" || t.status === "on-hold");

  const activeFlags        = flags.filter((f) => f.status === "active");
  const criticalDirectives = directives.filter(
    (d) => d.status === "active" && CRITICAL_DIRECTIVE_CODES.has(getDirectiveType(d))
  );

  const name         = patient.name?.[0];
  const initials     = ((name?.given?.[0]?.[0] ?? "") + (name?.family?.[0] ?? "")).toUpperCase() || "?";
  const photoDataUrl = patientPhotoDataUrl(patient);
  const mrn          = getPatientMRN(patient);
  const qid          = getPatientQID(patient);
  const passport     = getPatientPassport(patient);
  const isActive     = patient.active !== false;
  const isVip        = patient.extension?.some((x) => x.url === EXT_VIP && x.valueBoolean === true) ?? false;
  const isCadavericDonor = patient.extension?.some((x) => x.url === EXT_CADAVERIC_DONOR && x.valueBoolean === true) ?? false;
  const insuranceCompany = patient.extension?.find((x) => x.url === EXT_INSURANCE)?.valueString;
  const adminNotes       = patient.extension?.find((x) => x.url === EXT_ADMIN_NOTES)?.valueString;
  const birthPlaceExt    = patient.extension?.find((x) => x.url === EXT_BIRTH_PLACE);
  const birthPlaceDisplay = [birthPlaceExt?.valueAddress?.city, birthPlaceExt?.valueAddress?.country]
    .filter(Boolean).join(", ") || birthPlaceExt?.valueAddress?.text;
  const lastUpdated = patient.meta?.lastUpdated;
  const phone  = patient.telecom?.find((t) => t.system === "phone")?.value;
  const email  = patient.telecom?.find((t) => t.system === "email")?.value;
  const address = patient.address?.[0];

  const EMERGENCY_REL_CODES = new Set(["C", "EP", "N"]);
  const emergencyContacts = relatedPersons.filter((r) =>
    r.relationship?.some((rel) =>
      rel.coding?.some((c) => EMERGENCY_REL_CODES.has(c.code ?? ""))
    )
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to patients
        </Link>
        <div className="flex items-center gap-2">
          <BookAppointmentDialog patientId={id} patient={patient} />
          <StartEncounterButton patientId={id} patient={patient} />
          <RecordVitalsButton patientId={id} encounters={enc.filter((e) => e.status === "in-progress")} />
          <Link href={`/patients/${id}/chart`}
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")}>
            <ClipboardList className="h-4 w-4" />
            Chart
          </Link>
          <Link href={`/patients/${id}/allergies`}
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")}>
            <ShieldAlert className="h-4 w-4" />
            Allergies
          </Link>
          <Link href={`/patients/${id}/facesheet`}
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")}>
            <Printer className="h-4 w-4" />
            Face Sheet
          </Link>
          <Link href={`/patients/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <RawFhirDialog resource={patient as unknown as Record<string, unknown>} />
        </div>
      </div>

      {/* Patient header */}
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
        <CardContent className="pt-5 pb-4">

          {/* Photo + identity */}
          <div className="flex items-start gap-5">
            <PatientPhotoAvatar
              patientId={id}
              initials={initials}
              initialPhotoUrl={photoDataUrl}
              isActive={isActive}
              isDeceased={patient.deceasedBoolean ?? false}
            />

            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-xl font-bold tracking-tight leading-tight">
                {patientDisplayName(patient)}
              </h1>

              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {mrn ? (
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5">
                    MR-{mrn}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">No MRN</span>
                )}
                {patient.gender && (
                  <Badge variant="secondary" className="capitalize text-xs">{patient.gender}</Badge>
                )}
                {isVip && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> VIP
                  </span>
                )}
                {isCadavericDonor && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5">
                    <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> Organ Donor
                  </span>
                )}
                {!isActive && (
                  <Badge variant="secondary" className="text-xs text-muted-foreground">Inactive</Badge>
                )}
                {patient.deceasedBoolean && <Badge variant="destructive" className="text-xs">Deceased</Badge>}
                {criticalDirectives.map((d) => {
                  const code  = getDirectiveType(d);
                  const label = ADVANCE_DIRECTIVE_DISPLAY[code] ?? code;
                  return (
                    <span key={d.id} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-600 border border-red-700 rounded-md px-2 py-0.5">
                      <Ban className="h-3 w-3" /> {label}
                    </span>
                  );
                })}
              </div>

              {/* Demographics */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {patient.birthDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    {formatDate(patient.birthDate)}
                    <span className="text-muted-foreground/35">·</span>
                    <span className="font-medium text-foreground">{patientAge(patient)} yrs</span>
                  </span>
                )}
                {qid && (
                  <span className="flex items-center gap-1.5">
                    <Fingerprint className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50">QID</span>
                    <span className="font-mono">{qid}</span>
                  </span>
                )}
                {passport && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50">PPN</span>
                    <span className="font-mono">{passport}</span>
                  </span>
                )}
                {phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    {phone}
                  </span>
                )}
                {email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    {email}
                  </span>
                )}
                {(address?.text || address?.city || address?.country) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    {[address.text, address.city, address.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {insuranceCompany && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    {insuranceCompany}
                  </span>
                )}
                {birthPlaceDisplay && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50">Born</span>
                    {birthPlaceDisplay}
                  </span>
                )}
                {activeFlags.map((f) => {
                  const cat    = f.category?.[0]?.coding?.[0]?.code ?? "";
                  const catCls = flagCategoryColor(cat);
                  return (
                    <span
                      key={f.id}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${catCls}`}
                      title={FLAG_CATEGORY_DISPLAY[cat] ? `${FLAG_CATEGORY_DISPLAY[cat]} flag` : undefined}
                    >
                      <FlagIcon className="h-3 w-3" />
                      {f.code?.text ?? f.code?.coding?.[0]?.display ?? "Flag"}
                    </span>
                  );
                })}
              </div>

              {lastUpdated && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground/40">
                  <Clock className="h-3 w-3" />
                  Updated {formatRelativeTime(lastUpdated)}
                </p>
              )}
            </div>
          </div>

          {/* ── Clinical Signals ── */}
          <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center gap-2">
            {activeEncounter ? (
              <Link
                href={`/encounters/${activeEncounter.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Encounter In Progress
                {(() => {
                  const code = getEncounterTriageAcuity(activeEncounter);
                  return code ? (
                    <StatusPill color={triageAcuityColor(code)} label={triageAcuityLabel(code)} className="text-[10px] py-0 px-1.5" />
                  ) : null;
                })()}
                <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-muted/50 border border-border px-3 py-1.5 text-xs text-muted-foreground/70">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                No Active Encounter
              </span>
            )}
            <SignalChip icon={Stethoscope} label="Active Problems" count={activeConditions} variant="purple" />
            <SignalChip icon={Pill}         label="Active Meds"     count={activeMeds}       variant="purple" />
            {openTasks.length > 0 && (
              <SignalChip icon={ListTodo}     label="Open Tasks"      count={openTasks.length} variant="amber" />
            )}
            {highAllergies > 0 && (
              <SignalChip icon={AlertTriangle} label="High Allergy"   count={highAllergies}    variant="red" />
            )}
            {enc.length > 0 && !activeEncounter && (
              <SignalChip icon={Activity} label="Past Encounters" count={enc.length} variant="default" />
            )}
          </div>

          {/* ── Emergency Contacts ── */}
          {emergencyContacts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50 shrink-0">
                <UserRound className="h-3.5 w-3.5" />
                Emergency Contact
              </span>
              {emergencyContacts.slice(0, 2).map((c) => {
                const contactPhone = c.telecom?.find((t) => t.system === "phone")?.value;
                return (
                  <span key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">{relatedPersonDisplayName(c)}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">{relatedPersonRelationship(c)}</span>
                    {contactPhone && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <a
                          href={`tel:${contactPhone}`}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {contactPhone}
                        </a>
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Admin notes */}
      {adminNotes && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900 text-xs uppercase tracking-wide mb-1">Administrative Note</p>
            <p className="leading-relaxed">{adminNotes}</p>
          </div>
        </div>
      )}

      {/* Tabs (client component — handles group selector + controlled tabs) */}
      <PatientTabsSection
        patientId={id}
        patient={patient}
        patientName={patientDisplayName(patient)}
        appts={appts}
        enc={enc}
        obs={obs}
        cond={cond}
        meds={meds}
        orders={orders}
        allg={allg}
        imms={imms}
        flags={flags}
        reports={reports}
        familyHistory={familyHistory}
        relatedPersons={relatedPersons}
        directives={directives}
        tasks={tasks}
        documents={documents}
        referrals={referrals}
        responses={responses}
        failedSections={failedSections}
      />
    </div>
  );
}

// ─── Clinical signal chip ──────────────────────────────────────────────────────

const signalStyles = {
  purple:  "bg-purple-50 border-purple-200 text-purple-700",
  amber:   "bg-amber-50 border-amber-200 text-amber-700",
  red:     "bg-red-50 border-red-200 text-red-700",
  default: "bg-muted/50 border-border text-muted-foreground",
} as const;

function SignalChip({
  icon: Icon, label, count, variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  variant?: keyof typeof signalStyles;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${signalStyles[variant]}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-bold">{count}</span>
      <span>{label}</span>
    </span>
  );
}
