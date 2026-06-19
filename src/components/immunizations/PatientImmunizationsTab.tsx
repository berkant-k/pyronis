"use client"

import { useState } from "react"
import { Syringe, Pencil } from "lucide-react"
import type { Immunization } from "@medplum/fhirtypes"
import { formatDate, immunizationStatusColor } from "@/lib/fhir-client"
import { Card } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ImmunizationFormDialog } from "./ImmunizationFormDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  initialImmunizations: Immunization[]
  patientId: string
  patient?:  PatientInfo
}

export function PatientImmunizationsTab({ initialImmunizations, patientId, patient }: Props) {
  const [immunizations, setImmunizations] = useState<Immunization[]>(initialImmunizations)
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editTarget, setEditTarget]       = useState<Immunization | undefined>(undefined)

  function handleSuccess(saved: Immunization) {
    setImmunizations((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  function openNew() {
    setEditTarget(undefined)
    setDialogOpen(true)
  }

  function openEdit(imm: Immunization) {
    setEditTarget(imm)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openNew}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Syringe className="h-3.5 w-3.5" />
          Record Immunization
        </button>
      </div>

      {!immunizations.length ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No immunizations found
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaccine</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-20">Route</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="w-16">Dose #</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {immunizations.map((imm) => {
                const statusCls = immunizationStatusColor(imm.status ?? "")
                return (
                  <TableRow key={imm.id} className="group">
                    <TableCell className="font-medium">
                      {imm.vaccineCode?.text ?? imm.vaccineCode?.coding?.[0]?.display ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(imm.occurrenceDateTime)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {imm.route?.text ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {imm.site?.text ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {imm.protocolApplied?.[0]?.doseNumberPositiveInt ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusPill color={statusCls} label={imm.status === "not-done" ? "Not Given" : "Given"} />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openEdit(imm)}
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

      <ImmunizationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        immunization={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </div>
  )
}
