"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, Loader2, AlertTriangle, CheckCircle2, ArrowDown, ArrowUp } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  createVitals,
  checkVitalAlerts,
  getEncounterVisitId,
  type VitalAlert,
} from "@/lib/fhir-client"
import type { Encounter } from "@medplum/fhirtypes"

function nowLocalDatetime(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface VitalFormState {
  effectiveDateTime: string
  encounterId: string
  systolicBP: string
  diastolicBP: string
  heartRate: string
  respiratoryRate: string
  spo2: string
  temperature: string
  weight: string
  height: string
}

const BLANK: Omit<VitalFormState, "effectiveDateTime" | "encounterId"> = {
  systolicBP: "",
  diastolicBP: "",
  heartRate: "",
  respiratoryRate: "",
  spo2: "",
  temperature: "",
  weight: "",
  height: "",
}

interface Props {
  patientId: string
  encounterId?: string
  encounters?: Encounter[]
  variant?: "default" | "outline"
}

export function RecordVitalsButton({
  patientId,
  encounterId,
  encounters = [],
  variant = "outline",
}: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState<VitalFormState>({
    ...BLANK,
    effectiveDateTime: nowLocalDatetime(),
    encounterId: encounterId ?? "",
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState("")
  const [alerts, setAlerts]   = useState<VitalAlert[]>([])
  const [saved, setSaved]     = useState(false)

  function set(field: keyof VitalFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setForm({ ...BLANK, effectiveDateTime: nowLocalDatetime(), encounterId: encounterId ?? "" })
      setError("")
      setAlerts([])
      setSaved(false)
    }
  }

  function handleDismiss() {
    setOpen(false)
    router.refresh()
  }

  const num = (s: string) => { const n = parseFloat(s); return isNaN(n) ? undefined : n }

  const hasValue = [
    form.systolicBP, form.diastolicBP, form.heartRate, form.respiratoryRate,
    form.spo2, form.temperature, form.weight, form.height,
  ].some((v) => v.trim() !== "")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasValue) { setError("Enter at least one vital sign value."); return }
    setSaving(true)
    setError("")
    try {
      const values = {
        systolicBP:      num(form.systolicBP),
        diastolicBP:     num(form.diastolicBP),
        heartRate:       num(form.heartRate),
        respiratoryRate: num(form.respiratoryRate),
        spo2:            num(form.spo2),
        temperature:     num(form.temperature),
        weight:          num(form.weight),
        height:          num(form.height),
      }
      await createVitals({
        patientId,
        encounterId: form.encounterId || undefined,
        effectiveDateTime: new Date(form.effectiveDateTime).toISOString(),
        ...values,
      })
      setSaved(true)
      const found = checkVitalAlerts(values as Record<string, number>)
      if (found.length === 0) {
        setOpen(false)
        router.refresh()
      } else {
        setAlerts(found)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vitals")
    } finally {
      setSaving(false)
    }
  }

  const criticalAlerts = alerts.filter((a) => a.severity === "critical")
  const abnormalAlerts = alerts.filter((a) => a.severity === "abnormal")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={cn(buttonVariants({ variant }), "gap-2")}>
        <Activity className="h-4 w-4" />
        Record Vitals
      </DialogTrigger>

      <DialogContent className="max-w-md">
        {/* ── Alert view (after save with out-of-range values) ── */}
        {saved && alerts.length > 0 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {criticalAlerts.length > 0 ? "Critical Vital Signs Detected" : "Abnormal Vital Signs Detected"}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Vitals saved to patient record.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {criticalAlerts.length > 0 && (
                <AlertGroup
                  severity="critical"
                  heading="Critical Values"
                  alerts={criticalAlerts}
                />
              )}
              {abnormalAlerts.length > 0 && (
                <AlertGroup
                  severity="abnormal"
                  heading="Abnormal Values"
                  alerts={abnormalAlerts}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Reference ranges are for adult patients at rest. Clinical judgement should always be applied.
              </p>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={handleDismiss}
                className={cn(
                  buttonVariants({ variant: criticalAlerts.length > 0 ? "default" : "default" }),
                  "gap-2",
                  criticalAlerts.length > 0 && "bg-destructive hover:bg-destructive/90"
                )}
              >
                Acknowledge &amp; Close
              </button>
            </DialogFooter>
          </>
        ) : (
          /* ── Normal entry form ── */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Record Vital Signs
              </DialogTitle>
              <DialogDescription>
                Enter measured values. Leave fields blank to skip.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date / time */}
              <div className="space-y-1.5">
                <Label htmlFor="vit-dt">Date &amp; Time</Label>
                <Input
                  id="vit-dt"
                  type="datetime-local"
                  value={form.effectiveDateTime}
                  onChange={(e) => set("effectiveDateTime", e.target.value)}
                />
              </div>

              {/* Encounter selector */}
              {!encounterId && encounters.length > 0 && (
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
                        const vid = getEncounterVisitId(enc)
                        const label =
                          enc.type?.[0]?.text ??
                          enc.type?.[0]?.coding?.[0]?.display ??
                          enc.class?.display ??
                          enc.class?.code ??
                          "Encounter"
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

              {/* Blood pressure */}
              <div className="space-y-1.5">
                <Label>Blood Pressure (mmHg)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" placeholder="Systolic" min={0} max={300}
                    value={form.systolicBP}
                    onChange={(e) => set("systolicBP", e.target.value)}
                    className="text-center"
                  />
                  <span className="shrink-0 font-semibold text-muted-foreground">/</span>
                  <Input
                    type="number" placeholder="Diastolic" min={0} max={200}
                    value={form.diastolicBP}
                    onChange={(e) => set("diastolicBP", e.target.value)}
                    className="text-center"
                  />
                </div>
              </div>

              {/* Remaining vitals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vit-hr">Heart Rate (bpm)</Label>
                  <Input id="vit-hr" type="number" placeholder="—" min={0} max={300}
                    value={form.heartRate} onChange={(e) => set("heartRate", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vit-rr">Resp. Rate (/min)</Label>
                  <Input id="vit-rr" type="number" placeholder="—" min={0} max={100}
                    value={form.respiratoryRate} onChange={(e) => set("respiratoryRate", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vit-spo2">SpO₂ (%)</Label>
                  <Input id="vit-spo2" type="number" placeholder="—" min={0} max={100}
                    value={form.spo2} onChange={(e) => set("spo2", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vit-temp">Temperature (°C)</Label>
                  <Input id="vit-temp" type="number" placeholder="—" step="0.1" min={30} max={45}
                    value={form.temperature} onChange={(e) => set("temperature", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vit-wt">Weight (kg)</Label>
                  <Input id="vit-wt" type="number" placeholder="—" step="0.1" min={0} max={500}
                    value={form.weight} onChange={(e) => set("weight", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vit-ht">Height (cm)</Label>
                  <Input id="vit-ht" type="number" placeholder="—" min={0} max={300}
                    value={form.height} onChange={(e) => set("height", e.target.value)} />
                </div>
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
                  disabled={saving || !hasValue}
                  className={cn(buttonVariants(), "gap-2")}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving…" : "Save Vitals"}
                </button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Alert group sub-component ────────────────────────────────────────────────

function AlertGroup({
  severity, heading, alerts,
}: {
  severity: "critical" | "abnormal"
  heading: string
  alerts: VitalAlert[]
}) {
  const isCritical = severity === "critical"
  const containerCls = isCritical
    ? "border-red-200 bg-red-50"
    : "border-amber-200 bg-amber-50"
  const headingCls = isCritical ? "text-red-800" : "text-amber-800"
  const rowCls     = isCritical ? "text-red-700" : "text-amber-700"
  const iconCls    = isCritical ? "text-red-500" : "text-amber-500"

  return (
    <div className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${containerCls}`}>
      <p className={`text-[11px] font-bold uppercase tracking-widest ${headingCls}`}>
        {isCritical ? "⛔" : "⚠️"} {heading}
      </p>
      {alerts.map((a) => (
        <div key={a.label} className={`flex items-center justify-between text-sm ${rowCls}`}>
          <span className="flex items-center gap-1.5 font-medium">
            {a.direction === "low"
              ? <ArrowDown className={`h-3.5 w-3.5 ${iconCls}`} />
              : <ArrowUp   className={`h-3.5 w-3.5 ${iconCls}`} />}
            {a.label}
          </span>
          <span className="font-mono font-semibold">
            {a.value} {a.unit}
          </span>
          <span className="text-xs opacity-75">
            {a.direction === "low" ? `< ${a.threshold}` : `> ${a.threshold}`} {a.unit}
          </span>
        </div>
      ))}
    </div>
  )
}
