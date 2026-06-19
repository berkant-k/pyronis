"use client"

import { useState } from "react"
import { ScrollText, Pencil } from "lucide-react"
import type { Consent } from "@medplum/fhirtypes"
import {
  formatDate,
  getDirectiveType,
  getDirectiveNotes,
  ADVANCE_DIRECTIVE_DISPLAY,
  ADVANCE_DIRECTIVE_STATUS_DISPLAY,
  advanceDirectiveStatusColor,
} from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"
import { Card } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AdvanceDirectiveFormDialog } from "./AdvanceDirectiveFormDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  initialDirectives: Consent[]
  patientId:         string
  patient?:          PatientInfo
}

export function PatientAdvanceDirectivesTab({ initialDirectives, patientId, patient }: Props) {
  const [directives, setDirectives] = useState<Consent[]>(initialDirectives)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Consent | undefined>(undefined)

  function handleSuccess(saved: Consent) {
    setDirectives((prev) => {
      const idx = prev.findIndex((d) => d.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  function openNew()             { setEditTarget(undefined); setDialogOpen(true) }
  function openEdit(c: Consent)  { setEditTarget(c);         setDialogOpen(true) }

  const active   = directives.filter((d) => d.status === "active")
  const inactive = directives.filter((d) => d.status !== "active")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openNew}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <ScrollText className="h-3.5 w-3.5" />
          Add Directive
        </button>
      </div>

      {!directives.length ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No advance directives recorded
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <DirectiveSection heading="Active Directives" directives={active} onEdit={openEdit} />
          )}
          {inactive.length > 0 && (
            <DirectiveSection heading="Inactive / Revoked" directives={inactive} onEdit={openEdit} />
          )}
        </div>
      )}

      <AdvanceDirectiveFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        directive={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </div>
  )
}

function DirectiveSection({
  heading, directives, onEdit,
}: { heading: string; directives: Consent[]; onEdit: (c: Consent) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">{heading}</p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Directive</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Witnessed By</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {directives.map((c) => {
              const code       = getDirectiveType(c)
              const label      = ADVANCE_DIRECTIVE_DISPLAY[code] ?? c.category?.[0]?.text ?? code
              const statusColor = advanceDirectiveStatusColor(c.status ?? "")
              const statusLbl  = ADVANCE_DIRECTIVE_STATUS_DISPLAY[c.status ?? ""] ?? c.status
              const witness    = (c.performer?.[0] as { display?: string } | undefined)?.display
              const notes      = getDirectiveNotes(c)

              return (
                <TableRow key={c.id} className="group">
                  <TableCell className="font-semibold">{label}</TableCell>
                  <TableCell>
                    <StatusPill color={statusColor} label={statusLbl ?? ""} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(c.dateTime)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {witness ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    {notes
                      ? <span className="text-sm text-muted-foreground line-clamp-2">{notes}</span>
                      : <span className="text-muted-foreground text-sm">—</span>}
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
    </div>
  )
}
