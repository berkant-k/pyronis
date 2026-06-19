"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Scissors, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  cancelOrder,
  procedureStatusColor,
  orderStatusColor,
  orderPriorityColor,
  formatDateTime,
  formatRelativeTime,

} from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"
import type { Procedure, ServiceRequest } from "@medplum/fhirtypes"
import { ProcedureOrderDialog } from "./ProcedureOrderDialog"
import { RecordProcedureDialog } from "./RecordProcedureDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  patientId:          string
  encounterId:        string
  initialOrders:      ServiceRequest[]
  initialProcedures:  Procedure[]
  patient?:           PatientInfo
}

export function ProceduresManager({ patientId, encounterId, initialOrders, initialProcedures, patient }: Props) {
  const router = useRouter()
  const [orders, setOrders]         = useState<ServiceRequest[]>(initialOrders)
  const [procedures, setProcedures] = useState<Procedure[]>(initialProcedures)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError]   = useState<string | null>(null)

  function handleSaved() {
    router.refresh()
  }

  function handleProcedureSaved(proc: Procedure) {
    setProcedures((prev) => {
      const idx = prev.findIndex((p) => p.id === proc.id)
      return idx >= 0
        ? prev.map((p) => p.id === proc.id ? proc : p)
        : [proc, ...prev]
    })
    router.refresh()
  }

  async function handleCancelOrder(id: string) {
    setCancellingId(id); setCancelError(null)
    try {
      const updated = await cancelOrder(id)
      setOrders((prev) => prev.map((o) => o.id === id ? updated : o))
      router.refresh()
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel order")
    } finally {
      setCancellingId(null)
    }
  }

  const sortedProcedures = [...procedures].sort(
    (a, b) =>
      new Date(b.performedDateTime ?? b.performedPeriod?.start ?? 0).getTime() -
      new Date(a.performedDateTime ?? a.performedPeriod?.start ?? 0).getTime()
  )

  return (
    <Card>
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scissors className="h-4 w-4 text-muted-foreground" />
          Procedures
          {(orders.length + procedures.length) > 0 && (
            <Badge variant="secondary" className="ml-1 font-mono text-xs">
              {orders.length + procedures.length}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <RecordProcedureDialog
              mode="create"
              patientId={patientId}
              encounterId={encounterId}
              onSaved={handleProcedureSaved}
              patient={patient}
            />
            <ProcedureOrderDialog
              patientId={patientId}
              encounterId={encounterId}
              onSaved={handleSaved}
              patient={patient}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-5">
        {/* ─ Ordered Procedures ─ */}
        {orders.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ordered
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Procedure</TableHead>
                  <TableHead className="w-20">Priority</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Indication</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const name       = order.code?.text ?? "—"
                  const site       = order.orderDetail?.[0]?.text?.replace("Site: ", "")
                  const priority   = order.priority ?? "routine"
                  const status     = order.status ?? "active"
                  const indication = order.reasonCode?.[0]?.text
                  const isActive   = status === "active" || status === "draft"
                  const notes      = order.note?.[0]?.text

                  return (
                    <TableRow key={order.id} className="align-top group">
                      <TableCell className="font-medium">
                        {name}
                        {site && (
                          <p className="text-xs text-muted-foreground mt-0.5">{site}</p>
                        )}
                        {notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill color={orderPriorityColor(priority)} label={priority} />
                      </TableCell>
                      <TableCell>
                        <StatusPill color={orderStatusColor(status)} label={status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {indication ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isActive && (
                            <>
                              <RecordProcedureDialog
                                mode="create"
                                patientId={patientId}
                                encounterId={encounterId}
                                orderId={order.id}
                                initialData={{
                                  procedureName: order.code?.text,
                                  bodySite: site,
                                }}
                                onSaved={handleProcedureSaved}
                                compact
                                patient={patient}
                              />
                              <button
                                onClick={() => handleCancelOrder(order.id!)}
                                disabled={cancellingId === order.id}
                                title="Cancel order"
                                className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
                              >
                                {cancellingId === order.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />
                                }
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
            {cancelError && <p className="mt-1 text-sm text-destructive">{cancelError}</p>}
          </div>
        )}

        {/* ─ Performed Procedures ─ */}
        <div>
          {orders.length > 0 && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Performed
            </p>
          )}
          {sortedProcedures.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">
              No procedures recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Procedure</TableHead>
                  <TableHead className="w-36">When</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Performed By</TableHead>
                  <TableHead>Outcome / Notes</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProcedures.map((proc) => {
                  const status    = proc.status ?? "completed"
                  const name      = proc.code?.text ?? "—"
                  const when      = proc.performedDateTime ?? proc.performedPeriod?.start
                  const endTime   = proc.performedPeriod?.end
                  const site      = proc.bodySite?.[0]?.text
                  const performer = proc.performer?.[0]?.actor?.display
                  const outcome   = proc.outcome?.text
                  const compl     = proc.complication?.[0]?.text
                  const notes     = proc.note?.[0]?.text
                  const isLinked  = !!proc.basedOn?.[0]?.reference

                  return (
                    <TableRow key={proc.id} className="align-top group">
                      <TableCell className="font-medium">
                        {name}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {site && <span className="text-xs text-muted-foreground">{site}</span>}
                          {isLinked && (
                            <span className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                              From order
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span title={formatDateTime(when)}>{formatRelativeTime(when)}</span>
                        {endTime && (
                          <p className="text-[10px]">→ {formatRelativeTime(endTime)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill color={procedureStatusColor(status)} label={
                          status === "in-progress" ? "In progress" :
                          status === "not-done"    ? "Not done"    :
                          status === "on-hold"     ? "On hold"     :
                          status
                        } />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {performer ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {outcome && <p className="font-medium text-foreground">{outcome}</p>}
                        {compl   && <p className="text-orange-700">⚠ {compl}</p>}
                        {notes   && !outcome && !compl && <p className="italic">{notes}</p>}
                        {!outcome && !compl && !notes && "—"}
                      </TableCell>
                      <TableCell>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <RecordProcedureDialog
                            mode="edit"
                            patientId={patientId}
                            encounterId={encounterId}
                            procedure={proc}
                            onSaved={handleProcedureSaved}
                            patient={patient}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {orders.length === 0 && procedures.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No procedures ordered or recorded yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
