"use client"

import { useState, useLayoutEffect } from "react"
import { Loader2, ScrollText } from "lucide-react"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  createAdvanceDirective,
  updateAdvanceDirective,
  getDirectiveNotes,
  getDirectiveType,
  ADVANCE_DIRECTIVE_DISPLAY,
  ADVANCE_DIRECTIVE_STATUS_DISPLAY,
} from "@/lib/fhir-client"
import type { AdvanceDirectiveInput } from "@/lib/fhir-client"
import type { Consent } from "@medplum/fhirtypes"

interface FormState {
  type:    string
  status:  "active" | "inactive" | "draft" | "rejected"
  date:    string
  witness: string
  notes:   string
}

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT: FormState = {
  type:    "",
  status:  "active",
  date:    today(),
  witness: "",
  notes:   "",
}

function fromResource(c: Consent): FormState {
  return {
    type:    getDirectiveType(c),
    status:  (c.status as FormState["status"]) ?? "active",
    date:    c.dateTime?.slice(0, 10) ?? today(),
    witness: (c.performer?.[0] as { display?: string })?.display ?? "",
    notes:   getDirectiveNotes(c) ?? "",
  }
}

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  patientId:    string
  directive?:   Consent
  onSuccess:    (saved: Consent) => void
  patient?:     PatientInfo
}

export function AdvanceDirectiveFormDialog({ open, onOpenChange, patientId, directive, onSuccess, patient }: Props) {
  const [form, setForm]     = useState<FormState>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const isEdit = !!directive

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return
    setError(null)
    setForm(directive ? fromResource(directive) : { ...DEFAULT, date: today() })
  }, [open, directive])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.type)   { setError("Directive type is required"); return }
    if (!form.date)   { setError("Date is required"); return }
    setSaving(true)
    setError(null)
    try {
      const input: AdvanceDirectiveInput = {
        patientId,
        type:    form.type,
        status:  form.status,
        date:    form.date,
        witness: form.witness.trim() || undefined,
        notes:   form.notes.trim()   || undefined,
      }
      const saved = isEdit
        ? await updateAdvanceDirective(directive!.id!, input)
        : await createAdvanceDirective(input)
      onSuccess(saved)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            {isEdit ? "Edit Advance Directive" : "Add Advance Directive"}
          </DialogTitle>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form id="adr-form" onSubmit={handleSubmit} className="space-y-4">

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Directive Type *</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(ADVANCE_DIRECTIVE_DISPLAY).map(([code, label]) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", (v ?? "active") as FormState["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ADVANCE_DIRECTIVE_STATUS_DISPLAY).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adr-date">Date Recorded *</Label>
              <Input
                id="adr-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Witness */}
          <div className="space-y-1.5">
            <Label htmlFor="adr-witness">Witnessed / Recorded By</Label>
            <Input
              id="adr-witness"
              value={form.witness}
              onChange={(e) => set("witness", e.target.value)}
              placeholder="Clinician or witness name"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="adr-notes">Notes / Details</Label>
            <Textarea
              id="adr-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional instructions, conditions, or context…"
              rows={3}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </form>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </button>
          <button type="submit" form="adr-form" disabled={saving} className={cn(buttonVariants(), "gap-2")}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Add directive"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
