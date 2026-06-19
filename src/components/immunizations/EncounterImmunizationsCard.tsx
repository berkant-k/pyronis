"use client"

import { useState } from "react"
import { Syringe, Pencil } from "lucide-react"
import type { Immunization } from "@medplum/fhirtypes"
import { formatDate, immunizationStatusColor } from "@/lib/fhir-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ImmunizationFormDialog } from "./ImmunizationFormDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  patientId:            string
  encounterId:          string
  initialImmunizations: Immunization[]
  patient?:             PatientInfo
}

export function EncounterImmunizationsCard({
  patientId,
  encounterId,
  initialImmunizations,
  patient,
}: Props) {
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
    <>
      <Card>
        <CardHeader className="pt-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="h-4 w-4 text-muted-foreground" />
            Immunizations
            <Badge variant="secondary" className="ml-auto font-mono text-xs">
              {immunizations.length}
            </Badge>
            <button
              type="button"
              onClick={openNew}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs h-7")}
            >
              <Syringe className="h-3 w-3" />
              Record
            </button>
          </CardTitle>
        </CardHeader>

        {immunizations.length > 0 ? (
          <CardContent className="pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaccine</TableHead>
                  <TableHead className="w-20">Route</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="w-16">Dose #</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Date</TableHead>
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
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(imm.occurrenceDateTime)}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openEdit(imm)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
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
          </CardContent>
        ) : (
          <CardContent className="pb-5">
            <p className="text-sm text-muted-foreground text-center py-4">
              No immunizations recorded for this encounter
            </p>
          </CardContent>
        )}
      </Card>

      <ImmunizationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        encounterId={encounterId}
        immunization={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </>
  )
}
