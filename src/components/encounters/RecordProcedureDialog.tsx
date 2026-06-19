"use client"

import { useState, useLayoutEffect } from "react"
import { Plus, Pencil, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  recordProcedure,
  updateProcedureRecord,
  parseProcedureRecord,
  type ProcedureRecordInput,
} from "@/lib/fhir-client"
import type { Procedure } from "@medplum/fhirtypes"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

interface CreateProps {
  mode:         "create"
  patientId:    string
  encounterId:  string
  orderId?:     string
  initialData?: { procedureName?: string; bodySite?: string }
  onSaved:      (proc: Procedure) => void
  compact?:     boolean
  patient?:     PatientInfo
}

interface EditProps {
  mode:        "edit"
  patientId:   string
  encounterId: string
  procedure:   Procedure
  onSaved:     (proc: Procedure) => void
  patient?:    PatientInfo
}

type Props = CreateProps | EditProps

function nowLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const STATUSES = [
  { value: "completed",    label: "Completed" },
  { value: "in-progress",  label: "In Progress" },
  { value: "not-done",     label: "Not Done" },
  { value: "stopped",      label: "Stopped" },
  { value: "on-hold",      label: "On Hold" },
] as const

const OUTCOMES = [
  "Successful",
  "Partially successful",
  "Unsuccessful",
  "Abandoned – patient declined",
  "Abandoned – complication",
]

const COMMON_PROCEDURES = [
  "Wound dressing change", "Wound debridement", "Wound irrigation",
  "Wound closure (sutures)", "Wound closure (staples)", "Skin biopsy",
  "Incision and drainage (I&D)", "Laceration repair",
  "Peripheral IV insertion", "Peripheral IV removal",
  "Central venous catheter (CVC) insertion", "Central venous catheter removal",
  "PICC line insertion", "PICC line removal",
  "Arterial line insertion", "Arterial line removal",
  "Urinary catheter insertion (Foley)", "Urinary catheter removal",
  "Nasogastric tube insertion", "Nasogastric tube removal",
  "Endotracheal intubation", "Extubation", "Tracheostomy care",
  "Nasopharyngeal suctioning", "Nebulizer treatment",
  "12-lead ECG", "Defibrillation", "Cardioversion",
  "Lumbar puncture", "Thoracocentesis", "Paracentesis",
  "Joint aspiration (arthrocentesis)", "Bone marrow aspiration",
  "Chest tube insertion", "Chest tube removal",
  "Blood transfusion", "Platelet transfusion",
  "Circumcision", "Nail avulsion", "Foreign body removal",
  "Eye irrigation", "Nasal packing", "Ear irrigation",
]

const BODY_SITES = [
  "Head", "Face", "Neck", "Chest", "Abdomen", "Back", "Spine",
  "Left arm", "Right arm", "Left hand", "Right hand",
  "Left leg", "Right leg", "Left foot", "Right foot",
  "Left antecubital fossa", "Right antecubital fossa",
  "Bilateral", "Multiple sites",
]

