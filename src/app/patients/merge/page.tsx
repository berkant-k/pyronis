"use client"

import { useState } from "react"
import type { Patient } from "@medplum/fhirtypes"
import {
  mergePatients,
  patientDisplayName,
  patientAge,
  formatDate,
  getPatientMRN,
  getPatientQID,
  getPatientPassport,
  getPatientPhone,
  getPatientNationality,
  EXT_VIP,
  EXT_INSURANCE,
  EXT_LANGUAGE,
  EXT_NAME_LANGUAGE,
} from "@/lib/fhir-client"
import { COUNTRIES } from "@/lib/countries"
import { PatientPickerSearch } from "@/components/patients/PatientPickerSearch"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2, GitMerge, Loader2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

function patientArabicName(p: Patient): string {
  const name = p.name?.find((n) =>
    n.extension?.some((x) => x.url === EXT_LANGUAGE || x.url === EXT_NAME_LANGUAGE)
  )
  if (!name) return ""
  const parts = [...(name.given ?? []), name.family ?? ""].filter(Boolean)
  return parts.join(" ").trim()
}

function getEmail(p: Patient): string {
  return p.telecom?.find((t) => t.system === "email")?.value ?? ""
}

function getInsurance(p: Patient): string {
  return p.extension?.find((x) => x.url === EXT_INSURANCE)?.valueString ?? ""
}

function isVip(p: Patient): boolean {
  return p.extension?.find((x) => x.url === EXT_VIP)?.valueBoolean === true
}

function nationalityLabel(p: Patient): string {
  const code = getPatientNationality(p)
  if (!code) return ""
  return COUNTRIES.find((c) => c.code === code)?.name ?? code
}

interface CompareRow {
  label: string
  a: string
  b: string
}

function buildRows(a: Patient, b: Patient): CompareRow[] {
  const mrnA = getPatientMRN(a)
  const mrnB = getPatientMRN(b)
  return [
    { label: "MRN",           a: mrnA ? `MR-${mrnA}` : "",       b: mrnB ? `MR-${mrnB}` : "" },
    { label: "Name (English)", a: patientDisplayName(a),           b: patientDisplayName(b) },
    { label: "Name (Arabic)",  a: patientArabicName(a),            b: patientArabicName(b) },
    { label: "Date of Birth",  a: formatDate(a.birthDate),         b: formatDate(b.birthDate) },
    { label: "Age",            a: `${patientAge(a)} yrs`,          b: `${patientAge(b)} yrs` },
    { label: "Gender",         a: a.gender ?? "",                  b: b.gender ?? "" },
    { label: "QID",            a: getPatientQID(a),                b: getPatientQID(b) },
    { label: "Passport",       a: getPatientPassport(a),           b: getPatientPassport(b) },
    { label: "Nationality",    a: nationalityLabel(a),             b: nationalityLabel(b) },
    { label: "Phone",          a: getPatientPhone(a),              b: getPatientPhone(b) },
    { label: "Email",          a: getEmail(a),                     b: getEmail(b) },
    { label: "Insurance",      a: getInsurance(a),                 b: getInsurance(b) },
    { label: "VIP",            a: isVip(a) ? "Yes" : "No",        b: isVip(b) ? "Yes" : "No" },
    { label: "Active",         a: a.active !== false ? "Yes" : "No", b: b.active !== false ? "Yes" : "No" },
  ]
}

