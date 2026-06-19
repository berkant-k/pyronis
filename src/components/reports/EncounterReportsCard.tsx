"use client"

import { useState } from "react"
import { Download, FileText, Paperclip, Pencil, Plus } from "lucide-react"
import type { DiagnosticReport } from "@medplum/fhirtypes"
import {
  formatDate,
  diagnosticReportStatusColor,
  diagnosticReportCategoryColor,
  REPORT_CATEGORY_DISPLAY,
  REPORT_STATUS_DISPLAY,
} from "@/lib/fhir-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn, downloadAttachment } from "@/lib/utils"
import { DiagnosticReportFormDialog } from "./DiagnosticReportFormDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  patientId:      string
  encounterId:    string
  initialReports: DiagnosticReport[]
  patient?:       PatientInfo
}

export function EncounterReportsCard({ patientId, encounterId, initialReports, patient }: Props) {
  const [reports, setReports]       = useState<DiagnosticReport[]>(initialReports)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DiagnosticReport | undefined>(undefined)

  function handleSuccess(saved: DiagnosticReport) {
    setReports((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  function openNew()                      { setEditTarget(undefined); setDialogOpen(true) }
  function openEdit(r: DiagnosticReport)  { setEditTarget(r);         setDialogOpen(true) }

  return (
    <>
      <Card>
        <CardHeader className="pt-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Diagnostic Reports
            <Badge variant="secondary" className="ml-auto font-mono text-xs">
              {reports.length}
            </Badge>
            <button
              type="button"
              onClick={openNew}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs h-7")}
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </CardTitle>
        </CardHeader>

        {reports.length > 0 ? (
          <CardContent className="pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Conclusion</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => {
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
                        <StatusPill color={stsCls} label={REPORT_STATUS_DISPLAY[r.status ?? ""] ?? r.status ?? ""} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(r.effectiveDateTime ?? r.issued)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {r.conclusion
                          ? <span className="text-sm text-muted-foreground line-clamp-2">{r.conclusion}</span>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(r.presentedForm ?? []).filter((a) => a.data).length > 0 && (
                            <button
                              type="button"
                              title={`Download ${r.presentedForm!.filter((a) => a.data).length > 1 ? "attachments" : "attachment"}`}
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => {
                                const files = (r.presentedForm ?? []).filter((a) => a.data)
                                files.forEach((a, i) =>
                                  setTimeout(
                                    () => downloadAttachment(a.data!, a.contentType ?? "application/octet-stream", a.title ?? `attachment-${i + 1}`),
                                    i * 150,
                                  )
                                )
                              }}
                            >
                              {r.presentedForm!.filter((a) => a.data).length > 1
                                ? <Paperclip className="h-3.5 w-3.5" />
                                : <Download className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        ) : (
          <CardContent className="pb-5">
            <p className="text-sm text-muted-foreground text-center py-4">
              No diagnostic reports for this encounter
            </p>
          </CardContent>
        )}
      </Card>

      <DiagnosticReportFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        encounterId={encounterId}
        report={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </>
  )
}
