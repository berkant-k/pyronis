"use client"

import { useState, useLayoutEffect } from "react"
import type { AllergyIntolerance } from "@medplum/fhirtypes"
import {
  createAllergyIntolerance,
  updateAllergyIntolerance,
  parseAllergyIntolerance,
  type AllergyIntoleranceInput,
} from "@/lib/fhir-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

// ─── Common substance suggestions ────────────────────────────────────────────

const SUBSTANCE_SUGGESTIONS = [
  // Medications
  "Penicillin", "Amoxicillin", "Ampicillin", "Cephalosporins", "Sulfonamides",
  "Aspirin", "Ibuprofen", "Naproxen", "NSAIDs", "Opioids", "Codeine", "Morphine",
  "Metformin", "Statins", "ACE Inhibitors", "Contrast media", "Latex",
  // Food
  "Peanuts", "Tree nuts", "Shellfish", "Fish", "Cow's milk", "Eggs", "Wheat",
  "Soy", "Sesame", "Gluten",
  // Environment
  "Bee venom", "Wasp venom", "Dust mites", "Pollen", "Pet dander", "Mold",
]

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = Omit<AllergyIntoleranceInput, "patientId">

const DEFAULT_FORM: FormState = {
  code: "",
  type: "allergy",
  category: undefined,
  criticality: undefined,
  clinicalStatus: "active",
  verificationStatus: "unconfirmed",
  onsetDate: "",
  reactionManifestation: "",
  reactionSeverity: undefined,
  note: "",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  allergy?: AllergyIntolerance
  onSuccess: (a: AllergyIntolerance) => void
  patient?: PatientInfo
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AllergyFormDialog({ open, onOpenChange, patientId, allergy, onSuccess, patient }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const isEdit = !!allergy

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (open) {
      setForm(allergy ? (() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { patientId: _patientId, ...rest } = parseAllergyIntolerance(allergy)
        return { ...DEFAULT_FORM, ...rest }
      })() : DEFAULT_FORM)
      setError("")
    }
  }, [open, allergy])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function optVal<T>(v: string, empty: T): T | string {
    return v === "__none__" ? empty : v
  }

  async function handleSave() {
    if (!form.code.trim()) { setError("Substance is required."); return }
    setSaving(true)
    setError("")
    try {
      const input: AllergyIntoleranceInput = {
        ...form,
        patientId,
        code: form.code.trim(),
        onsetDate: form.onsetDate || undefined,
        reactionManifestation: form.reactionManifestation?.trim() || undefined,
        note: form.note?.trim() || undefined,
      }
      const saved = isEdit && allergy!.id
        ? await updateAllergyIntolerance(allergy!.id, input)
        : await createAllergyIntolerance(input)
      onSuccess(saved)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Allergy / Intolerance" : "Record Allergy / Intolerance"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the details for this allergy or intolerance record." : "Add a new allergy or intolerance for this patient."}
          </DialogDescription>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">

          {/* Substance */}
          <div className="space-y-1.5">
            <Label htmlFor="al-code">
              Substance <span className="text-destructive">*</span>
            </Label>
            <Input
              id="al-code"
              list="al-code-list"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="e.g. Penicillin, Peanuts, Latex…"
              autoComplete="off"
            />
            <datalist id="al-code-list">
              {SUBSTANCE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type ?? "__none__"} onValueChange={(v) => set("type", optVal(v ?? "", undefined) as FormState["type"])}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allergy">Allergy</SelectItem>
                  <SelectItem value="intolerance">Intolerance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category ?? "__none__"} onValueChange={(v) => set("category", optVal(v ?? "", undefined) as FormState["category"])}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="biologic">Biologic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clinical status + Verification */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Clinical Status</Label>
              <Select value={form.clinicalStatus} onValueChange={(v) => set("clinicalStatus", (v ?? "active") as FormState["clinicalStatus"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Verification</Label>
              <Select value={form.verificationStatus} onValueChange={(v) => set("verificationStatus", (v ?? "unconfirmed") as FormState["verificationStatus"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="refuted">Refuted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Criticality + Onset */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Criticality</Label>
              <Select value={form.criticality ?? "__none__"} onValueChange={(v) => set("criticality", optVal(v ?? "", undefined) as FormState["criticality"])}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Unknown —</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="unable-to-assess">Unable to assess</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="al-onset">Onset Date</Label>
              <Input id="al-onset" type="date" value={form.onsetDate ?? ""} onChange={(e) => set("onsetDate", e.target.value)} />
            </div>
          </div>

          {/* Reaction */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reaction</p>
            <div className="space-y-1.5">
              <Label htmlFor="al-manif">Manifestation</Label>
              <Input
                id="al-manif"
                value={form.reactionManifestation ?? ""}
                onChange={(e) => set("reactionManifestation", e.target.value)}
                placeholder="e.g. Urticaria, Anaphylaxis, Dyspnea…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select
                value={form.reactionSeverity ?? "__none__"}
                onValueChange={(v) => set("reactionSeverity", optVal(v ?? "", undefined) as FormState["reactionSeverity"])}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Unknown —</SelectItem>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="al-note">Notes</Label>
            <Textarea
              id="al-note"
              rows={2}
              className="resize-none"
              placeholder="Additional clinical notes (optional)…"
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(buttonVariants(), "gap-2")}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Record Allergy"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
