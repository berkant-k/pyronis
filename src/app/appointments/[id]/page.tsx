import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAppointment,
  getPatient,
  getPractitioner,
  patientDisplayName,
  patientAge,
  formatDate,
  formatDateTime,
  getPatientMRN,
  appointmentStatusColor,
  getAppointmentPatientId,
  getAppointmentPractitionerRefs,
  practitionerDisplayName,
  getPractitionerQualification,
  parseFhirId,
} from "@/lib/fhir-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  UserRound,
  Tag,
  Stethoscope,
  FileText,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { RescheduleDialog } from "@/components/appointments/RescheduleDialog";
import { CancelAppointmentButton } from "@/components/appointments/CancelAppointmentButton";
import { CheckInButton } from "@/components/appointments/CheckInButton";
import { StartEncounterFromAppointmentButton } from "@/components/appointments/StartEncounterFromAppointmentButton";
import type { Practitioner } from "@medplum/fhirtypes";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const appt = await getAppointment(id);
    return { title: `Appointment ${formatDateTime(appt.start)} | Pyronis EMR` };
  } catch {
    return { title: "Appointment | Pyronis EMR" };
  }
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60 min-w-[130px] pt-0.5">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let appointment;
  try {
    appointment = await getAppointment(id);
  } catch {
    notFound();
  }

  const patientId = getAppointmentPatientId(appointment);
  const practitionerRefs = getAppointmentPractitionerRefs(appointment);

  const [patientResult, ...practitionerResults] = await Promise.allSettled([
    patientId ? getPatient(patientId) : Promise.reject(new Error("no patient")),
    ...practitionerRefs.map((ref) => getPractitioner(parseFhirId(ref, "Practitioner") ?? ref)),
  ]);

  const patient = patientResult.status === "fulfilled" ? patientResult.value : undefined;
  const practitioners: Practitioner[] = practitionerResults
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => {
      const val = (r as PromiseFulfilledResult<Practitioner>).value;
      return val ? [val] : [];
    });

  const status = appointment.status ?? "unknown";

  // Status-based visibility flags
  const isCheckInnable    = ["proposed", "pending", "booked", "arrived"].includes(status);
  const canStartEncounter = ["booked", "arrived", "checked-in"].includes(status);
  const isReschedulable   = ["proposed", "pending", "booked", "waitlist"].includes(status);
  const isCancellable     = !["cancelled", "fulfilled", "noshow", "entered-in-error"].includes(status);

  const durationMin = appointment.minutesDuration;
  const apptType    = appointment.appointmentType?.text ?? appointment.appointmentType?.coding?.[0]?.display;
  const service     = appointment.serviceType?.[0]?.text;
  const reason      = appointment.reasonCode?.[0]?.text;
  const cancelReason = appointment.cancelationReason?.text;

  const mrn = patient ? getPatientMRN(patient) : "";
  const initials = patient
    ? ((patient.name?.[0]?.given?.[0]?.[0] ?? "") + (patient.name?.[0]?.family?.[0] ?? "")).toUpperCase() || "?"
    : "?";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back + actions */}
      <div className="flex items-start justify-between gap-4">
        <Link
          href="/appointments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </Link>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Primary actions: check-in + start encounter */}
          {isCheckInnable && (
            <CheckInButton appointmentId={id} />
          )}
          {canStartEncounter && patientId && (
            <StartEncounterFromAppointmentButton
              appointmentId={id}
              patientId={patientId}
              patient={patient}
              preloadedPractitioners={practitioners}
              defaultTypeText={service ?? ""}
              defaultReasonText={reason ?? ""}
            />
          )}

          {/* Secondary actions: reschedule + cancel */}
          {isReschedulable && (
            <RescheduleDialog
              appointmentId={id}
              currentStart={appointment.start}
              currentDurationMinutes={durationMin}
              patient={patient ? { name: patientDisplayName(patient), gender: patient.gender, birthDate: patient.birthDate } : undefined}
            />
          )}
          {isCancellable && (
            <CancelAppointmentButton appointmentId={id} />
          )}
          <RawFhirDialog resource={appointment as unknown as Record<string, unknown>} />
        </div>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">
                  {formatDateTime(appointment.start)}
                </h1>
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                  appointmentStatusColor(status)
                )}>
                  {status.replace(/-/g, " ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {durationMin && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {durationMin >= 60
                      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ""}`
                      : `${durationMin} min`}
                  </span>
                )}
                {apptType && (
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {apptType}
                  </span>
                )}
                {service && (
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {service}
                  </span>
                )}
              </div>
              <p className="font-mono text-[11px] text-muted-foreground/50">FHIR: {appointment.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status workflow banner */}
      <WorkflowBanner status={status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details + practitioners */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <DetailRow label="Status">
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                  appointmentStatusColor(status)
                )}>
                  {status.replace(/-/g, " ")}
                </span>
              </DetailRow>
              <DetailRow label="Start">{formatDateTime(appointment.start)}</DetailRow>
              {appointment.end && (
                <DetailRow label="End">{formatDateTime(appointment.end)}</DetailRow>
              )}
              {durationMin && (
                <DetailRow label="Duration">
                  {durationMin >= 60
                    ? `${Math.floor(durationMin / 60)} hr${Math.floor(durationMin / 60) > 1 ? "s" : ""}${durationMin % 60 ? ` ${durationMin % 60} min` : ""}`
                    : `${durationMin} minutes`}
                </DetailRow>
              )}
              {apptType && <DetailRow label="Type">{apptType}</DetailRow>}
              {service && <DetailRow label="Service">{service}</DetailRow>}
              {reason && <DetailRow label="Reason">{reason}</DetailRow>}
              {cancelReason && (
                <DetailRow label="Cancellation reason">
                  <span className="text-destructive">{cancelReason}</span>
                </DetailRow>
              )}
            </CardContent>
          </Card>

          {practitioners.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  Practitioners
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {practitioners.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {((p.name?.[0]?.given?.[0]?.[0] ?? "") + (p.name?.[0]?.family?.[0] ?? "")).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{practitionerDisplayName(p)}</p>
                      {getPractitionerQualification(p) && (
                        <p className="text-xs text-muted-foreground">{getPractitionerQualification(p)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: patient */}
        {patient && (
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{patientDisplayName(patient)}</p>
                    {mrn && <span className="font-mono text-[11px] text-primary">MR-{mrn}</span>}
                  </div>
                </div>
                <Separator />
                <div className="space-y-1 text-sm text-muted-foreground">
                  {patient.birthDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(patient.birthDate)} · {patientAge(patient)} yrs
                    </div>
                  )}
                  {patient.gender && <div className="capitalize">{patient.gender}</div>}
                </div>
                <Link
                  href={`/patients/${patient.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full mt-1")}
                >
                  View Patient Record
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Workflow banner ───────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { status: "proposed",  label: "Proposed"  },
  { status: "booked",    label: "Booked"    },
  { status: "checked-in",label: "Checked In"},
  { status: "fulfilled", label: "Fulfilled" },
] as const;

function WorkflowBanner({ status }: { status: string }) {
  if (["cancelled", "noshow", "entered-in-error"].includes(status)) return null;

  const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex items-center gap-0 rounded-lg border bg-muted/20 px-4 py-3 overflow-x-auto">
      {WORKFLOW_STEPS.map((step, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.status} className="flex items-center shrink-0">
            {/* Step */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold",
                done   ? "bg-primary border-primary text-primary-foreground"
                : active ? "bg-background border-primary text-primary"
                : "bg-background border-border text-muted-foreground"
              )}>
                {done ? "✓" : i + 1}
              </div>
              <span className={cn(
                "text-xs font-medium whitespace-nowrap",
                active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"
              )}>
                {step.label}
              </span>
            </div>
            {/* Connector */}
            {i < WORKFLOW_STEPS.length - 1 && (
              <div className={cn(
                "mx-3 h-px w-8 shrink-0",
                i < currentIdx ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
