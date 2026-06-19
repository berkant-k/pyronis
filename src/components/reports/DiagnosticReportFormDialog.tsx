"use client"

import { useState, useLayoutEffect, useRef } from "react"
import { Download, Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react"
import type { DiagnosticReport } from "@medplum/fhirtypes"
import {
  createDiagnosticReport, updateDiagnosticReport, formatDate,
  REPORT_CATEGORY_DISPLAY, REPORT_STATUS_DISPLAY,
  type DiagnosticReportInput,
} from "@/lib/fhir-client"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn, downloadAttachment } from "@/lib/utils"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

const REPORT_SUGGESTIONS = [
  // Laboratory
  "CBC (Complete Blood Count)",
  "BMP (Basic Metabolic Panel)",
  "CMP (Complete Metabolic Panel)",
  "Lipid Panel",
  "HbA1c (Glycated Hemoglobin)",
  "TSH (Thyroid Stimulating Hormone)",
  "Free T4",
  "Liver Function Tests",
  "Kidney Function Panel",
  "Urinalysis",
  "Blood Culture",
  "Urine Culture",
  "PT / INR",
  "APTT",
  "D-Dimer",
  "Troponin I",
  "Troponin T",
  "NT-proBNP / BNP",
  "CRP (C-Reactive Protein)",
  "ESR (Erythrocyte Sedimentation Rate)",
  "Ferritin",
  "Iron Studies",
  "Vitamin D (25-OH)",
  "Vitamin B12",
  "Folate",
  "HbsAg (Hepatitis B Surface Antigen)",
  "Anti-HCV (Hepatitis C Antibody)",
  "HIV Antibody",
  "COVID-19 PCR",
  "Influenza A/B PCR",
  "Urine Pregnancy Test (hCG)",
  "Blood Group & Cross-Match",
  "Coagulation Screen",
  "Electrolytes Panel",
  "Arterial Blood Gas (ABG)",
  // Radiology
  "Chest X-Ray",
  "Abdomen X-Ray",
  "CT Head without contrast",
  "CT Head with contrast",
  "CT Chest without contrast",
  "CT Chest with contrast",
  "CT Abdomen & Pelvis",
  "CT Pulmonary Angiography (CTPA)",
  "CT Coronary Angiography",
  "MRI Brain without contrast",
  "MRI Brain with contrast",
  "MRI Spine – Cervical",
  "MRI Spine – Lumbar",
  "MRI Knee",
  "MRI Shoulder",
  "MRI Abdomen",
  "Ultrasound – Abdomen",
  "Ultrasound – Pelvis",
  "Ultrasound – Thyroid",
  "Doppler Ultrasound – Lower Extremity",
  "Echocardiogram (TTE)",
  "Echocardiogram (TEE)",
  "ECG / EKG",
  "PET Scan",
  "Bone Scan (Scintigraphy)",
  "Nuclear Stress Test",
  // Pathology
  "Biopsy – Skin",
  "Biopsy – Liver",
  "Biopsy – Kidney",
  "Biopsy – Bone Marrow",
  "Pap Smear",
  "Fine Needle Aspiration (FNA)",
  "Surgical Pathology",
  "Sputum Culture",
  "Stool Culture",
  "Pulmonary Function Tests (PFTs)",
]

const STATUSES: DiagnosticReportInput["status"][] = [
  "registered", "partial", "preliminary", "final", "amended", "corrected", "appended", "cancelled",
]

interface AttachmentItem {
  title:       string
  contentType: string
  data:        string
}

interface FormState {
  code:          string
  category:      string
  status:        DiagnosticReportInput["status"]
  effectiveDate: string
  conclusion:    string
  performer:     string
}

const EMPTY: FormState = {
  code:          "",
  category:      "",
  status:        "registered",
  effectiveDate: "",
  conclusion:    "",
  performer:     "",
}

interface Props {
  open:        boolean
  onOpenChange: (v: boolean) => void
  patientId:   string
  encounterId?: string
  report?:     DiagnosticReport
  onSuccess:   (saved: DiagnosticReport) => void
  patient?:    PatientInfo
}

function formatBytes(base64: string): string {
  const bytes = Math.round(base64.length * 0.75)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/")) return <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
  if (contentType === "application/pdf") return <FileText className="h-4 w-4 shrink-0 text-red-500" />
  return <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
}

