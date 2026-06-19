"use client"

import { useState } from "react"
import { Flag, Pencil } from "lucide-react"
import type { Flag as FhirFlag } from "@medplum/fhirtypes"
import { formatDate, flagCategoryColor, flagStatusColor, FLAG_CATEGORY_DISPLAY } from "@/lib/fhir-client"
import { Card } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FlagFormDialog } from "./FlagFormDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  initialFlags: FhirFlag[]
  patientId:    string
  patient?:     PatientInfo
}

export function PatientFlagsTab({ initialFlags, patientId, patient }: Props) {
  const [flags, setFlags]           = useState<FhirFlag[]>(initialFlags)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FhirFlag | undefined>(undefined)

  function handleSuccess(saved: FhirFlag) {
    setFlags((prev) => {
      const idx = prev.findIndex((f) => f.id === saved.id)
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

  function openEdit(f: FhirFlag) {
    setEditTarget(f)
    setDialogOpen(true)
  }

  const active   = flags.filter((f) => f.status === "active")
  const inactive = flags.filter((f) => f.status !== "active")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openNew}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Flag className="h-3.5 w-3.5" />
          Add Flag
        </button>
      </div>

      {!flags.length ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No flags recorded
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <FlagSection heading="Active" flags={active} onEdit={openEdit} />
          )}
          {inactive.length > 0 && (
            <FlagSection heading="Inactive" flags={inactive} onEdit={openEdit} />
          )}
        </>
      )}

      <FlagFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        flag={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </div>
  )
}

function FlagSection({
  heading,
  flags,
  onEdit,
}: {
  heading: string
  flags:   FhirFlag[]
  onEdit:  (f: FhirFlag) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
        {heading}
      </p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flag</TableHead>
              <TableHead className="w-32">Category</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-28">From</TableHead>
              <TableHead className="w-28">To</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.map((f) => {
              const cat       = f.category?.[0]?.coding?.[0]?.code ?? ""
              const catLabel  = FLAG_CATEGORY_DISPLAY[cat] ?? f.category?.[0]?.text ?? "—"
              const catCls    = flagCategoryColor(cat)
              const statusCls = flagStatusColor(f.status ?? "")
              const author    = (f.author as { display?: string } | undefined)?.display

              return (
                <TableRow key={f.id} className="group">
                  <TableCell className="font-medium">
                    {f.code?.text ?? f.code?.coding?.[0]?.display ?? "—"}
                  </TableCell>
                  <TableCell>
                    {cat ? (
                      <StatusPill color={catCls} label={catLabel} />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill color={statusCls} label={f.status ?? ""} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(f.period?.start)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(f.period?.end)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {author ?? "—"}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onEdit(f)}
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
