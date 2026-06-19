"use client"

import { useState } from "react"
import { Pencil, SendHorizontal, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import { buttonVariants } from "@/components/ui/button"
import { updateReferral, REFERRAL_SPECIALTIES } from "@/lib/fhir-client"
import type { ServiceRequest } from "@medplum/fhirtypes"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

interface FormState {
  specialty:      string
  specialtyOther: string
  priority:       string
  reason:         string
  notes:          string
}

function deriveForm(referral: ServiceRequest): FormState {
  const specialtyValue = referral.code?.text ?? referral.code?.coding?.[0]?.display ?? ""
  const isKnown = (REFERRAL_SPECIALTIES as readonly string[]).includes(specialtyValue)
  return {
    specialty:      isKnown ? specialtyValue : (specialtyValue ? "Other" : ""),
    specialtyOther: isKnown ? "" : specialtyValue,
    priority:       referral.priority ?? "routine",
    reason:         referral.reasonCode?.[0]?.text ?? "",
    notes:          referral.note?.[0]?.text ?? "",
  }
}

interface Props {
  referral:    ServiceRequest
  onUpdated?: (referral: ServiceRequest) => void
  patient?:   PatientInfo
}

export function EditReferralDialog({ referral, onUpdated, patient }: Props) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")
  const [form, setForm]     = useState<FormState>(() => deriveForm(referral))

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) { setForm(deriveForm(referral)); setError("") }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!referral.id) return
    const specialty = form.specialty === "Other" ? form.specialtyOther.trim() : form.specialty
    if (!specialty) { setError("Please select or enter a specialty."); return }
    const patientId = referral.subject?.reference?.replace("Patient/", "") ?? ""
    if (!patientId) { setError("Referral has no linked patient."); return }
    setSaving(true)
    setError("")
    try {
      const updated = await updateReferral(referral.id, {
        patientId,
        encounterId: referral.encounter?.reference?.replace("Encounter/", ""),
        specialty,
        priority: form.priority as "routine" | "urgent" | "asap" | "stat",
        reason:   form.reason || undefined,
        notes:    form.notes  || undefined,
      })
      onUpdated?.(updated)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update referral")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className="text-muted-foreground/40 hover:text-primary transition-colors"
        title="Edit referral"
      >
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SendHorizontal className="h-4 w-4 text-primary" />
            Edit Referral
          </DialogTitle>
          <DialogDescription>
            Update the referral details. Status can be changed inline in the table.
          </DialogDescription>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Specialty */}
          <div className="space-y-1.5">
            <Label>Specialty / Service</Label>
            <Select value={form.specialty} onValueChange={(v) => set("specialty", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select specialty…" />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_SPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.specialty === "Other" && (
              <Input
                placeholder="Specify specialty or service"
                value={form.specialtyOther}
                onChange={(e) => set("specialtyOther", e.target.value)}
                autoFocus
              />
            )}
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => set("priority", v ?? "routine")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="asap">ASAP</SelectItem>
                <SelectItem value="stat">STAT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-ref-reason">Reason for Referral</Label>
            <Textarea
              id="edit-ref-reason"
              placeholder="Clinical reason or presenting complaint…"
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              rows={2}
            />
          </div>

          {/* Clinical notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-ref-notes">Clinical Notes</Label>
            <Textarea
              id="edit-ref-notes"
              placeholder="Relevant history, findings, or specific requests…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(buttonVariants(), "gap-2")}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
