"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Search, X, Loader2, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  searchAppointments,
  patientDisplayName,
  formatDateTime,
  appointmentStatusColor,
} from "@/lib/fhir-client"
import type { AppointmentWithPatient } from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"

const STATUS_OPTIONS = [
  { value: "",          label: "All statuses" },
  { value: "proposed",  label: "Proposed" },
  { value: "pending",   label: "Pending" },
  { value: "booked",    label: "Booked" },
  { value: "arrived",   label: "Arrived" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "noshow",    label: "No-show" },
  { value: "checked-in","label": "Checked-in" },
  { value: "waitlist",  label: "Waitlist" },
]

function StatusBadge({ status }: { status: string }) {
  return (
    <StatusPill color={appointmentStatusColor(status)} label={status.replace(/-/g, " ")} />
  )
}

export function AppointmentSearch({ refreshKey = 0 }: { refreshKey?: number }) {
  const [patientQuery, setPatientQuery] = useState("")
  const [status, setStatus] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [results, setResults] = useState<AppointmentWithPatient[]>([])
  const [loading, setLoading] = useState(false)
  const keyRef = useRef(0)
  const prevPatientQueryRef = useRef(patientQuery)

  const runSearch = useCallback(() => {
    const key = ++keyRef.current
    setLoading(true)
    searchAppointments({ patientQuery, status, dateFrom, dateTo })
      .then((r) => { if (key === keyRef.current) setResults(r) })
      .catch(() => { if (key === keyRef.current) setResults([]) })
      .finally(() => { if (key === keyRef.current) setLoading(false) })
  }, [patientQuery, status, dateFrom, dateTo])

  // Debounce patient typing; fire immediately on filter or refresh changes
  useEffect(() => {
    const key = ++keyRef.current
    const patientQueryChanged = patientQuery !== prevPatientQueryRef.current
    prevPatientQueryRef.current = patientQuery
    const delay = patientQueryChanged && patientQuery.trim() ? 400 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchAppointments({ patientQuery, status, dateFrom, dateTo })
        .then((r) => { if (key === keyRef.current) setResults(r) })
        .catch(() => { if (key === keyRef.current) setResults([]) })
        .finally(() => { if (key === keyRef.current) setLoading(false) })
    }, delay)
    return () => clearTimeout(t)
  }, [patientQuery, status, dateFrom, dateTo, refreshKey])

  void runSearch // satisfy lint

  function clearFilters() {
    setPatientQuery("")
    setStatus("")
    setDateFrom("")
    setDateTo("")
  }

  const hasFilters = patientQuery || status || dateFrom || dateTo

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Patient search */}
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            placeholder="Patient name or MRN…"
            className="pl-8"
          />
          {patientQuery && (
            <button
              onClick={() => setPatientQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status */}
        <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date from */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        {/* Date to */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear filters
        </button>
      )}

      {/* Results */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Searching…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  {hasFilters ? "No appointments match your filters." : "No appointments found."}
                </TableCell>
              </TableRow>
            ) : (
              results.map(({ appointment, patient }) => {
                const apptType = appointment.appointmentType?.text ??
                  appointment.appointmentType?.coding?.[0]?.display ?? "—"
                const service = appointment.serviceType?.[0]?.text ?? "—"
                return (
                  <TableRow key={appointment.id} className="group cursor-pointer hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium">
                      {patient ? patientDisplayName(patient) : (
                        <span className="text-muted-foreground text-xs italic">Unknown patient</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(appointment.start)}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {apptType === "—" ? <span className="text-muted-foreground">—</span> : apptType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {service === "—" ? <span className="text-muted-foreground">—</span> : service}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={appointment.status ?? "unknown"} />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/appointments/${appointment.id}`}
                        className="flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {!loading && results.length > 0 && (
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            {results.length} appointment{results.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}
