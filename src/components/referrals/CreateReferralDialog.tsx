"use client"

import { useState } from "react"
import { SendHorizontal, Loader2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
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
import { createReferral, REFERRAL_SPECIALTIES, getEncounterVisitId } from "@/lib/fhir-client"
import type { ServiceRequest, Encounter } from "@medplum/fhirtypes"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

interface FormState {
  specialty:      string
  specialtyOther: string
  priority:       string
  reason:         string
  notes:          string
  encounterId:    string
}

function blankForm(defaultEncounterId?: string): FormState {
  return { specialty: "", specialtyOther: "", priority: "routine", reason: "", notes: "", encounterId: defaultEncounterId ?? "" }
}

interface Props {
  patientId:           string
  encounters?:         Encounter[]
  defaultEncounterId?: string
  onSuccess?:          (referral: ServiceRequest) => void
  patient?:            PatientInfo
}

export function CreateReferralDialog({ patientId, encounters = [], defaultEncounterId, onSuccess, patient }: Props) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")
  const [form, setForm]     = useState<FormState>(() => blankForm(defaultEncounterId))

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) { setForm(blankForm(defaultEncounterId)); setError("") }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const specialty = form.specialty === "Other"
      ? form.specialtyOther.trim()
      : form.specialty
    if (!specialty) { setError("Please select or enter a specialty."); return }
    setSaving(true)
    setError("")
    try {
      const referral = await createReferral({
        patientId,
        encounterId: form.encounterId || undefined,
        specialty,
        priority:    form.priority as "routine" | "urgent" | "asap" | "stat",
        reason:      form.reason || undefined,
        notes:       form.notes  || undefined,
      })
      onSuccess?.(referral)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create referral")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
        <SendHorizontal className="h-3.5 w-3.5" />
        New Referral
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SendHorizontal className="h-4 w-4 text-primary" />
            Create Referral
          </DialogTitle>
          <DialogDescription>
            Refer this patient to a specialist or service.
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
            <Label htmlFor="ref-reason">Reason for Referral</Label>
            <Textarea
              id="ref-reason"
              placeholder="Clinical reason or presenting complaint…"
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              rows={2}
            />
          </div>

          {/* Clinical notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ref-notes">Clinical Notes</Label>
            <Textarea
              id="ref-notes"
              placeholder="Relevant history, findings, or specific requests…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
            />
          </div>

          {/* Encounter selector — hidden when encounter is locked via defaultEncounterId */}
          {encounters.length > 0 && !defaultEncounterId && (
            <div className="space-y-1.5">
              <Label>Link to Encounter (optional)</Label>
              <Select
                value={form.encounterId || "__none__"}
                onValueChange={(v) => set("encounterId", v === "__none__" ? "" : (v ?? ""))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No encounter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No encounter</SelectItem>
                  {encounters.map((enc) => {
                    const vid   = getEncounterVisitId(enc)
                    const label = enc.type?.[0]?.text ?? enc.type?.[0]?.coding?.[0]?.display ?? enc.class?.display ?? "Encounter"
                    return (
                      <SelectItem key={enc.id} value={enc.id!}>
                        {vid ? `VID-${vid} · ` : ""}{label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

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
              {saving ? "Creating…" : "Create Referral"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
