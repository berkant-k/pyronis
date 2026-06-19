"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Composition } from "@medplum/fhirtypes"
import {
  createSoapNote,
  updateSoapNote,
  parseSoapNote,
  formatDateTime,
  type SoapNoteInput,
} from "@/lib/fhir-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileText, Pencil, Loader2, Plus, Clock } from "lucide-react"

// ─── Section config ───────────────────────────────────────────────────────────

const SECTIONS = [
  {
    field: "subjective" as const,
    letter: "S",
    label: "Subjective",
    placeholder: "Chief complaint, history of present illness, review of systems…",
    bg: "bg-blue-50",
    border: "border-blue-200",
    chip: "bg-blue-100 text-blue-700",
    heading: "text-blue-900",
    body: "text-blue-800",
    ring: "focus-visible:ring-blue-300",
  },
  {
    field: "objective" as const,
    letter: "O",
    label: "Objective",
    placeholder: "Vital signs, physical exam findings, lab results, imaging…",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    chip: "bg-emerald-100 text-emerald-700",
    heading: "text-emerald-900",
    body: "text-emerald-800",
    ring: "focus-visible:ring-emerald-300",
  },
  {
    field: "assessment" as const,
    letter: "A",
    label: "Assessment",
    placeholder: "Diagnosis, differential diagnoses, clinical reasoning…",
    bg: "bg-amber-50",
    border: "border-amber-200",
    chip: "bg-amber-100 text-amber-700",
    heading: "text-amber-900",
    body: "text-amber-800",
    ring: "focus-visible:ring-amber-300",
  },
  {
    field: "plan" as const,
    letter: "P",
    label: "Plan",
    placeholder: "Medications, procedures, referrals, follow-up instructions…",
    bg: "bg-purple-50",
    border: "border-purple-200",
    chip: "bg-purple-100 text-purple-700",
    heading: "text-purple-900",
    body: "text-purple-800",
    ring: "focus-visible:ring-purple-300",
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

const EMPTY_FORM: FormState = { subjective: "", objective: "", assessment: "", plan: "" }

interface Props {
  patientId: string
  encounterId: string
  initialNote?: Composition
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SoapNoteEditor({ patientId, encounterId, initialNote }: Props) {
  const router = useRouter()
  const [note, setNote] = useState<Composition | undefined>(initialNote)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState>(() =>
    initialNote ? parseSoapNote(initialNote) : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function setField(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function startEdit() {
    setForm(note ? parseSoapNote(note) : EMPTY_FORM)
    setError("")
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError("")
  }

  async function handleSave() {
    const allEmpty = Object.values(form).every((v) => !v.trim())
    if (allEmpty) { setError("At least one section must have content."); return }
    setSaving(true)
    setError("")
    try {
      const input: SoapNoteInput = { patientId, encounterId, ...form }
      const saved = note?.id
        ? await updateSoapNote(note.id, input)
        : await createSoapNote(input)
      setNote(saved)
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save SOAP note")
    } finally {
      setSaving(false)
    }
  }

  const parsed = note ? parseSoapNote(note) : null

  // ── Card header (shared) ──────────────────────────────────────────────────

  const cardHeader = (
    <CardHeader className="pt-4 pb-3 border-b">
      <CardTitle className="flex items-center gap-2 text-base">
        <FileText className="h-4 w-4 text-muted-foreground" />
        SOAP Note
        {note?.date && !editing && (
          <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground ml-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(note.date)}
          </span>
        )}
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "ml-auto gap-1.5"
            )}
          >
            {note ? (
              <><Pencil className="h-3.5 w-3.5" />Edit</>
            ) : (
              <><Plus className="h-3.5 w-3.5" />Write Note</>
            )}
          </button>
        )}
      </CardTitle>
    </CardHeader>
  )

  // ── Empty / view state ────────────────────────────────────────────────────

  if (!editing) {
    return (
      <Card>
        {cardHeader}
        <CardContent className="pb-5">
          {!note || !parsed || Object.values(parsed).every((v) => !v) ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-20" />
              <p className="text-sm">No SOAP note for this encounter</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {SECTIONS.map(({ field, letter, label, bg, border, chip, heading, body }) => {
                const text = parsed[field]
                if (!text) return null
                return (
                  <div key={field} className={cn("rounded-lg border p-4", bg, border)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold", chip)}>
                        {letter}
                      </span>
                      <span className={cn("text-xs font-semibold uppercase tracking-wide", heading)}>
                        {label}
                      </span>
                    </div>
                    <p className={cn("text-sm leading-relaxed whitespace-pre-wrap", body)}>
                      {text}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────

  return (
    <Card>
      {cardHeader}
      <CardContent className="pb-5 pt-4 space-y-3">
        {SECTIONS.map(({ field, letter, label, placeholder, bg, border, chip, heading, ring }) => (
          <div key={field} className={cn("rounded-lg border p-3.5", bg, border)}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold", chip)}>
                {letter}
              </span>
              <Label className={cn("text-sm font-semibold cursor-pointer", heading)}>
                {label}
              </Label>
            </div>
            <Textarea
              value={form[field]}
              onChange={(e) => setField(field, e.target.value)}
              placeholder={placeholder}
              rows={4}
              className={cn("resize-y bg-white/80 border-white/60 text-sm shadow-none", ring)}
            />
          </div>
        ))}

        {error && <p className="text-sm text-destructive pt-1">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(buttonVariants(), "gap-2")}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Note"}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
