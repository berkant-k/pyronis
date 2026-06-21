"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Patient } from "@medplum/fhirtypes";
import {
  searchEncounters,
  patientDisplayName,
  formatDate,
  getPatientMRN,
  getEncounterVisitId,
  encounterStatusColor,
  getEncounterTriageAcuity,
  triageAcuityColor,
  triageAcuityLabel,
  type EncounterWithPatient,
} from "@/lib/fhir-client";
import { StatusPill } from "@/components/ui/StatusPill";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2, Calendar, X, Stethoscope } from "lucide-react";

const STATUSES = [
  { value: "in-progress", label: "In Progress" },
  { value: "finished",    label: "Finished" },
  { value: "planned",     label: "Planned" },
  { value: "cancelled",   label: "Cancelled" },
  { value: "on-hold",     label: "On Hold" },
];

const CLASSES = [
  { value: "AMB",  label: "Ambulatory" },
  { value: "IMP",  label: "Inpatient" },
  { value: "EMER", label: "Emergency" },
  { value: "VR",   label: "Virtual" },
  { value: "HH",   label: "Home Health" },
];

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const label = STATUSES.find((s) => s.value === status)?.label ?? status;
  return <StatusPill color={encounterStatusColor(status)} label={label} />;
}

function patientInitials(p: Patient): string {
  const name = p.name?.find((n) => !n.extension?.length) ?? p.name?.[0];
  return (
    ((name?.given?.[0]?.[0] ?? "") + (name?.family?.[0] ?? "")).toUpperCase() || "?"
  );
}

function encounterTypeLabel(enc: EncounterWithPatient["encounter"]): string {
  return (
    enc.type?.[0]?.coding?.[0]?.display ??
    enc.type?.[0]?.text ??
    "—"
  );
}

function classLabel(enc: EncounterWithPatient["encounter"]): string {
  const code = enc.class?.code ?? "";
  return CLASSES.find((c) => c.value === code)?.label ?? enc.class?.display ?? code ?? "—";
}

export function EncounterSearch() {
  const router = useRouter();

  const [patientQuery, setPatientQuery] = useState("");
  const [practitionerQuery, setPractitionerQuery] = useState("");
  const [status, setStatus] = useState("");
  const [classCode, setClassCode] = useState("");
  const [encounters, setEncounters] = useState<EncounterWithPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const keyRef = useRef(0);
  const latestRef = useRef({ patientQuery: "", practitionerQuery: "", status: "", classCode: "" });

  function runSearch(pq: string, prq: string, st: string, cc: string) {
    const key = ++keyRef.current;
    latestRef.current = { patientQuery: pq, practitionerQuery: prq, status: st, classCode: cc };
    setLoading(true);
    searchEncounters({
      patientQuery: pq.trim() || undefined,
      practitionerQuery: prq.trim() || undefined,
      status: st || undefined,
      classCode: cc || undefined,
    })
      .then((results) => {
        if (key === keyRef.current) setEncounters(results);
      })
      .catch(() => {
        if (key === keyRef.current) setEncounters([]);
      })
      .finally(() => {
        if (key === keyRef.current) setLoading(false);
      });
  }

  // Initial load
  useEffect(() => {
    const t = setTimeout(() => runSearch("", "", "", ""), 0);
    return () => clearTimeout(t);
  }, []);

  // Status / class filters — immediate
  useEffect(() => {
    const { patientQuery: pq, practitionerQuery: prq } = latestRef.current;
    const t = setTimeout(() => runSearch(pq, prq, status, classCode), 0);
    return () => clearTimeout(t);
  }, [status, classCode]);

  // Patient text — debounced
  useEffect(() => {
    const t = setTimeout(() => {
      const { practitionerQuery: prq, status: st, classCode: cc } = latestRef.current;
      runSearch(patientQuery, prq, st, cc);
    }, 400);
    return () => clearTimeout(t);
  }, [patientQuery]);

  // Practitioner text — debounced
  useEffect(() => {
    const t = setTimeout(() => {
      const { patientQuery: pq, status: st, classCode: cc } = latestRef.current;
      runSearch(pq, practitionerQuery, st, cc);
    }, 400);
    return () => clearTimeout(t);
  }, [practitionerQuery]);

  const hasFilters = Boolean(patientQuery || practitionerQuery || status || classCode);

  function clearFilters() {
    setPatientQuery("");
    setPractitionerQuery("");
    setStatus("");
    setClassCode("");
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            placeholder="Search by patient name or MRN…"
            className="pl-9 pr-8"
            autoComplete="off"
          />
          {patientQuery && (
            <button
              type="button"
              onClick={() => setPatientQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear patient search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={practitionerQuery}
            onChange={(e) => setPractitionerQuery(e.target.value)}
            placeholder="Search by practitioner name…"
            className="pl-9 pr-8"
            autoComplete="off"
          />
          {practitionerQuery && (
            <button
              type="button"
              onClick={() => setPractitionerQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear practitioner search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={classCode || "__all__"} onValueChange={(v) => setClassCode(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All classes</SelectItem>
            {CLASSES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 h-8 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      <div className="rounded-md border bg-background">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading encounters…</span>
          </div>
        ) : encounters.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Calendar className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No encounters found</p>
            {hasFilters && (
              <p className="text-xs">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {encounters.length} encounter{encounters.length !== 1 ? "s" : ""}
                {hasFilters ? " matching your filters" : " (most recent)"}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Visit ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Triage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encounters.map(({ encounter: enc, patient: p }) => {
                  const name = p ? patientDisplayName(p) : (enc.subject?.display ?? "Unknown patient");
                  const mrn = p ? getPatientMRN(p) : null;
                  const visitId = getEncounterVisitId(enc);
                  const href = enc.id ? `/encounters/${enc.id}` : null;
                  const triageCode = getEncounterTriageAcuity(enc);

                  return (
                    <TableRow
                      key={enc.id}
                      className={href ? "cursor-pointer hover:bg-muted/50" : undefined}
                      onClick={href ? () => router.push(href) : undefined}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p ? (
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="text-xs">{patientInitials(p)}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            {mrn && (
                              <p className="font-mono text-[10px] text-muted-foreground">MR-{mrn}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {visitId ? (
                          <span className="font-mono text-xs font-semibold text-primary">
                            VID-{visitId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {encounterTypeLabel(enc)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {classLabel(enc)}
                      </TableCell>
                      <TableCell>
                        {triageCode ? (
                          <StatusPill color={triageAcuityColor(triageCode)} label={triageAcuityLabel(triageCode)} />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={enc.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(enc.period?.start ?? enc.period?.end)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
}
