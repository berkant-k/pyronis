"use client"

import { useState, useLayoutEffect } from "react"
import type { Condition } from "@medplum/fhirtypes"
import {
  createCondition,
  updateCondition,
  parseCondition,
  type ConditionInput,
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

// ─── Common condition suggestions ────────────────────────────────────────────

const CONDITION_SUGGESTIONS = [
  "Hypertension", "Type 2 Diabetes Mellitus", "Type 1 Diabetes Mellitus",
  "Asthma", "COPD", "Bronchitis", "Pneumonia",
  "Coronary Artery Disease", "Heart Failure", "Atrial Fibrillation",
  "Acute Myocardial Infarction", "Angina Pectoris",
  "Chronic Kidney Disease", "Urinary Tract Infection",
  "Hypothyroidism", "Hyperthyroidism", "Hyperlipidemia",
  "Obesity", "Anemia", "Iron Deficiency Anemia",
  "Anxiety Disorder", "Depression", "Bipolar Disorder",
  "Back Pain", "Neck Pain", "Osteoarthritis", "Rheumatoid Arthritis",
  "Migraine", "Epilepsy", "Stroke", "Sepsis",
  "Acute Pharyngitis", "Tonsillitis", "Sinusitis",
  "Gastroesophageal Reflux Disease", "Peptic Ulcer Disease", "Appendicitis",
  "Cellulitis", "Wound Infection",
  "Upper Respiratory Infection", "Influenza", "COVID-19",
]

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = Omit<ConditionInput, "patientId" | "encounterId">

const DEFAULT: FormState = {
  code: "",
  icdCode: "",
  category: "encounter-diagnosis",
  clinicalStatus: "active",
  verificationStatus: "confirmed",
  severity: undefined,
  onsetDate: "",
  note: "",
}

function optVal<T>(v: string, empty: T): string | T {
  return v === "__none__" ? empty : v
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  patientId: string
  encounterId?: string
  defaultCategory?: "problem-list-item" | "encounter-diagnosis"
  condition?: Condition
  onSuccess: (saved: Condition) => void
  patient?: PatientInfo
}

export function ConditionFormDialog({
  open,
  onOpenChange,
  patientId,
  encounterId,
  defaultCategory,
  condition,
  onSuccess,
  patient,
}: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!condition

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (open) {
      setError(null)
      setForm(condition ? (() => {
        const p = parseCondition(condition)
        return {
          code: p.code,
          icdCode: p.icdCode ?? "",
          category: p.category,
          clinicalStatus: p.clinicalStatus,
          verificationStatus: p.verificationStatus,
          severity: p.severity,
          onsetDate: p.onsetDate ?? "",
          note: p.note ?? "",
        }
      })() : { ...DEFAULT, category: defaultCategory ?? "encounter-diagnosis" })
    }
  }, [open, condition, defaultCategory])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) { setError("Condition name is required."); return }
    setSaving(true)
    setError(null)
    try {
      const input: ConditionInput = {
        patientId,
        encounterId,
        code: form.code.trim(),
        icdCode: form.icdCode?.trim() || undefined,
        category: form.category,
        clinicalStatus: form.clinicalStatus,
        verificationStatus: form.verificationStatus,
        severity: form.severity,
        onsetDate: form.onsetDate || undefined,
        note: form.note?.trim() || undefined,
      }
      const saved = isEdit
        ? await updateCondition(condition!.id!, input)
        : await createCondition(input)
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
          <DialogTitle>{isEdit ? "Edit Condition" : "Add Problem / Condition"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the condition details." : "Record a problem or diagnosis for this encounter."}
          </DialogDescription>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form id="cond-form" onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

          {/* Condition name */}
          <div className="space-y-1.5">
            <Label htmlFor="cond-code">Condition / Problem <span className="text-destructive">*</span></Label>
            <Input
              id="cond-code"
              list="cond-suggestions"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="e.g. Hypertension, Pneumonia, Appendicitis…"
              required
              autoComplete="off"
            />
            <datalist id="cond-suggestions">
              {CONDITION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* ICD-10 code */}
          <div className="space-y-1.5">
            <Label htmlFor="cond-icd">ICD-10 Code <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <Input
              id="cond-icd"
              value={form.icdCode ?? ""}
              onChange={(e) => set("icdCode", e.target.value)}
              placeholder="e.g. I10, J18.9, K80.20…"
              autoComplete="off"
              className="font-mono"
            />
          </div>

          {/* Category + Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", (v ?? "encounter-diagnosis") as FormState["category"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="encounter-diagnosis">Encounter Diagnosis</SelectItem>
                  <SelectItem value="problem-list-item">Problem List Item</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select
                value={form.severity ?? "__none__"}
                onValueChange={(v) => set("severity", optVal(v ?? "", undefined) as FormState["severity"])}
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

          {/* Clinical status + Verification */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Clinical Status</Label>
              <Select
                value={form.clinicalStatus}
                onValueChange={(v) => set("clinicalStatus", (v ?? "active") as FormState["clinicalStatus"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="recurrence">Recurrence</SelectItem>
                  <SelectItem value="relapse">Relapse</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="remission">Remission</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Verification</Label>
              <Select
                value={form.verificationStatus}
                onValueChange={(v) => set("verificationStatus", (v ?? "confirmed") as FormState["verificationStatus"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
                  <SelectItem value="provisional">Provisional</SelectItem>
                  <SelectItem value="differential">Differential</SelectItem>
                  <SelectItem value="refuted">Refuted</SelectItem>
                  <SelectItem value="entered-in-error">Entered in error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Onset date */}
          <div className="space-y-1.5">
            <Label htmlFor="cond-onset">Onset Date <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <Input
              id="cond-onset"
              type="date"
              value={form.onsetDate ?? ""}
              onChange={(e) => set("onsetDate", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="cond-note">Clinical Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <Textarea
              id="cond-note"
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Additional clinical context…"
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{error}</p>
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
            form="cond-form"
            disabled={saving || !form.code.trim()}
            className={cn(buttonVariants(), "gap-2")}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Add condition"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
