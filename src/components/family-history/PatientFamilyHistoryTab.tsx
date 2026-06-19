"use client"

import { useState } from "react"
import { Users, Pencil, Skull } from "lucide-react"
import type { FamilyMemberHistory } from "@medplum/fhirtypes"
import {
  FAMILY_RELATIONSHIP_DISPLAY,
  FAMILY_HISTORY_STATUS_DISPLAY,
  familyHistoryStatusColor,
} from "@/lib/fhir-client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FamilyMemberHistoryFormDialog } from "./FamilyMemberHistoryFormDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  initialHistory: FamilyMemberHistory[]
  patientId:      string
  patient?:       PatientInfo
}

export function PatientFamilyHistoryTab({ initialHistory, patientId, patient }: Props) {
  const [history, setHistory]       = useState<FamilyMemberHistory[]>(initialHistory)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FamilyMemberHistory | undefined>(undefined)

  function handleSuccess(saved: FamilyMemberHistory) {
    setHistory((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  function openNew()  { setEditTarget(undefined); setDialogOpen(true) }
  function openEdit(r: FamilyMemberHistory) { setEditTarget(r); setDialogOpen(true) }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openNew}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Users className="h-3.5 w-3.5" />
          Add Family Member
        </button>
      </div>

      {!history.length ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No family history recorded
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {history.map((r) => {
            const rel        = r.relationship?.coding?.[0]?.code ?? ""
            const relLabel   = FAMILY_RELATIONSHIP_DISPLAY[rel] ?? r.relationship?.text ?? rel
            const statusCls  = familyHistoryStatusColor(r.status ?? "")
            const statusLbl  = FAMILY_HISTORY_STATUS_DISPLAY[r.status ?? ""] ?? r.status
            const isDeceased = r.deceasedBoolean === true
            const decAge     = r.deceasedAge?.value

            return (
              <Card key={r.id} className="group relative">
                <CardContent className="pt-4 pb-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">
                          {r.name ? `${r.name} ` : ""}{relLabel}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {r.sex?.coding?.[0]?.code && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {r.sex.coding[0].code}
                            </span>
                          )}
                          {r.bornDate && (
                            <span className="text-xs text-muted-foreground">b. {r.bornDate}</span>
                          )}
                          {isDeceased && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-rose-600">
                              <Skull className="h-3 w-3" />
                              Deceased{decAge ? ` (age ${decAge})` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusPill color={statusCls} label={statusLbl ?? ""} />
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="text-muted-foreground/40 group-hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Conditions */}
                  {r.condition && r.condition.length > 0 && (
                    <div className="space-y-1">
                      {r.condition.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                          <span className="text-foreground">{c.code?.text ?? "—"}</span>
                          {c.onsetAge?.value && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                              onset {c.onsetAge.value} yrs
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* General note */}
                  {r.note?.[0]?.text && (
                    <p className="mt-2 text-xs text-muted-foreground italic leading-relaxed">
                      {r.note[0].text}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <FamilyMemberHistoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        record={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </div>
  )
}
