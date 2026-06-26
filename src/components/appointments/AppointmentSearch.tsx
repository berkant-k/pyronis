"use client"

import { useState } from "react"
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
  patientDisplayName,
  formatDateTime,
  appointmentStatusColor,
} from "@/lib/fhir-client"
import { useAppointmentSearch } from "@/lib/query"
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

  const { data: results = [], isLoading, isFetching } = useAppointmentSearch(
    { patientQuery, status, dateFrom, dateTo },
    400,
    refreshKey,
  )
  const loading = isLoading || isFetching

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
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Patient</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              placeholder="Name or MRN…"
              className="pl-8 h-9 text-sm"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : (v ?? ""))}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value || "__all__"} value={o.value || "__all__"}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </button>
      )}

      {/* Results table */}
      <div className="rounded-md border bg-background">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading appointments…</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Search className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No appointments found</p>
            {hasFilters && <p className="text-xs">Try adjusting your filters</p>}
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {results.length} appointment{results.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(({ appointment: appt, patient: p }) => {
                  const name = p ? patientDisplayName(p) : (appt.participant?.[0]?.actor?.display ?? "Unknown")
                  const href = appt.id ? `/appointments/${appt.id}` : null
                  return (
                    <TableRow
                      key={appt.id}
                      className={href ? "cursor-pointer hover:bg-muted/50" : undefined}
                      onClick={href ? () => window.location.assign(href) : undefined}
                    >
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(appt.start)}
                      </TableCell>
                      <TableCell>
                        {appt.status && <StatusBadge status={appt.status} />}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {appt.reasonCode?.[0]?.text ?? appt.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {href && (
                          <Link href={href} className="text-muted-foreground hover:text-foreground">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  )
}