export function RecordProcedureDialog(props: Props) {
  const isEdit = props.mode === "edit"

  const defaultProcedureName = isEdit
    ? (props.procedure.code?.text ?? "")
    : (props.initialData?.procedureName ?? "")

  const defaultBodySite = isEdit
    ? (props.procedure.bodySite?.[0]?.text ?? "")
    : (props.initialData?.bodySite ?? "")

  const [open, setOpen]           = useState(false)
  const [procedureName, setProcedureName] = useState(defaultProcedureName)
  const [status, setStatus]       = useState<ProcedureRecordInput["status"]>(
    isEdit ? (props.procedure.status as ProcedureRecordInput["status"] ?? "completed") : "completed"
  )
  const [performedStart, setPerformedStart] = useState(
    isEdit ? (props.procedure.performedDateTime ?? props.procedure.performedPeriod?.start ?? nowLocal()) : nowLocal()
  )
  const [performedEnd, setPerformedEnd]   = useState(
    isEdit ? (props.procedure.performedPeriod?.end ?? "") : ""
  )
  const [bodySite, setBodySite]   = useState(defaultBodySite)
  const [performer, setPerformer] = useState(
    isEdit ? (props.procedure.performer?.[0]?.actor?.display ?? "") : ""
  )
  const [outcome, setOutcome]     = useState(
    isEdit ? (props.procedure.outcome?.text ?? "") : ""
  )
  const [complication, setComplication] = useState(
    isEdit ? (props.procedure.complication?.[0]?.text ?? "") : ""
  )
  const [statusReason, setStatusReason] = useState(
    isEdit ? ((props.procedure as { statusReason?: { text?: string } }).statusReason?.text ?? "") : ""
  )
  const [notes, setNotes]         = useState(
    isEdit ? (props.procedure.note?.[0]?.text ?? "") : ""
  )
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Reset form when opening in create mode
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return
    if (!isEdit) {
      setProcedureName(props.initialData?.procedureName ?? "")
      setBodySite(props.initialData?.bodySite ?? "")
      setStatus("completed")
      setPerformedStart(nowLocal())
      setPerformedEnd("")
      setPerformer("")
      setOutcome("")
      setComplication("")
      setStatusReason("")
      setNotes("")
      setError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!procedureName.trim()) return
    setSaving(true); setError(null)
    try {
      const input: ProcedureRecordInput = {
        patientId:     props.patientId,
        encounterId:   props.encounterId,
        procedureName: procedureName.trim(),
        status,
        performedStart: new Date(performedStart).toISOString(),
        performedEnd:   performedEnd.trim() ? new Date(performedEnd).toISOString() : undefined,
        bodySite:       bodySite.trim()      || undefined,
        performer:      performer.trim()     || undefined,
        outcome:        outcome.trim()       || undefined,
        complication:   complication.trim()  || undefined,
        statusReason:   statusReason.trim()  || undefined,
        notes:          notes.trim()         || undefined,
        basedOnOrderId: !isEdit ? (props as CreateProps).orderId : parseProcedureRecord(props.procedure).basedOnOrderId,
      }
      const result = isEdit
        ? await updateProcedureRecord(props.procedure.id!, input)
        : await recordProcedure(input)
      setOpen(false)
      props.onSaved(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save procedure")
    } finally {
      setSaving(false)
    }
  }

  const needsReason = status === "not-done" || status === "stopped"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger
          title="Edit procedure"
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </DialogTrigger>
      ) : (props as CreateProps).compact ? (
        <DialogTrigger className={cn(
          buttonVariants({ size: "sm" }),
          "h-7 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-2.5"
        )}>
          <Plus className="h-3.5 w-3.5" />
          Perform
        </DialogTrigger>
      ) : (
        <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus className="h-3.5 w-3.5" />
          Record Procedure
        </DialogTrigger>
      )}

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Procedure Record" : "Record Procedure"}</DialogTitle>
        </DialogHeader>
        {props.patient && <PatientBanner {...props.patient} />}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Procedure name */}
          <div className="space-y-1.5">
            <Label htmlFor="rp-name">Procedure <span className="text-destructive">*</span></Label>
            <Input
              id="rp-name"
              list="rp-name-list"
              placeholder="Procedure name"
              value={procedureName}
              onChange={(e) => setProcedureName(e.target.value)}
              required
            />
            <datalist id="rp-name-list">
              {COMMON_PROCEDURES.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus((v ?? "completed") as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsReason && (
            <div className="space-y-1.5">
              <Label htmlFor="rp-reason">
                {status === "not-done" ? "Reason Not Done" : "Reason Stopped"}
              </Label>
              <Input
                id="rp-reason"
                placeholder="e.g. Patient refused, Contraindicated"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              />
            </div>
          )}

          {/* Performed start + end */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-start">
                {performedEnd ? "Start time" : "Time performed"} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rp-start"
                type="datetime-local"
                value={performedStart}
                onChange={(e) => setPerformedStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-end">End time <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="rp-end"
                type="datetime-local"
                value={performedEnd}
                onChange={(e) => setPerformedEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Body site + Performer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-site">Body Site</Label>
              <Input
                id="rp-site"
                list="rp-site-list"
                placeholder="e.g. Left arm"
                value={bodySite}
                onChange={(e) => setBodySite(e.target.value)}
              />
              <datalist id="rp-site-list">
                {BODY_SITES.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-performer">Performed By</Label>
              <Input
                id="rp-performer"
                placeholder="Clinician name"
                value={performer}
                onChange={(e) => setPerformer(e.target.value)}
              />
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Complications */}
          <div className="space-y-1.5">
            <Label htmlFor="rp-complication">Complications <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="rp-complication"
              placeholder="e.g. Bleeding, Infection, Vasovagal response"
              value={complication}
              onChange={(e) => setComplication(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="rp-notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="rp-notes"
              rows={2}
              placeholder="Additional observations or follow-up actions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !procedureName.trim()}
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Update" : "Record"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