export default function MergePatientsPage() {
  const [patientA, setPatientA] = useState<Patient | null>(null)
  const [patientB, setPatientB] = useState<Patient | null>(null)
  const [survivor, setSurvivor] = useState<"A" | "B">("B")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [merging, setMerging] = useState(false)
  const [merged, setMerged] = useState<Patient | null>(null)
  const [error, setError] = useState<string | null>(null)

  const bothSelected = patientA !== null && patientB !== null
  const survivorPatient = survivor === "A" ? patientA : patientB
  const loserPatient   = survivor === "A" ? patientB : patientA
  const rows = bothSelected ? buildRows(patientA, patientB) : []

  async function handleMerge() {
    if (!patientA?.id || !patientB?.id) return
    setMerging(true)
    setError(null)
    try {
      const survivorId = survivor === "A" ? patientA.id : patientB.id
      const loserId    = survivor === "A" ? patientB.id : patientA.id
      await mergePatients(survivorId, loserId)
      setMerged(survivorPatient)
      setDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed")
    } finally {
      setMerging(false)
    }
  }

  if (merged) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Merge Complete</h2>
          <p className="text-muted-foreground text-sm mb-6">
            The duplicate record has been deactivated and linked to the surviving patient via{" "}
            <code className="text-xs bg-muted px-1 rounded">Patient.link</code>.
          </p>
          <div className="flex flex-col gap-2">
            <Link href={`/patients/${merged.id}`} className={cn(buttonVariants(), "w-full justify-center")}>
              View Surviving Patient — {patientDisplayName(merged)}
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setPatientA(null)
                setPatientB(null)
                setMerged(null)
                setSurvivor("B")
              }}
            >
              Merge Another Pair
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitMerge className="h-6 w-6 text-primary" />
          Merge Patients
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Search for two patient records, compare them side by side, and consolidate into one.
        </p>
      </div>

      {/* Search panels */}
      <div className="grid grid-cols-2 gap-4">
        {(["A", "B"] as const).map((side) => {
          const selected = side === "A" ? patientA : patientB
          const setSelected = side === "A" ? setPatientA : setPatientB
          const otherSelected = side === "A" ? patientB : patientA
          const isSurvivor = survivor === side
          return (
            <div key={side} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Patient {side}
                </h2>
                {bothSelected && (
                  <button
                    onClick={() => setSurvivor(side)}
                    className={cn(
                      "text-xs px-2.5 py-0.5 rounded-full border transition-colors",
                      isSurvivor
                        ? "bg-primary text-white border-primary"
                        : "border-input text-muted-foreground hover:border-primary hover:text-primary"
                    )}
                  >
                    {isSurvivor ? "✓ Survivor" : "Set as Survivor"}
                  </button>
                )}
              </div>
              <PatientPickerSearch
                selected={selected}
                onSelect={setSelected}
                onClear={() => setSelected(null)}
                disabledId={otherSelected?.id}
              />
            </div>
          )
        })}
      </div>

      {/* Comparison table */}
      {bothSelected && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Field Comparison</h2>
            <p className="text-xs text-muted-foreground">
              Amber rows indicate differences between the two records
            </p>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-36">Field</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      Patient A
                      {survivor === "A"
                        ? <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-normal">Survivor</span>
                        : <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full font-normal">Inactive</span>
                      }
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      Patient B
                      {survivor === "B"
                        ? <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-normal">Survivor</span>
                        : <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full font-normal">Inactive</span>
                      }
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ label, a, b }) => {
                  const differs = a !== b && a !== "" && b !== ""
                  return (
                    <tr key={label} className={cn("border-b last:border-0", differs && "bg-amber-50/60")}>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {label}
                      </td>
                      <td className={cn("px-4 py-2.5", differs && "text-amber-800 font-medium")}>
                        {a || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={cn("px-4 py-2.5", differs && "text-amber-800 font-medium")}>
                        {b || <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Merge action bar */}
      {bothSelected && survivorPatient && loserPatient && (
        <div className="flex items-center justify-between rounded-lg border bg-card px-5 py-4">
          <div>
            <p className="text-sm font-medium">
              Keep{" "}
              <span className="text-primary font-semibold">{patientDisplayName(survivorPatient)}</span>
              {" · "}Deactivate{" "}
              <span className="text-destructive font-semibold">{patientDisplayName(loserPatient)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The deactivated record will be marked inactive and linked via{" "}
              <code className="bg-muted px-1 rounded text-[11px]">Patient.link</code>.
              Use the Survivor buttons above to change direction.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger className={cn(buttonVariants(), "gap-2 ml-6 shrink-0")}>
              <GitMerge className="h-4 w-4" />
              Merge Patients
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Confirm Merge
                </DialogTitle>
                <DialogDescription>
                  This cannot be undone from the UI. The merged-away patient will be permanently deactivated.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full shrink-0">
                      Keep
                    </span>
                    <span className="font-medium truncate">{patientDisplayName(survivorPatient)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full shrink-0">
                      Deactivate
                    </span>
                    <span className="font-medium truncate">{patientDisplayName(loserPatient)}</span>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                    {error}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={merging}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleMerge} disabled={merging} className="gap-2">
                  {merging
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <GitMerge className="h-4 w-4" />
                  }
                  {merging ? "Merging…" : "Confirm Merge"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
