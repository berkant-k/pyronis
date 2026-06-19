"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pill, Trash2, Loader2, Printer } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  cancelDischargeRx,
  parseDischargeRx,
  rxStatusColor,
} from "@/lib/fhir-client"
import type { MedicationRequest } from "@medplum/fhirtypes"
import { StatusPill } from "@/components/ui/StatusPill"
import config from "@/lib/config.json"

const EXT_RX_STRUCTURED = config.fhir.extensions.rxStructured
import { buttonVariants } from "@/components/ui/button"
import { DischargeRxDialog } from "./DischargeRxDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface DischargeRxManagerProps {
  patientId:    string
  encounterId:  string
  initialRx:    MedicationRequest[]
  patient?:     PatientInfo
}

export function DischargeRxManager({ patientId, encounterId, initialRx, patient }: DischargeRxManagerProps) {
  const router = useRouter()
  const [rxList, setRxList]             = useState<MedicationRequest[]>(initialRx)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError]   = useState<string | null>(null)

  function handleSaved() {
    router.refresh()
  }

  async function handleCancel(id: string) {
    setCancellingId(id); setCancelError(null)
    try {
      const updated = await cancelDischargeRx(id)
      setRxList((prev) => prev.map((r) => r.id === id ? updated : r))
      router.refresh()
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel prescription")
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pill className="h-4 w-4 text-muted-foreground" />
          Discharge Prescriptions
          <Badge variant="secondary" className="ml-1 font-mono text-xs">{rxList.length}</Badge>
          <div className="ml-auto flex items-center gap-2">
            {rxList.length > 0 && (
              <Link
                href={`/encounters/${encounterId}/discharge`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                target="_blank"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Link>
            )}
            <DischargeRxDialog
              patientId={patientId}
              encounterId={encounterId}
              mode="create"
              onSaved={handleSaved}
              patient={patient}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {rxList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No discharge prescriptions added yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>SIG (Instructions)</TableHead>
                <TableHead className="w-20">Route</TableHead>
                <TableHead className="w-20">Duration</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rxList.map((rx) => {
                const status    = rx.status ?? "active"
                const sig       = rx.dosageInstruction?.[0]?.text ?? "—"
                const route     = rx.dosageInstruction?.[0]?.route?.text
                const parsedExt = rx.extension?.find((e) => e.url === EXT_RX_STRUCTURED)
                const duration  = parsedExt?.extension?.find((e) => e.url === "duration")?.valueString
                const prn       = rx.dosageInstruction?.[0]?.asNeededBoolean
                const notes     = rx.note?.[0]?.text
                const qty       = rx.dispenseRequest?.quantity
                const refills   = rx.dispenseRequest?.numberOfRepeatsAllowed
                const canCancel = status === "active" || status === "draft"
                const parsedData = parseDischargeRx(rx)

                return (
                  <TableRow key={rx.id} className="group align-top">
                    <TableCell className="font-semibold">
                      <div>
                        {rx.medicationCodeableConcept?.text ?? "—"}
                        {prn && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-1.5 py-0.5">
                            PRN
                          </span>
                        )}
                      </div>
                      {qty && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Qty: {qty.value} {qty.unit}
                          {refills !== undefined ? ` · Refills: ${refills}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sig}
                      {notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {route ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {duration ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusPill color={rxStatusColor(status)} label={status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canCancel && (
                          <>
                            <DischargeRxDialog
                              patientId={patientId}
                              encounterId={encounterId}
                              mode="edit"
                              rxId={rx.id!}
                              initialData={parsedData}
                              onSaved={handleSaved}
                              patient={patient}
                            />
                            <button
                              onClick={() => handleCancel(rx.id!)}
                              disabled={cancellingId === rx.id}
                              title="Cancel prescription"
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50"
                            >
                              {cancellingId === rx.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {cancelError && <p className="mt-2 text-sm text-destructive">{cancelError}</p>}
      </CardContent>
    </Card>
  )
}
