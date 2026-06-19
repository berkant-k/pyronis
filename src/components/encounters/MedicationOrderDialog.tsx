"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
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
import { createInpatientRx, type InpatientRxInput } from "@/lib/fhir-client"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  patientId:   string
  encounterId: string
  onSaved:     () => void
  patient?:    PatientInfo
}

const COMMON_DRUGS = [
  // Antibiotics
  "Amoxicillin", "Ampicillin", "Ceftriaxone", "Cefazolin", "Cefuroxime",
  "Metronidazole", "Vancomycin", "Piperacillin-Tazobactam", "Meropenem",
  "Ciprofloxacin", "Levofloxacin", "Azithromycin", "Clindamycin",
  "Gentamicin", "Tobramycin", "Co-trimoxazole", "Flucloxacillin", "Doxycycline",
  // Analgesics
  "Paracetamol", "Ibuprofen", "Morphine Sulfate", "Fentanyl", "Tramadol",
  "Ketorolac", "Diclofenac Sodium", "Naloxone", "Buprenorphine",
  // Cardiovascular
  "Metoprolol", "Atenolol", "Amlodipine", "Enalapril", "Lisinopril",
  "Furosemide", "Spironolactone", "Digoxin", "Amiodarone", "Nitroglycerin",
  "Enoxaparin", "Heparin", "Warfarin", "Aspirin", "Clopidogrel",
  // GI
  "Omeprazole", "Pantoprazole", "Ranitidine", "Ondansetron", "Metoclopramide",
  // Respiratory / steroids
  "Salbutamol", "Ipratropium Bromide", "Prednisolone", "Hydrocortisone",
  "Methylprednisolone", "Dexamethasone", "Aminophylline", "Magnesium Sulfate",
  // Endocrine / electrolytes
  "Insulin Regular", "Insulin Glargine", "Insulin Lispro", "Glucagon",
  "Dextrose 50%", "Potassium Chloride", "Sodium Bicarbonate",
  // Neurology / sedation
  "Phenytoin", "Levetiracetam", "Midazolam", "Diazepam", "Haloperidol",
  "Lorazepam", "Propofol",
  // Fluids
  "Normal Saline 0.9%", "Lactated Ringer's", "Dextrose 5%", "Hartmann's Solution",
]

const ROUTES = [
  "IV", "IV Infusion", "IM", "SC", "Oral", "Sublingual",
  "Inhalation", "Intranasal", "Topical", "Rectal", "Ophthalmic",
  "Otic", "Nasogastric", "Intraosseous",
]

const FREQUENCIES = [
  { code: "STAT",    label: "STAT (once now)" },
  { code: "Q1H",     label: "Q1H (every hour)" },
  { code: "Q2H",     label: "Q2H (every 2 hours)" },
  { code: "Q4H",     label: "Q4H (every 4 hours)" },
  { code: "Q6H",     label: "Q6H (every 6 hours)" },
  { code: "Q8H",     label: "Q8H (every 8 hours)" },
  { code: "Q12H",    label: "Q12H (every 12 hours)" },
  { code: "OD",      label: "OD (once daily)" },
  { code: "BD",      label: "BD (twice daily)" },
  { code: "TDS",     label: "TDS (three times daily)" },
  { code: "QID",     label: "QID (four times daily)" },
  { code: "QHS",     label: "QHS (at bedtime)" },
  { code: "QAM",     label: "QAM (every morning)" },
]

const BLANK: Omit<InpatientRxInput, "patientId" | "encounterId"> = {
  drugName: "", dose: "", route: "", frequency: "",
  prn: false, prnReason: "", indication: "", notes: "",
}

export function MedicationOrderDialog({ patientId, encounterId, onSaved, patient }: Props) {
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState(BLANK)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function set<K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.drugName.trim()) return
    setSaving(true); setError(null)
    try {
      await createInpatientRx({ patientId, encounterId, ...form })
      setOpen(false)
      setForm(BLANK)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
        <Plus className="h-3.5 w-3.5" />
        Order Medication
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Order Inpatient Medication</DialogTitle>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Drug name */}
          <div className="space-y-1.5">
            <Label htmlFor="mo-drug">Medication <span className="text-destructive">*</span></Label>
            <Input
              id="mo-drug"
              list="mo-drug-list"
              placeholder="Drug name"
              value={form.drugName}
              onChange={(e) => set("drugName", e.target.value)}
              required
            />
            <datalist id="mo-drug-list">
              {COMMON_DRUGS.map((d) => <option key={d} value={d} />)}
            </datalist>
          </div>

          {/* Dose + Route (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mo-dose">Dose</Label>
              <Input
                id="mo-dose"
                placeholder="e.g. 500mg, 1g, 10 units"
                value={form.dose ?? ""}
                onChange={(e) => set("dose", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Route</Label>
              <Select value={form.route ?? ""} onValueChange={(v) => set("route", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {ROUTES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frequency + PRN */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={form.prn ? "" : (form.frequency ?? "")}
                onValueChange={(v) => set("frequency", v ?? "")}
                disabled={!!form.prn}
              >
                <SelectTrigger><SelectValue placeholder={form.prn ? "N/A (PRN)" : "Select"} /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.code} value={f.code}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="invisible">PRN</Label>
              <button
                type="button"
                onClick={() => set("prn", !form.prn)}
                className={cn(
                  "flex h-9 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
                  form.prn
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                PRN {form.prn ? "✓ On" : "Off"}
              </button>
            </div>
          </div>

          {form.prn && (
            <div className="space-y-1.5">
              <Label htmlFor="mo-prn-reason">PRN Reason</Label>
              <Input
                id="mo-prn-reason"
                placeholder="e.g. Pain, Fever, Nausea"
                value={form.prnReason ?? ""}
                onChange={(e) => set("prnReason", e.target.value)}
              />
            </div>
          )}

          {/* Indication */}
          <div className="space-y-1.5">
            <Label htmlFor="mo-indication">Clinical Indication</Label>
            <Input
              id="mo-indication"
              placeholder="Reason for ordering this medication"
              value={form.indication ?? ""}
              onChange={(e) => set("indication", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="mo-notes">Notes</Label>
            <Textarea
              id="mo-notes"
              rows={2}
              placeholder="Additional instructions or notes"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
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
              disabled={saving || !form.drugName.trim()}
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Order
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
