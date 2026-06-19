"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AllergyIntolerance } from "@medplum/fhirtypes"
import { formatDate } from "@/lib/fhir-client"
import { AllergyFormDialog } from "./AllergyFormDialog"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus, Pencil, ShieldAlert } from "lucide-react"
import type { PatientInfo } from "@/components/ui/PatientBanner"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CRITICALITY_STYLES: Record<string, string> = {
  high:              "bg-red-100 text-red-700 border-red-200",
  low:               "bg-amber-100 text-amber-700 border-amber-200",
  "unable-to-assess":"bg-slate-100 text-slate-600 border-slate-200",
}

const CLINICAL_STATUS_STYLES: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
  resolved: "bg-blue-100 text-blue-600",
}

const SEVERITY_STYLES: Record<string, string> = {
  severe:   "bg-red-50 text-red-600",
  moderate: "bg-orange-50 text-orange-600",
  mild:     "bg-yellow-50 text-yellow-600",
}

const CATEGORY_LABELS: Record<string, string> = {
  medication:  "Medication",
  food:        "Food",
  environment: "Environment",
  biologic:    "Biologic",
}

function substanceName(a: AllergyIntolerance) {
  return a.code?.coding?.[0]?.display ?? a.code?.text ?? "—"
}

function clinicalStatusCode(a: AllergyIntolerance) {
  return a.clinicalStatus?.coding?.[0]?.code ?? "—"
}

function verificationCode(a: AllergyIntolerance) {
  return a.verificationStatus?.coding?.[0]?.code ?? "—"
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  patientId: string
  initialAllergies: AllergyIntolerance[]
  patient?: PatientInfo
}

export function AllergiesManager({ patientId, initialAllergies, patient }: Props) {
  const router = useRouter()
  const [allergies, setAllergies] = useState(initialAllergies)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AllergyIntolerance | undefined>()

  function openAdd() {
    setEditTarget(undefined)
    setDialogOpen(true)
  }

  function openEdit(a: AllergyIntolerance) {
    setEditTarget(a)
    setDialogOpen(true)
  }

  function handleSuccess(saved: AllergyIntolerance) {
    setAllergies((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id)
      return idx >= 0
        ? prev.map((a) => (a.id === saved.id ? saved : a))
        : [saved, ...prev]
    })
    router.refresh()
  }

  return (
    <>
      <AllergyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        allergy={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {allergies.length === 0
            ? "No allergies or intolerances on record"
            : <><span className="font-medium text-foreground">{allergies.length}</span> record{allergies.length !== 1 ? "s" : ""}</>
          }
        </p>
        <button
          type="button"
          onClick={openAdd}
          className={cn(buttonVariants(), "gap-2")}
        >
          <Plus className="h-4 w-4" />
          Add Allergy
        </button>
      </div>

      {allergies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-16 text-muted-foreground">
          <ShieldAlert className="h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">No allergies or intolerances recorded</p>
          <button
            type="button"
            onClick={openAdd}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2 mt-1")}
          >
            <Plus className="h-4 w-4" />
            Record first allergy
          </button>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Substance</TableHead>
                <TableHead>Type / Category</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reaction</TableHead>
                <TableHead>Onset</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {allergies.map((a) => {
                const clinical = clinicalStatusCode(a)
                const reaction = a.reaction?.[0]
                const manifestation = reaction?.manifestation?.[0]?.text
                const severity = reaction?.severity
                const category = a.category?.[0]
                const verification = verificationCode(a)

                return (
                  <TableRow key={a.id} className="group align-top">
                    {/* Substance */}
                    <TableCell>
                      <p className="font-semibold text-sm">{substanceName(a)}</p>
                      {verification !== "unconfirmed" && (
                        <span className="text-[10px] text-muted-foreground capitalize">{verification}</span>
                      )}
                    </TableCell>

                    {/* Type / Category */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {a.type && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize">
                            {a.type}
                          </span>
                        )}
                        {category && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                            {CATEGORY_LABELS[category] ?? category}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Criticality */}
                    <TableCell>
                      {a.criticality ? (
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                          CRITICALITY_STYLES[a.criticality] ?? "bg-muted text-muted-foreground"
                        )}>
                          {a.criticality === "unable-to-assess" ? "Unable to assess" : a.criticality}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Clinical status */}
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        CLINICAL_STATUS_STYLES[clinical] ?? "bg-muted text-muted-foreground"
                      )}>
                        {clinical}
                      </span>
                    </TableCell>

                    {/* Reaction */}
                    <TableCell className="max-w-[180px]">
                      {manifestation ? (
                        <div>
                          <p className="text-sm truncate">{manifestation}</p>
                          {severity && (
                            <span className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium capitalize mt-0.5",
                              SEVERITY_STYLES[severity] ?? "bg-muted text-muted-foreground"
                            )}>
                              {severity}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Onset */}
                    <TableCell className="text-sm text-muted-foreground">
                      {a.onsetDateTime ? formatDate(a.onsetDateTime) : "—"}
                    </TableCell>

                    {/* Edit */}
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}
