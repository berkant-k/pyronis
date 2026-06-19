"use client"

import { useState, useLayoutEffect } from "react"
import { Loader2, Syringe } from "lucide-react"
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
  recordImmunization, updateImmunization, parseImmunization,
} from "@/lib/fhir-client"
import type { ImmunizationInput } from "@/lib/fhir-client"
import type { Immunization } from "@medplum/fhirtypes"

// Vaccine name → CVX code mapping for common vaccines
const VACCINE_CVX_MAP: Record<string, string> = {
  "BCG":                               "19",
  "DTaP":                              "20",
  "Hepatitis A":                       "85",
  "Hepatitis B":                       "08",
  "Hepatitis E":                       "71",
  "Hib (Haemophilus influenzae type b)": "17",
  "HPV (Gardasil)":                    "62",
  "Influenza (Flu)":                   "141",
  "Japanese Encephalitis":             "129",
  "MMR (Measles/Mumps/Rubella)":       "03",
  "MMRV":                              "94",
  "Meningococcal ACWY":                "114",
  "Meningococcal B":                   "163",
  "Pneumococcal (PCV13)":              "133",
  "Pneumococcal (PPSV23)":             "33",
  "Polio (IPV)":                       "10",
  "Rabies":                            "18",
  "Rotavirus":                         "122",
  "Shingles (Zoster)":                 "121",
  "Tdap":                              "115",
  "Td (Tetanus/Diphtheria)":           "09",
  "Typhoid":                           "25",
  "Varicella (Chickenpox)":            "21",
  "Yellow Fever":                      "37",
}

const VACCINE_SUGGESTIONS = Object.keys(VACCINE_CVX_MAP).concat([
  "COVID-19 (mRNA)",
  "COVID-19 (Adenoviral)",
  "Cholera",
  "Dengue",
]).sort()

interface FormState {
  vaccineName:    string
  vaccineCode:    string
  route:          string
  site:           string
  occurrenceDate: string
  lotNumber:      string
  expirationDate: string
  doseNumber:     string
  series:         string
  primarySource:  boolean
  performer:      string
  status:         "completed" | "not-done"
  statusReason:   string
  notes:          string
}

const DEFAULT: FormState = {
  vaccineName:    "",
  vaccineCode:    "",
  route:          "IM",
  site:           "",
  occurrenceDate: "",
  lotNumber:      "",
  expirationDate: "",
  doseNumber:     "",
  series:         "",
  primarySource:  true,
  performer:      "",
  status:         "completed",
  statusReason:   "",
  notes:          "",
}

interface Props {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  patientId:     string
  encounterId?:  string
  immunization?: Immunization
  onSuccess:     (saved: Immunization) => void
  patient?:      PatientInfo
}

