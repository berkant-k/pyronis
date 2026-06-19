"use client"

import { useState } from "react"
import { ClipboardCheck, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  recordAdministration,
  parseInpatientRx,
  type MedAdminInput,
} from "@/lib/fhir-client"
import type { MedicationAdministration, MedicationRequest } from "@medplum/fhirtypes"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  order:       MedicationRequest
  patientId:   string
  encounterId: string
  onSaved:     (admin: MedicationAdministration) => void
  patient?:    PatientInfo
}

function nowLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function RecordAdminDialog({ order, patientId, encounterId, onSaved, patient }: Props) {
  const parsed = parseInpatientRx(order)

  const [open, setOpen]             = useState(false)
  const [status, setStatus]         = useState<"completed" | "not-done">("completed")
  const [doseGiven, setDoseGiven]   = useState(parsed.dose ?? "")
  const [route, setRoute]           = useState(parsed.route ?? "")
  const [site, setSite]             = useState("")
  const [effectiveDateTime, setEffectiveDateTime] = useState(nowLocal)
  const [notDoneReason, setNotDoneReason] = useState("")
  const [notes, setNotes]           = useState("")
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function handleOpen(val: boolean) {
    if (val) {
      // Reset to current time and order defaults each time dialog opens
      setStatus("completed")
      setDoseGiven(parsed.dose ?? "")
      setRoute(parsed.route ?? "")
      setSite("")
      setEffectiveDateTime(nowLocal())
      setNotDoneReason("")
      setNotes("")
      setError(null)
    }
    setOpen(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const input: MedAdminInput = {
        patientId,
        encounterId,
        medicationRequestId: order.id,
        drugName:            order.medicationCodeableConcept?.text ?? parsed.drugName,
        doseGiven:           doseGiven.trim() || undefined,
        route:               route.trim() || undefined,
        site:                site.trim() || undefined,
        effectiveDateTime:   new Date(effectiveDateTime).toISOString(),
        status,
        notDoneReason:       status === "not-done" ? notDoneReason.trim() || undefined : undefined,
        notes:               notes.trim() || undefined,
      }
      const created = await recordAdministration(input)
      setOpen(false)
      onSaved(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record administration")
    } finally {
      setSaving(false)
    }
  }

  const drugName = order.medicationCodeableConcept?.text ?? parsed.drugName

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ size: "sm" }),
          "h-7 gap-1.5 bg-green-600 text-white hover:bg-green-700 px-2.5"
        )}
      >
        <ClipboardCheck className="h-3.5 w-3.5" />
        Give
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Administration</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {drugName}
            {parsed.dose && ` · ${parsed.dose}`}
            {parsed.frequency && ` · ${parsed.frequency}`}
            {parsed.prn && " · PRN"}
          </p>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Given / Not given toggle */}
          <div className="space-y-1.5">
            <Label>Administration Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["completed", "not-done"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-md border py-2 text-sm font-medium transition-colors",
                    status === s
                      ? s === "completed"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-400 bg-red-50 text-red-700"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s === "completed" ? "✓ Administered" : "✗ Not Given"}
                </button>
              ))}
            </div>
          </div>

          {status === "not-done" && (
            <div className="space-y-1.5">
              <Label htmlFor="ra-not-done-reason">Reason Not Given</Label>
              <Input
                id="ra-not-done-reason"
                placeholder="e.g. Patient refused, Hypotension, Drug unavailable"
                value={notDoneReason}
                onChange={(e) => setNotDoneReason(e.target.value)}
              />
            </div>
          )}

          {/* Time */}
          <div className="space-y-1.5">
            <Label htmlFor="ra-time">
              {status === "completed" ? "Time Administered" : "Time"}
            </Label>
            <Input
              id="ra-time"
              type="datetime-local"
              value={effectiveDateTime}
              onChange={(e) => setEffectiveDateTime(e.target.value)}
              required
            />
          </div>

          {/* Dose given + Route */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ra-dose">Dose Given</Label>
              <Input
                id="ra-dose"
                placeholder={parsed.dose ?? "e.g. 500mg"}
                value={doseGiven}
                onChange={(e) => setDoseGiven(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ra-route">Route</Label>
              <Input
                id="ra-route"
                placeholder={parsed.route ?? "e.g. IV, Oral"}
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              />
            </div>
          </div>

          {/* Site (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="ra-site">Injection Site <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="ra-site"
              placeholder="e.g. Left arm, Right abdomen"
              value={site}
              onChange={(e) => setSite(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ra-notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="ra-notes"
              rows={2}
              placeholder="Any relevant observations"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={saving}
              className={cn(
                buttonVariants({ size: "sm" }),
                "gap-1.5",
                status === "not-done"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              )}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {status === "completed" ? "Record Administration" : "Record Not Given"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
