"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Condition } from "@medplum/fhirtypes"
import { formatDate, conditionClinicalStatusColor, conditionVerificationStatusColor, conditionSeverityColor, conditionCategoryColor } from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"
import { ConditionFormDialog } from "./ConditionFormDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Pencil, Stethoscope } from "lucide-react"
import config from "@/lib/config.json"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  "encounter-diagnosis": "Enc. Diagnosis",
  "problem-list-item":   "Problem List",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function conditionName(c: Condition) {
  return c.code?.text ?? c.code?.coding?.[0]?.display ?? "—"
}

function icdCode(c: Condition) {
  return c.code?.coding?.find(
    (x) => x.system === config.fhir.codeSystems.icd10 || x.system?.includes("icd-10")
  )?.code
}

function clinicalStatus(c: Condition) {
  return c.clinicalStatus?.coding?.[0]?.code ?? "—"
}

function verificationStatus(c: Condition) {
  return c.verificationStatus?.coding?.[0]?.code ?? "—"
}

function category(c: Condition) {
  return c.category?.[0]?.coding?.[0]?.code ?? ""
}

function severity(c: Condition) {
  return c.severity?.coding?.[0]?.display?.toLowerCase() ?? ""
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  encounterId: string
  patientId: string
  initialConditions: Condition[]
  patient?: PatientInfo
}

export function ConditionsManager({ encounterId, patientId, initialConditions, patient }: Props) {
  const router = useRouter()
  const [conditions, setConditions] = useState(initialConditions)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Condition | undefined>()

  function openAdd() {
    setEditTarget(undefined)
    setDialogOpen(true)
  }

  function openEdit(c: Condition) {
    setEditTarget(c)
    setDialogOpen(true)
  }

  function handleSuccess(saved: Condition) {
    setConditions((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      return idx >= 0
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev]
    })
    router.refresh()
  }

  return (
    <>
      <ConditionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        encounterId={encounterId}
        condition={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />

      <Card>
        <CardHeader className="pt-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            Problems &amp; Conditions
            {conditions.length > 0 && (
              <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
                {conditions.length}
              </span>
            )}
            <button
              type="button"
              onClick={openAdd}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto gap-1.5")}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-4">
          {conditions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-muted-foreground">
              <Stethoscope className="h-8 w-8 opacity-20" />
              <p className="text-sm font-medium">No conditions recorded for this encounter</p>
              <button
                type="button"
                onClick={openAdd}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 mt-1")}
              >
                <Plus className="h-3.5 w-3.5" />
                Record first condition
              </button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Condition</TableHead>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead className="w-28">Clinical Status</TableHead>
                  <TableHead className="w-28">Verification</TableHead>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead className="w-28">Onset</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {conditions.map((c) => {
                  const clin = clinicalStatus(c)
                  const ver = verificationStatus(c)
                  const cat = category(c)
                  const sev = severity(c)
                  const icd = icdCode(c)

                  return (
                    <TableRow key={c.id} className="group align-top">
                      {/* Condition name + ICD */}
                      <TableCell>
                        <p className="font-semibold text-sm leading-snug">{conditionName(c)}</p>
                        {icd && (
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {icd}
                          </span>
                        )}
                        {c.note?.[0]?.text && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {c.note[0].text}
                          </p>
                        )}
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {cat && (
                          <StatusPill color={conditionCategoryColor(cat)} label={CATEGORY_LABELS[cat] ?? cat} />
                        )}
                      </TableCell>

                      {/* Clinical status */}
                      <TableCell>
                        <StatusPill color={conditionClinicalStatusColor(clin)} label={clin} />
                      </TableCell>

                      {/* Verification */}
                      <TableCell>
                        <StatusPill color={conditionVerificationStatusColor(ver)} label={ver === "entered-in-error" ? "Error" : ver} />
                      </TableCell>

                      {/* Severity */}
                      <TableCell>
                        {sev ? (
                          <StatusPill color={conditionSeverityColor(sev)} label={sev} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Onset */}
                      <TableCell className="text-sm text-muted-foreground">
                        {c.onsetDateTime ? formatDate(c.onsetDateTime) : "—"}
                      </TableCell>

                      {/* Edit */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
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
          )}
        </CardContent>
      </Card>
    </>
  )
}
