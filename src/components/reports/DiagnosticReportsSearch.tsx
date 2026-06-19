"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { FileText, Search, Loader2, ChevronRight, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  searchDiagnosticReports, patientDisplayName, getPatientMRN, formatDate,
  diagnosticReportStatusColor, diagnosticReportCategoryColor,
  REPORT_CATEGORY_DISPLAY, REPORT_STATUS_DISPLAY,
} from "@/lib/fhir-client"
import type { DiagnosticReportWithPatient } from "@/lib/fhir-client"
import { DiagnosticReportFormDialog } from "./DiagnosticReportFormDialog"
import type { DiagnosticReport } from "@medplum/fhirtypes"
import { StatusPill } from "@/components/ui/StatusPill"

interface Props {
  initialData: DiagnosticReportWithPatient[]
}

// placeholder patient for "new cross-patient report" — dialog requires a patientId,
// so global create is triggered from the patient page instead; we only show edit here.
export function DiagnosticReportsSearch({ initialData }: Props) {
  const [category, setCategory]       = useState("")
  const [status, setStatus]           = useState("")
  const [patientQuery, setPatientQuery] = useState("")
  const [results, setResults]         = useState<DiagnosticReportWithPatient[]>(initialData)
  const [loading, setLoading]         = useState(false)
  const [editTarget, setEditTarget]   = useState<{ report: DiagnosticReport; patientId: string } | null>(null)
  const keyRef = useRef(0)

  useEffect(() => {
    const key = ++keyRef.current
    const delay = patientQuery.trim() ? 400 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchDiagnosticReports({
        category:     category || undefined,
        status:       status   || undefined,
        patientQuery: patientQuery.trim() || undefined,
        count:        80,
      })
        .then((r) => { if (key === keyRef.current) { setResults(r); setLoading(false) } })
        .catch(() => { if (key === keyRef.current) { setResults([]); setLoading(false) } })
    }, delay)
    return () => clearTimeout(t)
  }, [category, status, patientQuery])

  function handleEditSuccess(saved: DiagnosticReport) {
    setResults((prev) =>
      prev.map((item) =>
        item.report.id === saved.id ? { ...item, report: saved } : item
      )
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {Object.entries(REPORT_CATEGORY_DISPLAY).map(([code, label]) => (
              <SelectItem key={code} value={code}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {Object.entries(REPORT_STATUS_DISPLAY).map(([code, label]) => (
              <SelectItem key={code} value={code}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading reports…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FileText className="h-8 w-8 opacity-25" />
          <span className="text-sm">No diagnostic reports found</span>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Conclusion</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ report: r, patient }) => {
                const mrn    = patient ? getPatientMRN(patient) : null
                const patId  = r.subject?.reference?.startsWith("Patient/")
                  ? r.subject.reference.slice(8) : undefined
                const cat    = r.category?.[0]?.coding?.[0]?.code ?? ""
                const catCls = diagnosticReportCategoryColor(cat)
                const stsCls = diagnosticReportStatusColor(r.status ?? "")

                return (
                  <TableRow key={r.id} className="group">
                    <TableCell className="font-medium">
                      {r.code?.text ?? r.code?.coding?.[0]?.display ?? "—"}
                    </TableCell>
                    <TableCell>
                      {cat ? (
                        <StatusPill color={catCls} label={REPORT_CATEGORY_DISPLAY[cat] ?? cat} />
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      {patient ? (
                        <div className="text-sm">
                          <span className="font-medium">{patientDisplayName(patient)}</span>
                          {mrn && (
                            <span className="ml-2 font-mono text-[11px] text-primary">MR-{mrn}</span>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <StatusPill color={stsCls} label={REPORT_STATUS_DISPLAY[r.status ?? ""] ?? r.status ?? ""} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(r.effectiveDateTime ?? r.issued)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {r.conclusion ? (
                        <span className="text-sm text-muted-foreground line-clamp-2">{r.conclusion}</span>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {patId && patient && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => setEditTarget({ report: r, patientId: patId })}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5 rotate-45" />
                          </button>
                        )}
                        {patId && (
                          <Link
                            href={`/patients/${patId}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {editTarget && (
        <DiagnosticReportFormDialog
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null) }}
          patientId={editTarget.patientId}
          report={editTarget.report}
          onSuccess={(saved) => { handleEditSuccess(saved); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
