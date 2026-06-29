"use client"

import { useState } from "react"
import { LayoutGrid, Table2, Clock, Activity } from "lucide-react"
import type { Observation, Patient } from "@medplum/fhirtypes"
import { formatDate } from "@/lib/fhir-client"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { GrowthCharts } from "@/components/patients/GrowthCharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// LOINC-based clinical priority order
const VITAL_SORT_ORDER = [
  "8480-6",  // Systolic BP
  "8462-4",  // Diastolic BP
  "8867-4",  // Heart rate
  "9279-1",  // Respiratory rate
  "59408-5", // SpO2 (pulse ox)
  "2708-6",  // SpO2
  "8310-5",  // Body temperature
  "29463-7", // Body weight
  "8302-2",  // Body height
  "39156-5", // BMI
]

function sortIdx(key: string) {
  const i = VITAL_SORT_ORDER.indexOf(key)
  return i === -1 ? 9999 : i
}

interface LatestVital {
  key: string
  display: string
  value: number | undefined
  unit: string | undefined
  valueStr: string | undefined
  date: string | undefined
  count: number
}

function groupLatest(observations: Observation[]): LatestVital[] {
  const groups = new Map<string, Observation[]>()
  for (const obs of observations) {
    const key = obs.code?.coding?.[0]?.code ?? obs.code?.text ?? "unknown"
    const bucket = groups.get(key) ?? []
    bucket.push(obs)
    groups.set(key, bucket)
  }
  return [...groups.entries()]
    .map(([key, bucket]) => {
      const sorted = [...bucket].sort((a, b) =>
        (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
      )
      const latest = sorted[0]
      return {
        key,
        display: latest.code?.coding?.[0]?.display ?? latest.code?.text ?? key,
        value: latest.valueQuantity?.value,
        unit: latest.valueQuantity?.unit,
        valueStr: latest.valueString,
        date: latest.effectiveDateTime,
        count: sorted.length,
      }
    })
    .sort((a, b) => sortIdx(a.key) - sortIdx(b.key) || a.display.localeCompare(b.display))
}

// ─── Dashboard card ───────────────────────────────────────────────────────────

function VitalCard({ vital }: { vital: LatestVital }) {
  const displayVal =
    vital.value !== undefined ? String(vital.value) : vital.valueStr ?? "—"

  return (
    <div className="rounded-lg border bg-muted/30 px-3.5 py-3 flex flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
        {vital.display}
      </p>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-2xl font-bold tabular-nums leading-none text-foreground">
          {displayVal}
        </span>
        {vital.unit && (
          <span className="text-xs text-muted-foreground">{vital.unit}</span>
        )}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-1">
        <Clock className="h-2.5 w-2.5 shrink-0" />
        {formatDate(vital.date)}
      </div>
      {vital.count > 1 && (
        <p className="text-[10px] text-primary/70 font-medium">{vital.count} readings</p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VitalsDisplay({ observations, patient }: { observations: Observation[]; patient?: Patient }) {
  const [view, setView] = useState<"dashboard" | "table">("dashboard")

  if (!observations.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Activity className="h-8 w-8 opacity-25" />
        <p className="text-sm">No vital signs recorded</p>
      </div>
    )
  }

  const latestVitals = groupLatest(observations)
  const sortedAll = [...observations].sort((a, b) =>
    (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
  )

  return (
    <div className="space-y-4">
      <GrowthCharts patient={patient} observations={observations} />

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{latestVitals.length}</span> vital type{latestVitals.length !== 1 ? "s" : ""}
          {observations.length > latestVitals.length && (
            <> · <span className="font-medium text-foreground">{observations.length}</span> total readings</>
          )}
        </p>

        {/* Toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setView("dashboard")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              view === "dashboard"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              view === "table"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Table2 className="h-3.5 w-3.5" />
            Table
          </button>
        </div>
      </div>

      {view === "dashboard" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {latestVitals.map((v) => (
            <VitalCard key={v.key} vital={v} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Observation</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAll.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {o.code?.coding?.[0]?.display ?? o.code?.text ?? "—"}
                  </TableCell>
                  <TableCell>
                    {o.valueQuantity?.value ?? o.valueString ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.valueQuantity?.unit ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(o.effectiveDateTime)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
