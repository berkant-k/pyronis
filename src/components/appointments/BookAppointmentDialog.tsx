"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlus, Search, X, Loader2, User, UserRound } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { PatientBanner } from "@/components/ui/PatientBanner"
import {
  createAppointment,
  searchPatients,
  searchPractitioners,
  practitionerDisplayName,
  getPractitionerQualification,
  patientDisplayName,
  getPatientMRN,
} from "@/lib/fhir-client"
import type { Patient, Practitioner } from "@medplum/fhirtypes"

// ─── Constants ────────────────────────────────────────────────────────────────

const APPT_TYPES = [
  { code: "ROUTINE",   label: "Routine" },
  { code: "WALKIN",    label: "Walk-in" },
  { code: "CHECKUP",   label: "Check-up" },
  { code: "FOLLOWUP",  label: "Follow-up" },
  { code: "URGENT",    label: "Urgent" },
  { code: "EMERGENCY", label: "Emergency" },
]

const SERVICE_TYPES = [
  "General Practice", "Cardiology", "Dermatology", "Endocrinology",
  "Gastroenterology", "Nephrology", "Neurology", "Obstetrics & Gynecology",
  "Orthopedics", "Pediatrics", "Psychiatry", "Pulmonology",
  "Radiology", "Rheumatology", "Surgery", "Urology",
]

const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
]

// ─── Inline patient search ────────────────────────────────────────────────────

function PatientPicker({
  selected,
  onSelect,
}: {
  selected: Patient | null
  onSelect: (p: Patient | null) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const keyRef = useRef(0)

  useEffect(() => {
    const key = ++keyRef.current
    const delay = query.trim() ? 350 : 0
    const t = setTimeout(() => {
      if (!query.trim()) { setResults([]); return }
      setLoading(true)
      searchPatients(query.trim())
        .then((r) => { if (key === keyRef.current) setResults(r) })
        .catch(() => { if (key === keyRef.current) setResults([]) })
        .finally(() => { if (key === keyRef.current) setLoading(false) })
    }, delay)
    return () => clearTimeout(t)
  }, [query])

  if (selected) {
    return (
      <div className="space-y-2">
        <PatientBanner name={patientDisplayName(selected)} gender={selected.gender} birthDate={selected.birthDate} />
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery(""); setResults([]) }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Change patient
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, MRN, or QID…"
          className="pl-8 h-8 text-sm"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {query.trim() && (
        <div className="max-h-36 overflow-y-auto rounded-md border divide-y bg-background">
          {loading ? (
            <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No patients found</p>
          ) : (
            results.map((p) => {
              const mrn = getPatientMRN(p)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-medium truncate">{patientDisplayName(p)}</span>
                  {mrn && <span className="shrink-0 font-mono text-xs text-muted-foreground">MR-{mrn}</span>}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── Practitioner selector ────────────────────────────────────────────────────

function PractitionerSelector({
  selected,
  onToggle,
}: {
  selected: Practitioner[]
  onToggle: (p: Practitioner) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Practitioner[]>([])
  const [loading, setLoading] = useState(false)
  const keyRef = useRef(0)

  useEffect(() => {
    const key = ++keyRef.current
    const delay = query.trim() ? 350 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchPractitioners(query.trim() || undefined)
        .then((r) => { if (key === keyRef.current) setResults(r) })
        .catch(() => { if (key === keyRef.current) setResults([]) })
        .finally(() => { if (key === keyRef.current) setLoading(false) })
    }, delay)
    return () => clearTimeout(t)
  }, [query])

  const selectedIds = new Set(selected.map((p) => p.id))

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {practitionerDisplayName(p)}
              <button type="button" onClick={() => onToggle(p)} className="hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search practitioners…"
          className="pl-8 h-8 text-sm"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="max-h-36 overflow-y-auto rounded-md border divide-y bg-background">
        {loading ? (
          <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : results.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {query ? "No practitioners found" : "No practitioners on server"}
          </p>
        ) : (
          results.map((p) => {
            const isSelected = selectedIds.has(p.id)
            const qual = getPractitionerQualification(p)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggle(p)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
                  isSelected && "bg-primary/5"
                )}
              >
                <span className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                )}>
                  {isSelected && (
                    <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-current">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 font-medium truncate">{practitionerDisplayName(p)}</span>
                {qual && <span className="shrink-0 text-xs text-muted-foreground">{qual}</span>}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface BookAppointmentDialogProps {
  patientId?: string
  patient?: Patient
  onSuccess?: () => void
}

export function BookAppointmentDialog({ patientId, patient: preloadedPatient, onSuccess }: BookAppointmentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preloadedPatient ?? null)
  const [start, setStart] = useState("")
  const [duration, setDuration] = useState("30")
  const [appointmentType, setAppointmentType] = useState("")
  const [serviceType, setServiceType] = useState("")
  const [reasonText, setReasonText] = useState("")
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectivePatientId = patientId ?? selectedPatient?.id

  function reset() {
    if (!patientId) setSelectedPatient(null)
    setStart("")
    setDuration("30")
    setAppointmentType("")
    setServiceType("")
    setReasonText("")
    setPractitioners([])
    setError(null)
  }

  function togglePractitioner(p: Practitioner) {
    setPractitioners((prev) =>
      prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectivePatientId) { setError("Please select a patient."); return }
    if (!start) { setError("Please select a date and time."); return }
    setLoading(true)
    setError(null)
    try {
      await createAppointment({
        patientId: effectivePatientId,
        start,
        durationMinutes: parseInt(duration, 10),
        serviceType: serviceType || undefined,
        appointmentType: appointmentType || undefined,
        reasonText: reasonText.trim() || undefined,
        participantIds: practitioners.map((p) => p.id!).filter(Boolean),
      })
      setOpen(false)
      reset()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      <DialogTrigger className={cn(buttonVariants(), "gap-2")}>
        <CalendarPlus className="h-4 w-4" />
        Book Appointment
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogDescription>Schedule a new appointment for a patient.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Patient */}
            {patientId && preloadedPatient ? (
              <PatientBanner name={patientDisplayName(preloadedPatient)} gender={preloadedPatient.gender} birthDate={preloadedPatient.birthDate} />
            ) : (
              <div className="space-y-1.5">
                <Label>Patient <span className="text-destructive">*</span></Label>
                <PatientPicker selected={selectedPatient} onSelect={setSelectedPatient} />
              </div>
            )}

            {/* Date & time */}
            <div className="space-y-1.5">
              <Label htmlFor="appt-start">
                Date & time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="appt-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="appt-duration">Duration</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v ?? "30")}>
                <SelectTrigger id="appt-duration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="appt-type">Appointment type</Label>
              <Select value={appointmentType} onValueChange={(v) => setAppointmentType(v ?? "")}>
                <SelectTrigger id="appt-type" className="w-full">
                  <SelectValue placeholder="Select type (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {APPT_TYPES.map((t) => (
                    <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service type */}
            <div className="space-y-1.5">
              <Label htmlFor="appt-service">Service type</Label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v ?? "")}>
                <SelectTrigger id="appt-service" className="w-full">
                  <SelectValue placeholder="Select service (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="appt-reason">Reason / chief complaint</Label>
              <Textarea
                id="appt-reason"
                placeholder="Describe the reason for this appointment (optional)…"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Practitioners */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                Assigned Practitioners
              </Label>
              <PractitionerSelector selected={practitioners} onToggle={togglePractitioner} />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={loading}>
              {loading ? "Booking…" : "Book Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
