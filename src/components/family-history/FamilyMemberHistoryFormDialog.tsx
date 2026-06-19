"use client"

import { useState, useLayoutEffect } from "react"
import { Loader2, Users, Plus, Trash2 } from "lucide-react"
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
  createFamilyMemberHistory,
  updateFamilyMemberHistory,
  FAMILY_RELATIONSHIP_DISPLAY,
  FAMILY_HISTORY_STATUS_DISPLAY,
} from "@/lib/fhir-client"
import type { FamilyMemberHistoryInput, FamilyConditionInput } from "@/lib/fhir-client"
import type { FamilyMemberHistory } from "@medplum/fhirtypes"

const CONDITION_SUGGESTIONS = [
  "Type 2 Diabetes",
  "Type 1 Diabetes",
  "Hypertension",
  "Coronary Artery Disease",
  "Heart Attack (Myocardial Infarction)",
  "Stroke",
  "Breast Cancer",
  "Colorectal Cancer",
  "Prostate Cancer",
  "Lung Cancer",
  "Ovarian Cancer",
  "Asthma",
  "COPD",
  "Chronic Kidney Disease",
  "Hypercholesterolaemia",
  "Alzheimer's Disease",
  "Parkinson's Disease",
  "Depression",
  "Schizophrenia",
  "Bipolar Disorder",
  "Epilepsy",
  "Osteoporosis",
  "Rheumatoid Arthritis",
  "Systemic Lupus Erythematosus (SLE)",
  "Sickle Cell Disease",
  "Thalassaemia",
  "Haemophilia",
  "Colon Polyps",
  "Deep Vein Thrombosis (DVT)",
  "Pulmonary Embolism",
  "Glaucoma",
  "Macular Degeneration",
  "Obesity",
  "Thyroid Disease",
]

interface FormState {
  relationship: string
  name:         string
  sex:          string
  bornYear:     string
  deceased:     boolean
  deceasedAge:  string
  status:       "partial" | "completed" | "health-unknown"
  conditions:   FamilyConditionInput[]
  note:         string
}

const DEFAULT: FormState = {
  relationship: "",
  name:         "",
  sex:          "",
  bornYear:     "",
  deceased:     false,
  deceasedAge:  "",
  status:       "completed",
  conditions:   [{ code: "", onset: "", note: "" }],
  note:         "",
}

function fromResource(r: FamilyMemberHistory): FormState {
  return {
    relationship: r.relationship?.coding?.[0]?.code ?? "",
    name:         r.name ?? "",
    sex:          r.sex?.coding?.[0]?.code ?? "",
    bornYear:     r.bornDate ?? "",
    deceased:     r.deceasedBoolean ?? false,
    deceasedAge:  String(r.deceasedAge?.value ?? ""),
    status:       (r.status as FormState["status"]) ?? "completed",
    conditions:   r.condition?.length
      ? r.condition.map((c) => ({
          code:  c.code?.text ?? "",
          onset: String(c.onsetAge?.value ?? ""),
          note:  c.note?.[0]?.text ?? "",
        }))
      : [{ code: "", onset: "", note: "" }],
    note: r.note?.[0]?.text ?? "",
  }
}

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  patientId:    string
  record?:      FamilyMemberHistory
  onSuccess:    (saved: FamilyMemberHistory) => void
  patient?:     PatientInfo
}

