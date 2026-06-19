"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { createNonVitalObservation } from "@/lib/fhir-client"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"
import type { Observation } from "@medplum/fhirtypes"
import config from "@/lib/config.json"


interface Props {
  patientId:   string
  encounterId: string
  patient?:    PatientInfo
  onSuccess:   (obs: Observation) => void
}

export function NonVitalObservationDialog({ patientId, encounterId, patient, onSuccess }: Props) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const [category, setCategory]       = useState<"exam" | "social-history">("exam")
  const [loincCode, setLoincCode]     = useState("")
  const [valueText, setValueText]     = useState("")
  const [smokingCode, setSmokingCode] = useState("")

  const examOptions    = config.fhir.observations.physicalExam
  const socialOptions  = config.fhir.observations.socialHistory
  const smokingOptions = config.fhir.observations.smokingStatusOptions

  const currentOptions = category === "exam" ? examOptions : socialOptions
  const selectedDef    = currentOptions.find((o) => o.code === loincCode)
  const isSmokingCode  = loincCode === "72166-2"

  function reset() {
    setCategory("exam")
    setLoincCode("")
    setValueText("")
    setSmokingCode("")
    setError("")
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!loincCode) { setError("Please select an observation type."); return }
    if (isSmokingCode && !smokingCode) { setError("Please select a smoking status."); return }
    if (!isSmokingCode && !valueText.trim()) { setError("Please enter a finding or value."); return }

    setSaving(true); setError("")
    try {
      const smokingOption = smokingOptions.find((o) => o.code === smokingCode)
      const obs = await createNonVitalObservation({
        patientId,
        encounterId,
        category,
        loincCode,
        display: selectedDef?.display ?? loincCode,
        effectiveDateTime: new Date().toISOString(),
        ...(isSmokingCode && smokingOption
          ? { valueCoding: { system: config.fhir.codeSystems.loinc, code: smokingOption.code, display: smokingOption.display } }
          : { valueString: valueText.trim() }),
      })
      onSuccess(obs)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
        <Plus className="h-3.5 w-3.5" />
        Add Observation
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Observation</DialogTitle>
          <DialogDescription>Add a physical exam finding or social history entry.</DialogDescription>
        </DialogHeader>

        {patient && <PatientBanner {...patient} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v as "exam" | "social-history"); setLoincCode(""); setValueText(""); setSmokingCode("") }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exam">Physical Exam</SelectItem>
                <SelectItem value="social-history">Social History</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type / body system */}
          <div className="space-y-1.5">
            <Label>{category === "exam" ? "Body System" : "Topic"} <span className="text-destructive">*</span></Label>
            <Select value={loincCode} onValueChange={(v) => { setLoincCode(v ?? ""); setValueText(""); setSmokingCode("") }}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {currentOptions.map((o) => (
                  <SelectItem key={o.code} value={o.code}>{o.display}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value — coded for smoking status, text for everything else */}
          {loincCode && (
            isSmokingCode ? (
              <div className="space-y-1.5">
                <Label>Smoking Status <span className="text-destructive">*</span></Label>
                <Select value={smokingCode} onValueChange={(v) => setSmokingCode(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select status…" /></SelectTrigger>
                  <SelectContent>
                    {smokingOptions.map((o) => (
                      <SelectItem key={o.code} value={o.code}>{o.display}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{category === "exam" ? "Finding" : "Value"} <span className="text-destructive">*</span></Label>
                <Textarea
                  rows={3}
                  value={valueText}
                  onChange={(e) => setValueText(e.target.value)}
                  placeholder={category === "exam" ? "e.g. Clear breath sounds bilaterally, no wheeze…" : "e.g. Non-smoker, occasional social alcohol…"}
                />
              </div>
            )
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <button type="submit" disabled={saving} className={cn(buttonVariants(), "gap-1.5")}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
