"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { PlayCircle, Search, X, Loader2, User, Calendar, UserRound } from "lucide-react"
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
  createEncounter,
  searchPractitioners,
  practitionerDisplayName,
  getPractitionerQualification,
  getPatientMRN,
  patientDisplayName,
  patientAge,
  formatDate,
} from "@/lib/fhir-client"
import type { Patient, Practitioner } from "@medplum/fhirtypes"

// ─── Constants ────────────────────────────────────────────────────────────────

const ENCOUNTER_CLASSES = [
  { code: "AMB",  display: "Ambulatory" },
  { code: "IMP",  display: "Inpatient" },
  { code: "EMER", display: "Emergency" },
  { code: "VR",   display: "Virtual" },
  { code: "HH",   display: "Home Health" },
] as const

const ENCOUNTER_TYPES = [
  "Consultation",
  "Follow-up",
  "Urgent care",
  "Annual wellness visit",
  "Pre-operative assessment",
  "Post-operative follow-up",
  "Chronic disease management",
  "Medication review",
]

// ─── Patient info card ────────────────────────────────────────────────────────

function PatientInfoCard({ patient }: { patient: Patient }) {
  const mrn = getPatientMRN(patient)
  const age = patientAge(patient)
  const dob = formatDate(patient.birthDate)
  const gender = patient.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
    : null
  const isActive = patient.active !== false

  return (
    <div className="rounded-lg border bg-muted/30 px-3.5 py-3 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{patientDisplayName(patient)}</span>
          {mrn && (
            <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
              MR-{mrn}
            </span>
          )}
          {!isActive && (
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Inactive
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
          {patient.birthDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dob} · {age} yrs
            </span>
          )}
          {gender && <span>{gender}</span>}
        </div>
      </div>
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
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {practitionerDisplayName(p)}
              <button
                type="button"
                onClick={() => onToggle(p)}
                className="hover:text-destructive transition-colors"
                aria-label={`Remove ${practitionerDisplayName(p)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Results list */}
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
                {/* Checkbox indicator */}
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {isSelected && (
                    <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-current">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 font-medium truncate">{practitionerDisplayName(p)}</span>
                {qual && (
                  <span className="shrink-0 text-xs text-muted-foreground">{qual}</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Main button ──────────────────────────────────────────────────────────────

interface StartEncounterButtonProps {
  patientId: string
  patient?: Patient
}

export function StartEncounterButton({ patientId, patient }: StartEncounterButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [classCode, setClassCode] = useState("")
  const [typeText, setTypeText] = useState("")
  const [reasonText, setReasonText] = useState("")
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setClassCode("")
    setTypeText("")
    setReasonText("")
    setPractitioners([])
    setError(null)
  }

  function togglePractitioner(p: Practitioner) {
    setPractitioners((prev) =>
      prev.some((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!classCode) { setError("Please select an encounter class."); return }
    setLoading(true)
    setError(null)
    try {
      const cls = ENCOUNTER_CLASSES.find((c) => c.code === classCode)!
      await createEncounter({
        patientId,
        classCode: cls.code,
        classDisplay: cls.display,
        typeText: typeText || undefined,
        reasonText: reasonText.trim() || undefined,
        periodStart: new Date().toISOString(),
        participantIds: practitioners.map((p) => p.id!).filter(Boolean),
      })
      setOpen(false)
      reset()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start encounter")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger className={cn(buttonVariants(), "gap-2")}>
        <PlayCircle className="h-4 w-4" />
        Start Encounter
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start Encounter</DialogTitle>
          <DialogDescription>
            Opens a new in-progress encounter for this patient.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Patient info */}
            {patient && <PatientInfoCard patient={patient} />}

            {/* Encounter class */}
            <div className="space-y-1.5">
              <Label htmlFor="enc-class">
                Encounter class <span className="text-destructive">*</span>
              </Label>
              <Select value={classCode} onValueChange={(v) => setClassCode(v ?? "")}>
                <SelectTrigger id="enc-class" className="w-full">
                  <SelectValue placeholder="Select class…" />
                </SelectTrigger>
                <SelectContent>
                  {ENCOUNTER_CLASSES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Encounter type */}
            <div className="space-y-1.5">
              <Label htmlFor="enc-type">Type</Label>
              <Select value={typeText} onValueChange={(v) => setTypeText(v ?? "")}>
                <SelectTrigger id="enc-type" className="w-full">
                  <SelectValue placeholder="Select type (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {ENCOUNTER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chief complaint */}
            <div className="space-y-1.5">
              <Label htmlFor="enc-reason">Chief complaint</Label>
              <Textarea
                id="enc-reason"
                placeholder="Describe the reason for this encounter (optional)…"
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
                Participating Practitioners
              </Label>
              <PractitionerSelector
                selected={practitioners}
                onToggle={togglePractitioner}
              />
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
              {loading ? "Starting…" : "Start Encounter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
