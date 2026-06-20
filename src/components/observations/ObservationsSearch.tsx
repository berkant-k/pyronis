"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Activity, ChevronRight, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  searchObservations, getObservationName, formatObservationValue,
  patientDisplayName, getPatientMRN, formatDateTime,
  parseFhirId,
} from "@/lib/fhir-client"
import type { ObservationWithPatient } from "@/lib/fhir-client"

const CATEGORIES = [
  { value: "vital-signs", label: "Vital Signs" },
  { value: "laboratory",  label: "Laboratory" },
  { value: "imaging",     label: "Imaging" },
  { value: "procedure",   label: "Procedure" },
  { value: "survey",      label: "Survey / Assessment" },
  { value: "exam",        label: "Exam" },
  { value: "therapy",     label: "Therapy" },
  { value: "activity",    label: "Activity" },
]

const STATUS_COLORS: Record<string, string> = {
  final:       "bg-green-50 text-green-700 border-green-200",
  registered:  "bg-blue-50 text-blue-700 border-blue-200",
  preliminary: "bg-amber-50 text-amber-700 border-amber-200",
  amended:     "bg-purple-50 text-purple-700 border-purple-200",
  cancelled:   "bg-red-50 text-red-700 border-red-200",
}

interface Props {
  initialData: ObservationWithPatient[]
}

export function ObservationsSearch({ initialData }: Props) {
  const [category, setCategory]         = useState("vital-signs")
  const [patientQuery, setPatientQuery] = useState("")
  const [results, setResults]           = useState<ObservationWithPatient[]>(initialData)
  const [loading, setLoading]           = useState(false)
  const keyRef = useRef(0)

  useEffect(() => {
    const key = ++keyRef.current
    const delay = patientQuery.trim() ? 400 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchObservations({
        category:     category || undefined,
        patientQuery: patientQuery.trim() || undefined,
        count:        60,
      })
        .then((r) => { if (key === keyRef.current) { setResults(r); setLoading(false) } })
        .catch(() => { if (key === keyRef.current) { setResults([]); setLoading(false) } })
    }, delay)
    return () => clearTimeout(t)
  }, [category, patientQuery])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            placeholder="Search by patient name or MRN…"
            className="pl-9"
          />
        </div>

        <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading observations…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Activity className="h-8 w-8 opacity-30" />
          <span className="text-sm">No observations found</span>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Observation</TableHead>
                <TableHead className="w-36">Value</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-36">Date</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ observation: obs, patient }) => {
                const mrn   = patient ? getPatientMRN(patient) : null
                const patId = parseFhirId(obs.subject?.reference, "Patient")
                const encRef = obs.encounter?.reference
                const encId  = parseFhirId(encRef, "Encounter")
                const href   = encId ? `/encounters/${encId}` : patId ? `/patients/${patId}` : undefined
                const cat    = obs.category?.[0]?.coding?.[0]?.code ?? ""
                const status = obs.status ?? "unknown"
                const statusCls = STATUS_COLORS[status] ?? "bg-gray-50 text-gray-600 border-gray-200"

                return (
                  <TableRow key={obs.id} className="group">
                    <TableCell className="font-medium">{getObservationName(obs)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatObservationValue(obs)}</TableCell>
                    <TableCell>
                      {patient ? (
                        <div className="text-sm">
                          <span className="font-medium">{patientDisplayName(patient)}</span>
                          {mrn && (
                            <span className="ml-2 font-mono text-[11px] text-primary">MR-{mrn}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cat && (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
                          {cat.replace(/-/g, " ")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(obs.effectiveDateTime)}
                    </TableCell>
                    <TableCell>
                      {href && (
                        <Link href={href} className="text-muted-foreground/40 group-hover:text-primary transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
