"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Pill, ChevronRight, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  searchMedications, isDischargeRx, isInpatientRx,
  patientDisplayName, getPatientMRN, formatDate,
  parseFhirId,
} from "@/lib/fhir-client"
import type { MedicationRequestWithPatient } from "@/lib/fhir-client"

const MED_STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-50 text-green-700 border-green-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  stopped:   "bg-orange-50 text-orange-700 border-orange-200",
  "on-hold": "bg-amber-50 text-amber-700 border-amber-200",
  draft:     "bg-slate-50 text-slate-600 border-slate-200",
}

function getMedCategoryBadge(med: MedicationRequestWithPatient["medication"]) {
  if (isDischargeRx(med)) return { label: "Discharge Rx", cls: "border-purple-200 bg-purple-50 text-purple-700" }
  if (isInpatientRx(med)) return { label: "Inpatient",    cls: "border-blue-200 bg-blue-50 text-blue-700" }
  return { label: "Standard", cls: "border-slate-200 bg-slate-50 text-slate-600" }
}

interface Props {
  initialData: MedicationRequestWithPatient[]
}

export function MedicationsSearch({ initialData }: Props) {
  const [status, setStatus]             = useState("active")
  const [rxCategory, setRxCategory]     = useState("")
  const [patientQuery, setPatientQuery] = useState("")
  const [results, setResults]           = useState<MedicationRequestWithPatient[]>(initialData)
  const [loading, setLoading]           = useState(false)
  const keyRef = useRef(0)

  useEffect(() => {
    const key = ++keyRef.current
    const delay = patientQuery.trim() ? 400 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchMedications({
        status:       status || undefined,
        rxCategory:   rxCategory || undefined,
        patientQuery: patientQuery.trim() || undefined,
        count:        60,
      })
        .then((r) => { if (key === keyRef.current) { setResults(r); setLoading(false) } })
        .catch(() => { if (key === keyRef.current) { setResults([]); setLoading(false) } })
    }, delay)
    return () => clearTimeout(t)
  }, [status, rxCategory, patientQuery])

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

        <Select value={rxCategory} onValueChange={(v) => setRxCategory(v ?? "")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            <SelectItem value="inpatient">Inpatient</SelectItem>
            <SelectItem value="discharge">Discharge Rx</SelectItem>
            <SelectItem value="community">Community</SelectItem>
            <SelectItem value="outpatient">Outpatient</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="stopped">Stopped</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading medications…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Pill className="h-8 w-8 opacity-30" />
          <span className="text-sm">No medications found</span>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead>SIG / Dosage</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Ordered</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ medication: med, patient }) => {
                const mrn      = patient ? getPatientMRN(patient) : null
                const patId    = parseFhirId(med.subject?.reference, "Patient")
                const encRef   = med.encounter?.reference
                const encId    = parseFhirId(encRef, "Encounter")
                const href     = encId ? `/encounters/${encId}` : patId ? `/patients/${patId}` : undefined
                const status   = med.status ?? "unknown"
                const statusCls = MED_STATUS_COLORS[status] ?? "bg-gray-50 text-gray-600 border-gray-200"
                const catBadge  = getMedCategoryBadge(med)
                const drugName  = med.medicationCodeableConcept?.text
                  ?? med.medicationCodeableConcept?.coding?.[0]?.display ?? "—"
                const sig = med.dosageInstruction?.[0]?.text ?? "—"

                return (
                  <TableRow key={med.id} className="group">
                    <TableCell className="font-medium">{drugName}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${catBadge.cls}`}>
                        {catBadge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate" title={sig}>
                      {sig}
                    </TableCell>
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
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(med.authoredOn)}
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
