import type { Metadata } from "next";
import Link from "next/link";
import type { Patient, Encounter } from "@medplum/fhirtypes";
import {
  getDashboardCounts,
  getRecentPatients,
  getRecentEncountersWithPatients,
  patientDisplayName,
  patientAge,
  getPatientMRN,
  getPatientNationality,
  formatRelativeTime,
  type DashboardCounts,
  type EncounterWithPatient,
} from "@/lib/fhir-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users,
  Activity,
  Pill,
  HeartPulse,
  UserPlus,
  Search,
  ArrowRight,
  Calendar,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard | Pyronis EMR" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [countsResult, patientsResult, encountersResult] = await Promise.allSettled([
    getDashboardCounts(),
    getRecentPatients(8),
    getRecentEncountersWithPatients(6),
  ]);

  const counts: DashboardCounts =
    countsResult.status === "fulfilled"
      ? countsResult.value
      : { totalPatients: 0, newPatientsToday: 0, activeEncounters: 0, activeMedications: 0, activeConditions: 0 };

  const patients: Patient[] = patientsResult.status === "fulfilled" ? patientsResult.value : [];
  const encounters: EncounterWithPatient[] =
    encountersResult.status === "fulfilled" ? encountersResult.value : [];

  const failedSections = [
    countsResult.status === "rejected" && "Statistics",
    patientsResult.status === "rejected" && "Recent patients",
    encountersResult.status === "rejected" && "Recent encounters",
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <Link
          href="/patients/new"
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
        >
          <UserPlus className="h-3.5 w-3.5" />
          New Patient
        </Link>
      </div>

      {/* ── Failed fetch notice ── */}
      {failedSections.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Some data could not be loaded from the FHIR server: {failedSections.join(", ")}. Displayed counts may be incomplete.
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Patients"
          value={counts.totalPatients}
          subtext={
            counts.newPatientsToday > 0
              ? `+${counts.newPatientsToday} registered today`
              : "No new registrations today"
          }
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Active Encounters"
          value={counts.activeEncounters}
          subtext="Currently in progress"
          icon={<Stethoscope className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Active Medications"
          value={counts.activeMedications}
          subtext="Active prescriptions"
          icon={<Pill className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          label="Active Conditions"
          value={counts.activeConditions}
          subtext="Active diagnoses"
          icon={<HeartPulse className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* ── Content panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RecentPatientsCard patients={patients} />
        </div>
        <div className="lg:col-span-2">
          <RecentEncountersCard encounters={encounters} />
        </div>
      </div>

      {/* ── Quick actions ── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 pb-4">
          <Link href="/patients/new" className={cn(buttonVariants(), "gap-2")}>
            <UserPlus className="h-4 w-4" />
            Register New Patient
          </Link>
          <Link href="/patients" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <Search className="h-4 w-4" />
            Search Patients
          </Link>
          <Link href="/encounters" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <Calendar className="h-4 w-4" />
            View Encounters
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

const STAT_COLORS = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   num: "text-blue-700" },
  green:  { bg: "bg-green-50",  icon: "text-green-600",  num: "text-green-700" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", num: "text-purple-700" },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  num: "text-amber-700" },
} as const;

function StatCard({
  label, value, subtext, icon, color,
}: {
  label: string;
  value: number;
  subtext: string;
  icon: React.ReactNode;
  color: keyof typeof STAT_COLORS;
}) {
  const c = STAT_COLORS[color];
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold tabular-nums ${c.num}`}>
              {value.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">{subtext}</p>
          </div>
          <div className={`shrink-0 rounded-lg p-2.5 ${c.bg}`}>
            <span className={c.icon}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Recent patients ──────────────────────────────────────────────────────────

function flagEmoji(code: string): string {
  if (code.length !== 2) return "";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function RecentPatientsCard({ patients }: { patients: Patient[] }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            Recent Registrations
          </CardTitle>
          <Link
            href="/patients"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {patients.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            No patients registered yet
          </div>
        ) : (
          <div className="space-y-0.5">
            {patients.map((p) => {
              const mrn = getPatientMRN(p);
              const nat = getPatientNationality(p);
              const age = patientAge(p);
              const when = formatRelativeTime(p.meta?.lastUpdated);
              const name = p.name?.find((n) => !n.extension?.length) ?? p.name?.[0];
              const initials =
                ((name?.given?.[0]?.[0] ?? "") + (name?.family?.[0] ?? "")).toUpperCase() || "?";
              const isActive = p.active !== false;

              return (
                <Link
                  key={p.id}
                  href={`/patients/${p.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 transition-colors group"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/8 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-white ${isActive ? "bg-green-500" : "bg-muted-foreground/30"}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{patientDisplayName(p)}</p>
                      {mrn && (
                        <span className="shrink-0 font-mono text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 leading-none">
                          MR-{mrn}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {age && <span>{age} yrs</span>}
                      {age && nat && <span className="mx-1 text-muted-foreground/40">·</span>}
                      {nat && (
                        <span>
                          {flagEmoji(nat)} {nat}
                        </span>
                      )}
                    </p>
                  </div>

                  <p className="shrink-0 text-[11px] text-muted-foreground group-hover:text-foreground/60 transition-colors">
                    {when}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recent encounters ────────────────────────────────────────────────────────

const ENC_STATUS: Record<string, { label: string; cls: string }> = {
  "in-progress": { label: "Active",    cls: "bg-green-100 text-green-700" },
  "finished":    { label: "Finished",  cls: "bg-slate-100 text-slate-500" },
  "cancelled":   { label: "Cancelled", cls: "bg-red-100 text-red-600" },
  "planned":     { label: "Planned",   cls: "bg-blue-100 text-blue-700" },
  "on-hold":     { label: "On Hold",   cls: "bg-amber-100 text-amber-700" },
  "entered-in-error": { label: "Error", cls: "bg-red-100 text-red-400" },
};

function EncounterStatusPill({ status }: { status?: string }) {
  const s = status
    ? (ENC_STATUS[status] ?? { label: status, cls: "bg-muted text-muted-foreground" })
    : { label: "—", cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function encounterTypeLabel(enc: Encounter): string {
  return (
    enc.type?.[0]?.coding?.[0]?.display ??
    enc.type?.[0]?.text ??
    enc.class?.display ??
    enc.class?.code ??
    "Encounter"
  );
}

function RecentEncountersCard({ encounters }: { encounters: EncounterWithPatient[] }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Encounters
          </CardTitle>
          <Link
            href="/encounters"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {encounters.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            No encounters found
          </div>
        ) : (
          <div className="space-y-0.5">
            {encounters.map(({ encounter: enc, patient: p }) => {
              const patientName = p
                ? patientDisplayName(p)
                : (enc.subject?.display ?? "Unknown patient");
              const type = encounterTypeLabel(enc);
              const when = formatRelativeTime(enc.period?.start ?? enc.period?.end);
              const href = p ? `/patients/${p.id}` : "#";

              return (
                <Link
                  key={enc.id}
                  href={href}
                  className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <EncounterStatusPill status={enc.status} />
                    </div>
                    <p className="text-sm font-medium truncate">{patientName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{type}</p>
                  </div>
                  <p className="shrink-0 text-[11px] text-muted-foreground pt-0.5">{when}</p>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>

      {encounters.length > 0 && (
        <>
          <Separator />
          <div className="flex items-center gap-4 px-4 py-2.5 text-xs text-muted-foreground">
            {(["in-progress", "finished", "planned"] as const).map((s) => {
              const count = encounters.filter(({ encounter: e }) => e.status === s).length;
              if (!count) return null;
              const style = ENC_STATUS[s];
              return (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${style.cls.split(" ")[0]}`} />
                  {style.label}: {count}
                </span>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
