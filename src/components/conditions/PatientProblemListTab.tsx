"use client"

import { useState } from "react"
import { Stethoscope, Pencil, ArrowUpToLine, Loader2 } from "lucide-react"
import type { Condition } from "@medplum/fhirtypes"
import { updateCondition, parseCondition, formatDate, conditionClinicalStatusColor, conditionVerificationStatusColor } from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"
import { Card } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ConditionFormDialog } from "@/components/encounters/ConditionFormDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"

const ACTIVE_STATUSES = new Set(["active", "recurrence", "relapse"])

interface Props {
  initialConditions: Condition[]
  patientId: string
  patient?: PatientInfo
}

export function PatientProblemListTab({ initialConditions, patientId, patient }: Props) {
  const [conditions, setConditions] = useState<Condition[]>(initialConditions)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editTarget, setEditTarget]   = useState<Condition | undefined>(undefined)
  const [defaultCat, setDefaultCat]   = useState<"problem-list-item" | "encounter-diagnosis">("problem-list-item")
  const [promoting, setPromoting]     = useState<string | null>(null)

  function handleSuccess(saved: Condition) {
    setConditions((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  function openNew(cat: "problem-list-item" | "encounter-diagnosis" = "problem-list-item") {
    setEditTarget(undefined)
    setDefaultCat(cat)
    setDialogOpen(true)
  }

  function openEdit(c: Condition) {
    setEditTarget(c)
    setDialogOpen(true)
  }

  async function promote(c: Condition) {
    setPromoting(c.id!)
    try {
      const parsed = parseCondition(c)
      const saved  = await updateCondition(c.id!, { ...parsed, category: "problem-list-item" })
      handleSuccess(saved)
    } finally {
      setPromoting(null)
    }
  }

  const problemList = conditions.filter(
    (c) => c.category?.[0]?.coding?.[0]?.code === "problem-list-item"
  )
  const encounterDx = conditions.filter(
    (c) => c.category?.[0]?.coding?.[0]?.code !== "problem-list-item"
  )

  const activeProblems   = problemList.filter((c) => ACTIVE_STATUSES.has(c.clinicalStatus?.coding?.[0]?.code ?? ""))
  const resolvedProblems = problemList.filter((c) => !ACTIVE_STATUSES.has(c.clinicalStatus?.coding?.[0]?.code ?? ""))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => openNew("problem-list-item")}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Stethoscope className="h-3.5 w-3.5" />
          Add Problem
        </button>
      </div>

      {!conditions.length ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No conditions recorded
        </div>
      ) : (
        <div className="space-y-4">
          <ProblemSection
            heading="Active Problems"
            conditions={activeProblems}
            onEdit={openEdit}
            emptyLabel={resolvedProblems.length || encounterDx.length ? "No active problems" : undefined}
          />
          {resolvedProblems.length > 0 && (
            <ProblemSection
              heading="Resolved / Inactive"
              conditions={resolvedProblems}
              onEdit={openEdit}
            />
          )}
          {encounterDx.length > 0 && (
            <EncounterDxSection
              conditions={encounterDx}
              promoting={promoting}
              onEdit={openEdit}
              onPromote={promote}
            />
          )}
        </div>
      )}

      <ConditionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        defaultCategory={defaultCat}
        condition={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </div>
  )
}

// ─── Problem list section (active or resolved) ─────────────────────────────

function ProblemSection({
  heading,
  conditions,
  onEdit,
  emptyLabel,
}: {
  heading:    string
  conditions: Condition[]
  onEdit:     (c: Condition) => void
  emptyLabel?: string
}) {
  if (!conditions.length && !emptyLabel) return null
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">{heading}</p>
      {!conditions.length ? (
        <p className="text-sm text-muted-foreground px-0.5">{emptyLabel}</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Problem</TableHead>
                <TableHead className="w-32">Clinical Status</TableHead>
                <TableHead className="w-24">Severity</TableHead>
                <TableHead className="w-28">Onset</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {conditions.map((c) => {
                const label   = c.code?.text ?? c.code?.coding?.[0]?.display ?? "—"
                const icdCode = c.code?.coding?.[0]?.code
                const cStatus = c.clinicalStatus?.coding?.[0]?.code ?? ""
                const vStatus = c.verificationStatus?.coding?.[0]?.code ?? ""
                const sev     = c.severity?.coding?.[0]?.display
                const note    = c.note?.[0]?.text
                return (
                  <TableRow key={c.id} className="group">
                    <TableCell>
                      <div className="font-semibold">{label}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {icdCode && (
                          <span className="font-mono text-xs text-muted-foreground">{icdCode}</span>
                        )}
                        <StatusPill color={conditionVerificationStatusColor(vStatus)} label={vStatus} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill color={conditionClinicalStatusColor(cStatus)} label={cStatus} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {sev ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.onsetDateTime ?? c.recordedDate)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {note
                        ? <span className="text-sm text-muted-foreground line-clamp-2">{note}</span>
                        : <span className="text-muted-foreground/40 text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        className="text-muted-foreground/40 group-hover:text-primary transition-colors"
                        title="Edit"
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
    </div>
  )
}

// ─── Encounter diagnoses section ──────────────────────────────────────────────

function EncounterDxSection({
  conditions,
  promoting,
  onEdit,
  onPromote,
}: {
  conditions: Condition[]
  promoting:  string | null
  onEdit:     (c: Condition) => void
  onPromote:  (c: Condition) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
        Encounter Diagnoses
        <span className="ml-1 font-normal normal-case">(not on problem list)</span>
      </p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Diagnosis</TableHead>
              <TableHead className="w-32">Clinical Status</TableHead>
              <TableHead className="w-28">Verification</TableHead>
              <TableHead className="w-28">Onset</TableHead>
              <TableHead className="w-20 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {conditions.map((c) => {
              const label   = c.code?.text ?? c.code?.coding?.[0]?.display ?? "—"
              const icdCode = c.code?.coding?.[0]?.code
              const cStatus = c.clinicalStatus?.coding?.[0]?.code ?? ""
              const vStatus = c.verificationStatus?.coding?.[0]?.code ?? ""
              return (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <span className="font-medium">{label}</span>
                    {icdCode && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{icdCode}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill color={conditionClinicalStatusColor(cStatus)} label={cStatus} />
                  </TableCell>
                  <TableCell>
                    <StatusPill color={conditionVerificationStatusColor(vStatus)} label={vStatus} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.onsetDateTime ?? c.recordedDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onPromote(c)}
                        disabled={promoting === c.id}
                        className="text-muted-foreground/60 hover:text-primary transition-colors"
                        title="Promote to Problem List"
                      >
                        {promoting === c.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ArrowUpToLine className="h-3.5 w-3.5" />
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        className="text-muted-foreground/40 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
