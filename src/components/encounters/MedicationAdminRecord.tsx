"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  cancelInpatientRx,
  parseInpatientRx,
  rxStatusColor,
  adminStatusColor,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"
import type { MedicationAdministration, MedicationRequest } from "@medplum/fhirtypes"
import { MedicationOrderDialog } from "./MedicationOrderDialog"
import { RecordAdminDialog } from "./RecordAdminDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  patientId:      string
  encounterId:    string
  initialOrders:  MedicationRequest[]
  initialAdmins:  MedicationAdministration[]
  patient?:       PatientInfo
}

export function MedicationAdminRecord({ patientId, encounterId, initialOrders, initialAdmins, patient }: Props) {
  const router = useRouter()
  const [orders, setOrders]           = useState<MedicationRequest[]>(initialOrders)
  const [admins, setAdmins]           = useState<MedicationAdministration[]>(initialAdmins)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  function handleSaved() {
    router.refresh()
  }

  function handleAdminSaved(admin: MedicationAdministration) {
    setAdmins((prev) => [admin, ...prev])
    router.refresh()
  }

  async function handleCancelOrder(id: string) {
    setCancellingId(id); setCancelError(null)
    try {
      const updated = await cancelInpatientRx(id)
      setOrders((prev) => prev.map((o) => o.id === id ? updated : o))
      router.refresh()
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel order")
    } finally {
      setCancellingId(null)
    }
  }

  // Pre-compute per-order admin summary
  function orderAdmins(orderId: string) {
    return admins.filter((a) => a.request?.reference === `MedicationRequest/${orderId}`)
  }

  function lastGiven(orderId: string): MedicationAdministration | undefined {
    return orderAdmins(orderId)
      .filter((a) => a.status === "completed")
      .sort((a, b) => new Date(b.effectiveDateTime ?? 0).getTime() - new Date(a.effectiveDateTime ?? 0).getTime())[0]
  }

  const sortedHistory = [...admins].sort(
    (a, b) => new Date(b.effectiveDateTime ?? 0).getTime() - new Date(a.effectiveDateTime ?? 0).getTime()
  )

  return (
    <Card>
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Medication Administration Record
          <Badge variant="secondary" className="ml-1 font-mono text-xs">{orders.length}</Badge>
          <div className="ml-auto">
            <MedicationOrderDialog
              patientId={patientId}
              encounterId={encounterId}
              onSaved={handleSaved}
              patient={patient}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No medications ordered for administration yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead className="w-28">Dose / Route</TableHead>
                <TableHead className="w-24">Frequency</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-28">Last Given</TableHead>
                <TableHead className="w-14 text-center">Given</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const parsed   = parseInpatientRx(order)
                const status   = order.status ?? "active"
                const isActive = status === "active" || status === "draft"
                const last     = lastGiven(order.id!)
                const count    = orderAdmins(order.id!).filter((a) => a.status === "completed").length

                return (
                  <TableRow key={order.id} className="align-middle group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {order.medicationCodeableConcept?.text ?? parsed.drugName}
                        {parsed.prn && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            PRN
                          </span>
                        )}
                      </div>
                      {parsed.indication && (
                        <p className="text-xs text-muted-foreground mt-0.5">{parsed.indication}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[parsed.dose, parsed.route].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {parsed.prn ? "PRN" : (parsed.frequency ?? "—")}
                    </TableCell>
                    <TableCell>
                      <StatusPill color={rxStatusColor(status)} label={status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {last
                        ? <span title={formatDateTime(last.effectiveDateTime)} className="text-green-700">{formatRelativeTime(last.effectiveDateTime)}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm text-muted-foreground">
                      {count > 0 ? `${count}×` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isActive && (
                          <>
                            <RecordAdminDialog
                              order={order}
                              patientId={patientId}
                              encounterId={encounterId}
                              onSaved={handleAdminSaved}
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
        )}

        {cancelError && <p className="mt-2 text-sm text-destructive">{cancelError}</p>}

        {/* Administration History */}
        {admins.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Administration History
              <Badge variant="secondary" className="ml-1 font-mono text-xs">{admins.length}</Badge>
            </button>

            {showHistory && (
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Time</TableHead>
                    <TableHead>Drug</TableHead>
                    <TableHead className="w-28">Dose / Route</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHistory.slice(0, 30).map((admin) => {
                    const status       = admin.status ?? "completed"
                    const drug         = admin.medicationCodeableConcept?.text ?? "—"
                    const dose         = admin.dosage?.text
                    const notDoneReason = (admin as { statusReason?: { text?: string }[] }).statusReason?.[0]?.text
                    const notes        = admin.note?.[0]?.text
                    return (
                      <TableRow key={admin.id} className="align-top">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(admin.effectiveDateTime)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{drug}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{dose ?? "—"}</TableCell>
                        <TableCell>
                          <StatusPill color={adminStatusColor(status)} label={status === "completed" ? "Given" : status === "not-done" ? "Not Given" : status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {notDoneReason ?? notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
