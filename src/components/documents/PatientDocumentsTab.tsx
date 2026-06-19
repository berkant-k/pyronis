"use client"

import { useRef, useState, useLayoutEffect } from "react"
import { Upload, Download, Trash2, FileText, Loader2, FolderOpen } from "lucide-react"
import type { DocumentReference } from "@medplum/fhirtypes"
import {
  createDocument,
  deleteDocument,
  formatDate,
  DOC_TYPE_DISPLAY,
  getDocumentTitle,
  getDocumentType,
  getDocumentAuthor,
  getDocumentDescription,
} from "@/lib/fhir-client"
import { Card } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function docTypeBadgeClass(docType: string): string {
  const map: Record<string, string> = {
    "discharge-summary": "bg-blue-50 text-blue-700 border-blue-200",
    "referral":          "bg-purple-50 text-purple-700 border-purple-200",
    "lab-report":        "bg-green-50 text-green-700 border-green-200",
    "radiology-report":  "bg-cyan-50 text-cyan-700 border-cyan-200",
    "consent":           "bg-amber-50 text-amber-700 border-amber-200",
    "insurance":         "bg-orange-50 text-orange-700 border-orange-200",
    "external-record":   "bg-slate-50 text-slate-700 border-slate-200",
    "photo":             "bg-pink-50 text-pink-700 border-pink-200",
    "other":             "bg-gray-50 text-gray-600 border-gray-200",
  }
  return map[docType] ?? map["other"]
}

// ─── upload dialog ─────────────────────────────────────────────────────────────

interface FormState {
  title:       string
  docType:     string
  date:        string
  author:      string
  description: string
}

const DEFAULT: FormState = {
  title:       "",
  docType:     "other",
  date:        new Date().toISOString().slice(0, 10),
  author:      "",
  description: "",
}

interface DialogProps {
  open:         boolean
  onOpenChange: (v: boolean) => void
  patientId:    string
  onSuccess:    (saved: DocumentReference) => void
}

function DocumentUploadDialog({ open, onOpenChange, patientId, onSuccess }: DialogProps) {
  const [form, setForm]       = useState<FormState>(DEFAULT)
  const [file, setFile]       = useState<File | null>(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const fileRef               = useRef<HTMLInputElement>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return
    setForm(DEFAULT)
    setFile(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ""
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set(k: keyof FormState, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !form.title) set("title", f.name.replace(/\.[^.]+$/, ""))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError("Please select a file."); return }
    if (!form.title.trim()) { setError("Title is required."); return }
    setError(null)
    setSaving(true)
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(",")[1] ?? result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const saved = await createDocument({
        patientId,
        title:       form.title.trim(),
        docType:     form.docType,
        date:        form.date,
        author:      form.author.trim()      || undefined,
        description: form.description.trim() || undefined,
        contentType: file.type || "application/octet-stream",
        dataBase64,
        fileName:    file.name,
        fileSize:    file.size,
      })
      onSuccess(saved)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            Upload Document
          </DialogTitle>
        </DialogHeader>

        <form id="doc-upload-form" onSubmit={handleSubmit} className="space-y-4">
          {/* File picker */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File <span className="text-destructive">*</span></Label>
            <Input
              id="doc-file"
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-xs text-muted-foreground">{file.name} · {formatBytes(file.size)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="doc-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Document title"
                autoComplete="off"
              />
            </div>

            {/* Document type */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.docType} onValueChange={(v) => set("docType", v ?? "other")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_DISPLAY).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="doc-date">Date</Label>
              <Input
                id="doc-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <Label htmlFor="doc-author">Author / Source</Label>
              <Input
                id="doc-author"
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Clinician or institution"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-desc">Description</Label>
            <Textarea
              id="doc-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional notes about this document"
              rows={2}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </form>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)}
            className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </button>
          <button
            type="submit"
            form="doc-upload-form"
            disabled={saving || !file || !form.title.trim()}
            className={cn(buttonVariants(), "gap-2")}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Uploading…" : "Upload"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── tab ──────────────────────────────────────────────────────────────────────

interface Props {
  initialDocuments: DocumentReference[]
  patientId:        string
}

export function PatientDocumentsTab({ initialDocuments, patientId }: Props) {
  const [docs, setDocs]           = useState<DocumentReference[]>(initialDocuments)
  const [dialogOpen, setDialog]   = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)

  function handleSuccess(saved: DocumentReference) {
    setDocs((prev) => [saved, ...prev])
  }

  async function handleDelete(d: DocumentReference) {
    if (!d.id) return
    setDeleting(d.id)
    try {
      await deleteDocument(d.id)
      setDocs((prev) => prev.filter((x) => x.id !== d.id))
    } finally {
      setDeleting(null)
    }
  }

  function handleDownload(d: DocumentReference) {
    const attachment = d.content?.[0]?.attachment
    if (!attachment?.data) return
    const mimeType = attachment.contentType ?? "application/octet-stream"
    const a = document.createElement("a")
    a.href     = `data:${mimeType};base64,${attachment.data}`
    a.download = attachment.title ?? getDocumentTitle(d)
    a.click()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setDialog(true)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Document
        </button>
      </div>

      {!docs.length ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <FolderOpen className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm">No documents uploaded</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-40">Type</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Author / Source</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => {
                const docType    = getDocumentType(d)
                const typeLabel  = DOC_TYPE_DISPLAY[docType] ?? docType
                const typeCls    = docTypeBadgeClass(docType)
                const attachment = d.content?.[0]?.attachment
                const sizeBytes  = attachment?.size
                const desc       = getDocumentDescription(d)
                return (
                  <TableRow key={d.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                        <div>
                          <p className="font-medium text-sm">{getDocumentTitle(d)}</p>
                          {desc && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{desc}</p>
                          )}
                          {attachment?.title && attachment.title !== getDocumentTitle(d) && (
                            <p className="text-xs text-muted-foreground/60 font-mono">{attachment.title}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeCls}`}>
                        {typeLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(d.date)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getDocumentAuthor(d) || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sizeBytes != null ? formatBytes(sizeBytes) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {attachment?.data && (
                          <button
                            type="button"
                            onClick={() => handleDownload(d)}
                            title="Download"
                            className="text-muted-foreground/50 hover:text-primary transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(d)}
                          disabled={deleting === d.id}
                          title="Delete"
                          className="text-muted-foreground/50 hover:text-destructive transition-colors"
                        >
                          {deleting === d.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <DocumentUploadDialog
        open={dialogOpen}
        onOpenChange={setDialog}
        patientId={patientId}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