export function FamilyMemberHistoryFormDialog({ open, onOpenChange, patientId, record, onSuccess, patient }: Props) {
  const [form, setForm]     = useState<FormState>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const isEdit = !!record

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return
    setError(null)
    setForm(record ? fromResource(record) : DEFAULT)
  }, [open, record])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function setCondition(index: number, field: keyof FamilyConditionInput, val: string) {
    setForm((prev) => {
      const next = [...prev.conditions]
      next[index] = { ...next[index], [field]: val }
      return { ...prev, conditions: next }
    })
  }

  function addCondition() {
    setForm((prev) => ({ ...prev, conditions: [...prev.conditions, { code: "", onset: "", note: "" }] }))
  }

  function removeCondition(index: number) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.length > 1 ? prev.conditions.filter((_, i) => i !== index) : [{ code: "", onset: "", note: "" }],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.relationship) { setError("Relationship is required"); return }
    setSaving(true)
    setError(null)
    try {
      const input: FamilyMemberHistoryInput = {
        patientId,
        relationship: form.relationship,
        name:         form.name.trim() || undefined,
        sex:          form.sex || undefined,
        bornYear:     form.bornYear || undefined,
        deceased:     form.deceased,
        deceasedAge:  form.deceased && form.deceasedAge ? form.deceasedAge : undefined,
        status:       form.status,
        conditions:   form.conditions.filter((c) => c.code.trim()),
        note:         form.note.trim() || undefined,
      }
      const saved = isEdit
        ? await updateFamilyMemberHistory(record!.id!, input)
        : await createFamilyMemberHistory(input)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {isEdit ? "Edit Family Member History" : "Add Family Member History"}
          </DialogTitle>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form id="fmh-form" onSubmit={handleSubmit} className="space-y-5">

          {/* Relationship + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Relationship *</Label>
              <Select value={form.relationship} onValueChange={(v) => set("relationship", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select relationship…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FAMILY_RELATIONSHIP_DISPLAY).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fmh-name">Name (optional)</Label>
              <Input
                id="fmh-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Family member's name"
              />
            </div>
          </div>

          {/* Sex + Birth year + Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={(v) => set("sex", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unknown</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fmh-born">Birth Year</Label>
              <Input
                id="fmh-born"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                value={form.bornYear}
                onChange={(e) => set("bornYear", e.target.value)}
                placeholder="e.g. 1952"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Record Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", (v ?? "completed") as FormState["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FAMILY_HISTORY_STATUS_DISPLAY).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deceased */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => set("deceased", !form.deceased)}
              className={cn(
                "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                form.deceased
                  ? "border-rose-400 bg-rose-50 text-rose-800"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {form.deceased ? "Deceased" : "Mark as Deceased"}
            </button>
            {form.deceased && (
              <div className="flex items-center gap-2">
                <Label htmlFor="fmh-dec-age" className="whitespace-nowrap text-sm">Age at death</Label>
                <Input
                  id="fmh-dec-age"
                  type="number"
                  min={0}
                  max={130}
                  value={form.deceasedAge}
                  onChange={(e) => set("deceasedAge", e.target.value)}
                  placeholder="years"
                  className="w-24"
                />
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Medical Conditions</Label>
              <button
                type="button"
                onClick={addCondition}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs h-7")}
              >
                <Plus className="h-3 w-3" /> Add condition
              </button>
            </div>

            <div className="space-y-2">
              {form.conditions.map((cond, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Input
                        list={`condition-suggestions-${i}`}
                        value={cond.code}
                        onChange={(e) => setCondition(i, "code", e.target.value)}
                        placeholder="Condition name (e.g. Type 2 Diabetes)"
                        autoComplete="off"
                      />
                      <datalist id={`condition-suggestions-${i}`}>
                        {CONDITION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    <div className="w-28 space-y-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={130}
                        value={cond.onset ?? ""}
                        onChange={(e) => setCondition(i, "onset", e.target.value)}
                        placeholder="Onset age"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCondition(i)}
                      className="mt-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    value={cond.note ?? ""}
                    onChange={(e) => setCondition(i, "note", e.target.value)}
                    placeholder="Note (optional)"
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* General note */}
          <div className="space-y-1.5">
            <Label htmlFor="fmh-note">General Note</Label>
            <Textarea
              id="fmh-note"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Additional information about this family member's health history…"
              rows={3}
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
            form="fmh-form"
            disabled={saving}
            className={cn(buttonVariants(), "gap-2")}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Add record"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