export function DiagnosticReportFormDialog({
  open, onOpenChange, patientId, encounterId, report, onSuccess, patient,
}: Props) {
  const isEdit = !!report

  const [form, setForm]             = useState<FormState>(EMPTY)
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) { setError(null); return }
    if (report) {
      const cat = report.category?.[0]?.coding?.[0]?.code ?? ""
      setForm({
        code:          report.code?.text ?? report.code?.coding?.[0]?.display ?? "",
        category:      cat,
        status:        (report.status ?? "registered") as DiagnosticReportInput["status"],
        effectiveDate: report.effectiveDateTime?.slice(0, 10) ?? "",
        conclusion:    report.conclusion ?? "",
        performer:     (report.performer?.[0] as { display?: string } | undefined)?.display ?? "",
      })
      setAttachments(
        (report.presentedForm ?? [])
          .filter((a) => a.data)
          .map((a) => ({
            title:       a.title ?? "Attachment",
            contentType: a.contentType ?? "application/octet-stream",
            data:        a.data!,
          }))
      )
    } else {
      setForm({ ...EMPTY, effectiveDate: new Date().toISOString().slice(0, 10) })
      setAttachments([])
    }
  }, [open, report])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        const [header, base64] = dataUrl.split(",")
        const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream"
        setAttachments((prev) => [...prev, { title: file.name, contentType: mime, data: base64 }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) { setError("Report name is required."); return }
    setSaving(true)
    setError(null)
    try {
      const input: DiagnosticReportInput = {
        patientId,
        encounterId,
        code:          form.code.trim(),
        category:      form.category || undefined,
        status:        form.status,
        effectiveDate: form.effectiveDate || undefined,
        conclusion:    form.conclusion.trim() || undefined,
        performer:     form.performer.trim() || undefined,
        presentedForm: attachments.length > 0 ? attachments : undefined,
      }
      const saved = isEdit
        ? await updateDiagnosticReport(report!.id!, input)
        : await createDiagnosticReport(input)
      onSuccess(saved)
      onOpenChange(false)
    } catch {
      setError("Failed to save report. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const todayLabel = report
    ? `Last updated ${formatDate(report.meta?.lastUpdated)}`
    : "New report"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Diagnostic Report" : "New Diagnostic Report"}</DialogTitle>
          <p className="text-xs text-muted-foreground">{todayLabel}</p>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form id="dr-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Report name */}
          <div className="space-y-1.5">
            <Label htmlFor="dr-code">Report / Test Name <span className="text-destructive">*</span></Label>
            <Input
              id="dr-code"
              list="dr-code-list"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="e.g. CBC, Chest X-Ray, Biopsy – Liver"
              autoComplete="off"
            />
            <datalist id="dr-code-list">
              {REPORT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {Object.entries(REPORT_CATEGORY_DISPLAY).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status <span className="text-destructive">*</span></Label>
              <Select value={form.status} onValueChange={(v) => set("status", (v ?? "registered") as DiagnosticReportInput["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{REPORT_STATUS_DISPLAY[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Effective date */}
            <div className="space-y-1.5">
              <Label htmlFor="dr-date">Report Date</Label>
              <Input
                id="dr-date"
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set("effectiveDate", e.target.value)}
              />
            </div>

            {/* Performer */}
            <div className="space-y-1.5">
              <Label htmlFor="dr-performer">Performed by</Label>
              <Input
                id="dr-performer"
                value={form.performer}
                onChange={(e) => set("performer", e.target.value)}
                placeholder="Clinician / lab"
              />
            </div>
          </div>

          {/* Conclusion / Impression */}
          <div className="space-y-1.5">
            <Label htmlFor="dr-conclusion">Conclusion / Impression</Label>
            <textarea
              id="dr-conclusion"
              value={form.conclusion}
              onChange={(e) => set("conclusion", e.target.value)}
              placeholder="Summary findings, impression, or result interpretation…"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attachments</Label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 h-7 text-xs")}
              >
                <Paperclip className="h-3 w-3" />
                Attach file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,image/tiff"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No attachments. PDF and image files supported.</p>
            ) : (
              <ul className="space-y-1.5">
                {attachments.map((att, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <AttachmentIcon contentType={att.contentType} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{att.title}</p>
                      <p className="text-xs text-muted-foreground">{att.contentType} · {formatBytes(att.data)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(att.data, att.contentType, att.title)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Download attachment"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(buttonVariants({ variant: "outline" }))}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="dr-form"
            className={cn(buttonVariants(), "gap-1.5")}
            disabled={saving}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Create report"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
