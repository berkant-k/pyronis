"use client"

import { useState, useLayoutEffect } from "react"
import { Loader2, Flag } from "lucide-react"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  createFlag, updateFlag, parseFlag, FLAG_CATEGORY_DISPLAY,
} from "@/lib/fhir-client"
import type { FlagInput } from "@/lib/fhir-client"
import type { Flag as FhirFlag } from "@medplum/fhirtypes"

const FLAG_SUGGESTIONS = [
  "Fall Risk",
  "Do Not Resuscitate (DNR)",
  "Isolation Required",
  "Contact Precautions",
  "Airborne Precautions",
  "Droplet Precautions",
  "Bleeding Risk",
  "Latex Allergy",
  "No Blood Products",
  "Language Barrier — Interpreter Required",
  "Aggressive / Combative Behavior",
  "Confusion / Dementia",
  "Pacemaker / ICD",
  "Implanted Device",
  "Wandering Risk",
  "Elopement Risk",
  "Self-Harm Risk",
  "Substance Abuse History",
  "Immunocompromised",
  "Aspiration Risk",
  "Pressure Ulcer Risk",
  "Seizure Precautions",
  "Neutropenic Precautions",
  "IV Access Difficulty",
  "Difficult Intubation",
]

type Category = FlagInput["category"]

interface FormState {
  code:        string
  category:    string
  status:      "active" | "inactive"
  periodStart: string
  periodEnd:   string
  author:      string
}

const DEFAULT: FormState = {
  code:        "",
  category:    "",
  status:      "active",
  periodStart: "",
  periodEnd:   "",
  author:      "",
}

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  patientId:    string
  encounterId?: string
  flag?:        FhirFlag
  onSuccess:    (saved: FhirFlag) => void
  patient?:     PatientInfo
}

export function FlagFormDialog({ open, onOpenChange, patientId, encounterId, flag, onSuccess, patient }: Props) {
  const [form, setForm]     = useState<FormState>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const isEdit = !!flag

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return
    setError(null)
    if (flag) {
      const p = parseFlag(flag)
      setForm({
        code:        p.code,
        category:    p.category ?? "",
        status:      p.status,
        periodStart: p.periodStart ?? "",
        periodEnd:   p.periodEnd ?? "",
        author:      p.author ?? "",
      })
    } else {
      setForm(DEFAULT)
    }
  }, [open, flag])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) { setError("Flag description is required"); return }
    setSaving(true)
    setError(null)
    try {
      const input: FlagInput = {
        patientId,
        encounterId,
        code:        form.code.trim(),
        category:    (form.category || undefined) as Category,
        status:      form.status,
        periodStart: form.periodStart || undefined,
        periodEnd:   form.periodEnd   || undefined,
        author:      form.author.trim() || undefined,
      }
      const saved = isEdit
        ? await updateFlag(flag!.id!, input)
        : await createFlag(input)
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
            <Flag className="h-4 w-4 text-muted-foreground" />
            {isEdit ? "Edit Flag" : "Add Patient Flag"}
          </DialogTitle>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form id="flag-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="flag-code">Flag Description *</Label>
            <Input
              id="flag-code"
              list="flag-suggestions"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="e.g. Fall Risk, DNR, Isolation Required…"
              required
              autoComplete="off"
            />
            <datalist id="flag-suggestions">
              {FLAG_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Uncategorised</SelectItem>
                  {Object.entries(FLAG_CATEGORY_DISPLAY).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["active", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className={cn(
                      "rounded-md border py-2 text-sm font-medium transition-colors",
                      form.status === s
                        ? s === "active"
                          ? "border-red-400 bg-red-50 text-red-800"
                          : "border-slate-300 bg-slate-50 text-slate-700"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {s === "active" ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="flag-start">Effective From</Label>
              <Input
                id="flag-start"
                type="date"
                value={form.periodStart}
                onChange={(e) => set("periodStart", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flag-end">Effective To</Label>
              <Input
                id="flag-end"
                type="date"
                value={form.periodEnd}
                onChange={(e) => set("periodEnd", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flag-author">Author / Noted By</Label>
            <Input
              id="flag-author"
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              placeholder="Clinician or department name"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </form>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="flag-form"
            disabled={saving}
            className={cn(buttonVariants(), "gap-2")}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Add flag"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
