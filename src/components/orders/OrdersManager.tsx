"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Scan, Trash2, Loader2 } from "lucide-react"
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
import {
  cancelOrder,
  getOrderCategory,
  orderStatusColor,
  orderPriorityColor,
  formatDate,
} from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"
import type { ServiceRequest } from "@medplum/fhirtypes"
import { LabOrderDialog } from "./LabOrderDialog"
import { RadOrderDialog } from "./RadOrderDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface OrdersManagerProps {
  patientId:     string
  encounterId?:  string
  initialOrders: ServiceRequest[]
  patient?:      PatientInfo
}

export function OrdersManager({ patientId, encounterId, initialOrders, patient }: OrdersManagerProps) {
  const router = useRouter()
  const [orders, setOrders]         = useState<ServiceRequest[]>(initialOrders)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError]   = useState<string | null>(null)

  async function handleCancel(id: string) {
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

  return (
    <Card>
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          Orders
          <Badge variant="secondary" className="ml-1 font-mono text-xs">{orders.length}</Badge>
          <div className="ml-auto flex items-center gap-2">
            <LabOrderDialog patientId={patientId} encounterId={encounterId} patient={patient} />
            <RadOrderDialog patientId={patientId} encounterId={encounterId} patient={patient} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No orders placed yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Test / Study</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Ordered</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const cat      = getOrderCategory(order)
                const status   = order.status ?? "unknown"
                const priority = order.priority ?? "routine"
                const canCancel = ["active", "draft", "on-hold"].includes(status)
                return (
                  <TableRow key={order.id} className="group">
                    <TableCell>
                      {cat === "lab" ? (
                        <FlaskConical className="h-4 w-4 text-purple-500" />
                      ) : cat === "rad" ? (
                        <Scan className="h-4 w-4 text-blue-500" />
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span>{order.code?.text ?? order.code?.coding?.[0]?.display ?? "—"}</span>
                      {order.orderDetail && order.orderDetail.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {order.orderDetail.map((d) => d.text).filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {order.reasonCode?.[0]?.text && (
                        <p className="text-xs text-muted-foreground mt-0.5">{order.reasonCode[0].text}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill color={orderPriorityColor(priority)} label={priority} />
                    </TableCell>
                    <TableCell>
                      <StatusPill color={orderStatusColor(status)} label={status === "revoked" ? "cancelled" : status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(order.authoredOn)}
                    </TableCell>
                    <TableCell>
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(order.id!)}
                          disabled={cancellingId === order.id}
                          title="Cancel order"
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
                        >
                          {cancellingId === order.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {cancelError && (
          <p className="mt-2 text-sm text-destructive">{cancelError}</p>
        )}
      </CardContent>
    </Card>
  )
}
