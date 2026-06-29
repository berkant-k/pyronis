import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPatient,
  getPatientEncounters,
  getPatientObservations,
  getPatientConditions,
  getPatientMedications,
  getPatientAllergies,
  patientDisplayName,
  patientAge,
  formatDate,
  getPatientMRN,
  getEncounterVisitId,
  EXT_ADMIN_NOTES,
  EXT_VIP, patientAgeNumeric,
} from "@/lib/fhir-client";
import type {
  Condition,
  Encounter,
  Observation,
  Patient,
} from "@medplum/fhirtypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthCharts } from "@/components/patients/GrowthCharts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  AlertTriangle,
  Pill,
  Stethoscope,
  Activity,
  StickyNote,
  Star,
  Pencil,
  ClipboardList,
  Clock,
  Calendar,
  ChevronRight,
} from "lucide-react";

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const patient = await getPatient(id);
    return { title: `Chart — ${patientDisplayName(patient)} | Pyronis EMR` };
  } catch {
    return { title: "Patient Chart | Pyronis EMR" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PatientChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let patient: Patient;
  try {
    patient = await getPatient(id);
  } catch {
    notFound();
  }

  const [encRes, obsRes, condRes, medRes, algRes] = await Promise.allSettled([
    getPatientEncounters(id),
    getPatientObservations(id),
    getPatientConditions(id),
    getPatientMedications(id),
    getPatientAllergies(id),
  ]);

  const encounters = encRes.status === "fulfilled" ? encRes.value : [];
  const observations = obsRes.status === "fulfilled" ? obsRes.value : [];
  const conditions = condRes.status === "fulfilled" ? condRes.value : [];
  const medications = medRes.status === "fulfilled" ? medRes.value : [];
  const allergies = algRes.status === "fulfilled" ? algRes.value : [];

  const failedSections = [
    encRes.status === "rejected" && "Encounters",
    obsRes.status === "rejected" && "Observations",
    condRes.status === "rejected" && "Conditions",
    medRes.status === "rejected" && "Medications",
    algRes.status === "rejected" && "Allergies",
  ].filter(Boolean) as string[];

  const mrn = getPatientMRN(patient);
  const isVip =
    patient.extension?.some(
      (x) => x.url === EXT_VIP && x.valueBoolean === true
    ) ?? false;
  const adminNotes = patient.extension?.find(
    (x) => x.url === EXT_ADMIN_NOTES
  )?.valueString;

  const ageNumeric=patientAgeNumeric(patient);

  const activeConditions = conditions.filter((c) =>
    ["active", "recurrence", "relapse"].includes(
      c.clinicalStatus?.coding?.[0]?.code ?? ""
    )
  );
  const activeMedications = medications.filter((m) => m.status === "active");

  // Group observations by LOINC code / text, keep latest per type
  const vitalGroups = new Map<string, Observation[]>();
  for (const obs of observations) {
    const key =
      obs.code?.coding?.[0]?.code ?? obs.code?.text ?? "unknown";
    const bucket = vitalGroups.get(key) ?? [];
    bucket.push(obs);
    vitalGroups.set(key, bucket);
  }
  // Sort each bucket newest-first; pick representative label from first entry
  const latestVitals = [...vitalGroups.entries()]
    .map(([key, bucket]) => {
      const sorted = [...bucket].sort((a, b) =>
        (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
      );
      const latest = sorted[0];
      return {
        key,
        display:
          latest.code?.coding?.[0]?.display ??
          latest.code?.text ??
          key,
        value: latest.valueQuantity?.value,
        unit: latest.valueQuantity?.unit,
        valueStr: latest.valueString,
        date: latest.effectiveDateTime,
        historyCount: sorted.length,
      };
    })
    .sort((a, b) =>
      VITAL_SORT_ORDER.indexOf(a.key) - VITAL_SORT_ORDER.indexOf(b.key) ||
      a.display.localeCompare(b.display)
    );

  const displayValue = (v: (typeof latestVitals)[0]) => {
    if (v.value !== undefined) return String(v.value);
    if (v.valueStr) return v.valueStr;
    return "—";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Navigation bar ── */}
      <div className="flex items-center justify-between">
        <Link
          href={`/patients/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to patient
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/patients/${id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex items-center gap-2"
            )}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* ── Patient mini-header ── */}
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight">
                  {patientDisplayName(patient)}
                </h1>
                {mrn && (
                  <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-2 py-0.5">
                    MR-{mrn}
                  </span>
                )}
                {isVip && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    VIP
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {[
                  patient.birthDate && `${formatDate(patient.birthDate)} · ${patientAge(patient)} yrs`,
                  patient.gender && patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1),
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5" />
                {encounters.length} encounter{encounters.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                {observations.length} vital reading{observations.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Admin notes ── */}
      {adminNotes && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900 text-xs uppercase tracking-wide mb-1">
              Administrative Note
            </p>
            <p className="leading-relaxed">{adminNotes}</p>
          </div>
        </div>
      )}

      {/* ── Failed fetch notice ── */}
      {failedSections.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Some sections could not be loaded: {failedSections.join(", ")}. Data shown may be incomplete.
        </div>
      )}

      {/* ── Clinical summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active problems */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-red-100">
                <Stethoscope className="h-3 w-3 text-red-600" />
              </span>
              Active Problems
              {activeConditions.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {activeConditions.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {activeConditions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No active problems
              </p>
            ) : (
              <ul className="space-y-2">
                {activeConditions.map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug truncate">
                        {c.code?.coding?.[0]?.display ?? c.code?.text ?? "—"}
                      </p>
                      {(c.onsetDateTime ?? c.recordedDate) && (
                        <p className="text-[11px] text-muted-foreground">
                          Since {formatDate(c.onsetDateTime ?? c.recordedDate)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Active medications */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-100">
                <Pill className="h-3 w-3 text-purple-600" />
              </span>
              Active Medications
              {activeMedications.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {activeMedications.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {activeMedications.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No active medications
              </p>
            ) : (
              <ul className="space-y-2">
                {activeMedications.map((m) => (
                  <li key={m.id} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug truncate">
                        {m.medicationCodeableConcept?.coding?.[0]?.display ??
                          m.medicationCodeableConcept?.text ??
                          "—"}
                      </p>
                      {m.dosageInstruction?.[0]?.text && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {m.dosageInstruction[0].text}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
              </span>
              Allergies
              {allergies.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {allergies.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {allergies.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No known allergies
              </p>
            ) : (
              <ul className="space-y-2">
                {allergies.map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        a.criticality === "high"
                          ? "bg-red-500"
                          : a.criticality === "low"
                          ? "bg-amber-400"
                          : "bg-muted-foreground/40"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug truncate">
                        {a.code?.coding?.[0]?.display ?? a.code?.text ?? "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {[a.type, a.criticality && `${a.criticality} criticality`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Encounter timeline ── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Encounter History
            <Badge variant="secondary" className="ml-auto font-mono text-xs">
              {encounters.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {encounters.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No encounters recorded
            </p>
          ) : (
            <EncounterTimeline encounters={encounters} />
          )}
        </CardContent>
      </Card>

        {ageNumeric <= 20 && (<GrowthCharts patient={patient} observations={observations}/>)}
      {/* ── Vitals ── */}
      {latestVitals.length > 0 && (
        <Card>
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Latest Vital Signs
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {latestVitals.length} type{latestVitals.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {latestVitals.map((v) => (
                <div
                  key={v.key}
                  className="rounded-lg border bg-muted/30 px-3.5 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 truncate">
                    {v.display}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-foreground leading-none">
                    {displayValue(v)}
                  </p>
                  {v.unit && (
                    <p className="text-xs text-muted-foreground mt-0.5">{v.unit}</p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDate(v.date)}
                  </div>
                  {v.historyCount > 1 && (
                    <p className="mt-0.5 text-[10px] text-primary/70">
                      {v.historyCount} readings
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Past conditions ── */}
      {conditions.length > activeConditions.length && (
        <PastConditionsSection
          conditions={conditions.filter(
            (c) =>
              !["active", "recurrence", "relapse"].includes(
                c.clinicalStatus?.coding?.[0]?.code ?? ""
              )
          )}
        />
      )}
    </div>
  );
}

// ─── Encounter timeline ───────────────────────────────────────────────────────

const ENC_STATUS_MAP: Record<
  string,
  { label: string; dot: string; pill: string }
> = {
  "in-progress":      { label: "In Progress", dot: "bg-green-500",          pill: "bg-green-100 text-green-700" },
  "finished":         { label: "Finished",    dot: "bg-slate-400",          pill: "bg-slate-100 text-slate-600" },
  "cancelled":        { label: "Cancelled",   dot: "bg-red-400",            pill: "bg-red-100 text-red-600" },
  "planned":          { label: "Planned",     dot: "bg-blue-500",           pill: "bg-blue-100 text-blue-700" },
  "on-hold":          { label: "On Hold",     dot: "bg-amber-500",          pill: "bg-amber-100 text-amber-700" },
  "entered-in-error": { label: "Error",       dot: "bg-red-300",            pill: "bg-red-50 text-red-400" },
};

const CLASS_LABELS: Record<string, string> = {
  AMB:  "Ambulatory",
  IMP:  "Inpatient",
  EMER: "Emergency",
  VR:   "Virtual",
  HH:   "Home Health",
};

function EncounterTimelineItem({
  s, startDate, duration, typeLabel, classLabel, reason, visitId,
}: {
  s: { label: string; pill: string };
  startDate: string | undefined;
  duration: string | null;
  typeLabel: string | null;
  classLabel: string | null;
  reason: string | undefined;
  visitId: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-0.5">
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", s.pill)}>
          {s.label}
        </span>
        {startDate && <span className="text-xs text-muted-foreground">{formatDate(startDate)}</span>}
        {duration && <span className="text-xs text-muted-foreground/60">· {duration}</span>}
        {visitId && (
          <span className="font-mono text-[10px] font-semibold text-primary/70">VID-{visitId}</span>
        )}
      </div>
      <p className="text-sm font-semibold leading-snug">{typeLabel ?? classLabel ?? "Encounter"}</p>
      {typeLabel && classLabel && <p className="text-xs text-muted-foreground capitalize">{classLabel}</p>}
      {reason && (
        <p className="mt-1 text-xs text-muted-foreground italic border-l-2 border-muted pl-2">{reason}</p>
      )}
    </>
  );
}

function EncounterTimeline({ encounters }: { encounters: Encounter[] }) {
  return (
    <div className="relative">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-0">
        {encounters.map((enc, i) => {
          const s =
            ENC_STATUS_MAP[enc.status ?? ""] ?? {
              label: enc.status ?? "—",
              dot: "bg-muted-foreground/40",
              pill: "bg-muted text-muted-foreground",
            };
          const typeLabel =
            enc.type?.[0]?.coding?.[0]?.display ?? enc.type?.[0]?.text ?? null;
          const classLabel =
            CLASS_LABELS[enc.class?.code ?? ""] ??
            enc.class?.display ??
            enc.class?.code ??
            null;
          const reason =
            enc.reasonCode?.[0]?.text ?? enc.reasonCode?.[0]?.coding?.[0]?.display;
          const startDate = enc.period?.start ?? enc.period?.end;
          const duration =
            enc.period?.start && enc.period?.end
              ? durationLabel(enc.period.start, enc.period.end)
              : null;
          const visitId = getEncounterVisitId(enc);
          const itemProps = { s, startDate, duration, typeLabel, classLabel, reason, visitId };

          return (
            <div key={enc.id ?? i} className="relative flex gap-4 pb-5 last:pb-0 group">
              <div
                className={cn("absolute left-1.5 top-1.5 h-4 w-4 rounded-full border-2 border-background ring-1", s.dot)}
                style={{ boxShadow: "0 0 0 1px var(--border)" }}
              />
              {enc.id ? (
                <Link
                  href={`/encounters/${enc.id}`}
                  className="ml-8 flex-1 min-w-0 flex items-start gap-1 -mx-2 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0"><EncounterTimelineItem {...itemProps} /></div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </Link>
              ) : (
                <div className="ml-8 flex-1 min-w-0"><EncounterTimelineItem {...itemProps} /></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function durationLabel(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// ─── Past conditions section ──────────────────────────────────────────────────

function PastConditionsSection({ conditions }: { conditions: Condition[] }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base">Past / Resolved Conditions</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ul className="space-y-2">
          {conditions.map((c) => {
            const statusCode = c.clinicalStatus?.coding?.[0]?.code ?? "—";
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                <span className="flex-1 truncate">
                  {c.code?.coding?.[0]?.display ?? c.code?.text ?? "—"}
                </span>
                <Badge variant="secondary" className="capitalize text-xs shrink-0">
                  {statusCode}
                </Badge>
                {(c.onsetDateTime ?? c.recordedDate) && (
                  <span className="shrink-0 text-[11px]">
                    {formatDate(c.onsetDateTime ?? c.recordedDate)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Vital sign sort order (LOINC codes, clinical priority) ───────────────────

const VITAL_SORT_ORDER = [
  "8480-6",  // Systolic BP
  "8462-4",  // Diastolic BP
  "8867-4",  // Heart rate
  "9279-1",  // Respiratory rate
  "2708-6",  // SpO2
  "59408-5", // SpO2 (pulse ox)
  "8310-5",  // Body temperature
  "29463-7", // Body weight
  "8302-2",  // Body height
  "39156-5", // BMI
];