export function ImmunizationFormDialog({
  open, onOpenChange, patientId, encounterId, immunization, onSuccess, patient,
}: Props) {
  const [form, setForm]     = useState<FormState>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const isEdit = !!immunization

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return
    setError(null)
    if (immunization) {
      const p = parseImmunization(immunization)
      setForm({
        vaccineName:    p.vaccineName,
        vaccineCode:    p.vaccineCode ?? "",
        route:          p.route ?? "IM",
        site:           p.site ?? "",
        occurrenceDate: p.occurrenceDate,
        lotNumber:      p.lotNumber ?? "",
        expirationDate: p.expirationDate ?? "",
        doseNumber:     p.doseNumber !== undefined ? String(p.doseNumber) : "",
        series:         p.series ?? "",
        primarySource:  p.primarySource ?? true,
        performer:      p.performer ?? "",
        status:         p.status,
        statusReason:   p.statusReason ?? "",
        notes:          p.notes ?? "",
      })
    } else {
      setForm(DEFAULT)
    }
  }, [open, immunization])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function handleVaccineNameChange(name: string) {
    setForm((prev) => {
      const knownCvx = VACCINE_CVX_MAP[name]
      const prevCvxWasAutoFilled = VACCINE_CVX_MAP[prev.vaccineName] === prev.vaccineCode
      const newVaccineCode = knownCvx
        ? (prev.vaccineCode === "" || prevCvxWasAutoFilled ? knownCvx : prev.vaccineCode)
        : (prevCvxWasAutoFilled ? "" : prev.vaccineCode)
      return { ...prev, vaccineName: name, vaccineCode: newVaccineCode }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vaccineName.trim()) { setError("Vaccine name is required"); return }
    if (!form.occurrenceDate)     { setError("Date administered is required"); return }
    setSaving(true)
    setError(null)
    try {
      const input: ImmunizationInput = {
        patientId,
        encounterId,
        vaccineName:    form.vaccineName.trim(),
        vaccineCode:    form.vaccineCode.trim()  || undefined,
        status:         form.status,
        occurrenceDate: form.occurrenceDate,
        route:          form.route || undefined,
        site:           form.site.trim()         || undefined,
        lotNumber:      form.lotNumber.trim()    || undefined,
        expirationDate: form.expirationDate      || undefined,
        doseNumber:     form.doseNumber ? parseInt(form.doseNumber, 10) : undefined,
        series:         form.series.trim()       || undefined,
        primarySource:  form.primarySource,
        performer:      form.performer.trim()    || undefined,
        statusReason:   form.status === "not-done" ? (form.statusReason.trim() || undefined) : undefined,
        notes:          form.notes.trim()        || undefined,
      }
      const saved = isEdit
        ? await updateImmunization(immunization!.id!, input)
        : await recordImmunization(input)
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
            <Syringe className="h-4 w-4 text-muted-foreground" />
            {isEdit ? "Edit Immunization" : "Record Immunization"}
          </DialogTitle>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form id="imm-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="imm-vaccine">Vaccine *</Label>
              <Input
                id="imm-vaccine"
                list="imm-vaccine-list"
                value={form.vaccineName}
                onChange={(e) => handleVaccineNameChange(e.target.value)}
                placeholder="e.g. COVID-19, Influenza, Hepatitis B…"
                required
                autoComplete="off"
              />
              <datalist id="imm-vaccine-list">
                {VACCINE_SUGGESTIONS.map((v) => <option key={v} value={v} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imm-cvx">CVX Code</Label>
              <Input
                id="imm-cvx"
                value={form.vaccineCode}
                onChange={(e) => set("vaccineCode", e.target.value)}
                placeholder="e.g. 141"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Route</Label>
              <Select value={form.route} onValueChange={(v) => set("route", v ?? "IM")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IM">Intramuscular (IM)</SelectItem>
                  <SelectItem value="SC">Subcutaneous (SC)</SelectItem>
                  <SelectItem value="ID">Intradermal (ID)</SelectItem>
                  <SelectItem value="PO">Oral (PO)</SelectItem>
                  <SelectItem value="IN">Intranasal (IN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imm-site">Site</Label>
              <Input
                id="imm-site"
                value={form.site}
                onChange={(e) => set("site", e.target.value)}
                placeholder="e.g. Left deltoid"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="imm-date">Date Administered *</Label>
              <Input
                id="imm-date"
                type="date"
                value={form.occurrenceDate}
                onChange={(e) => set("occurrenceDate", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imm-dose">Dose #</Label>
              <Input
                id="imm-dose"
                type="number"
                min="1"
                value={form.doseNumber}
                onChange={(e) => set("doseNumber", e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imm-series">Series</Label>
              <Input
                id="imm-series"
                value={form.series}
                onChange={(e) => set("series", e.target.value)}
                placeholder="e.g. 2-dose primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="imm-lot">Lot Number</Label>
              <Input
                id="imm-lot"
                value={form.lotNumber}
                onChange={(e) => set("lotNumber", e.target.value)}
                placeholder="e.g. ABC123"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imm-expiry">Expiry Date</Label>
              <Input
                id="imm-expiry"
                type="date"
                value={form.expirationDate}
                onChange={(e) => set("expirationDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imm-performer">Administered By</Label>
            <Input
              id="imm-performer"
              value={form.performer}
              onChange={(e) => set("performer", e.target.value)}
              placeholder="Nurse / Practitioner name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Primary Source</Label>
            <div className="grid grid-cols-2 gap-2">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => set("primarySource", v)}
                  className={cn(
                    "rounded-md border py-2 text-sm font-medium transition-colors",
                    form.primarySource === v
                      ? v
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-amber-400 bg-amber-50 text-amber-800"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {v ? "Primary source" : "Historical record"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Primary source: recorded by the administering provider. Historical: from patient recall or prior records.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["completed", "not-done"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={cn(
                    "rounded-md border py-2 text-sm font-medium transition-colors",
                    form.status === s
                      ? s === "completed"
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-red-400 bg-red-50 text-red-800"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s === "completed" ? "✓ Given" : "✗ Not Given"}
                </button>
              ))}
            </div>
          </div>

          {form.status === "not-done" && (
            <div className="space-y-1.5">
              <Label htmlFor="imm-reason">Reason Not Given</Label>
              <Input
                id="imm-reason"
                value={form.statusReason}
                onChange={(e) => set("statusReason", e.target.value)}
                placeholder="e.g. Patient refused, Contraindication"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="imm-notes">Notes</Label>
            <Textarea
              id="imm-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any relevant observations"
              rows={2}
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
            form="imm-form"
            disabled={saving}
            className={cn(buttonVariants(), "gap-2")}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Record immunization"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
