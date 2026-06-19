"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronRight, FlaskConical, Scan, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  searchOrders,
  getOrderCategory,
  orderStatusColor,
  orderPriorityColor,
  patientDisplayName,
  getPatientMRN,
  formatDate,
} from "@/lib/fhir-client"
import type { ServiceRequestWithPatient, OrderCategory } from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"

export function OrdersSearch() {
  const [category, setCategory]     = useState<OrderCategory | "">("")
  const [status, setStatus]         = useState("")
  const [patientQuery, setPatientQuery] = useState("")
  const [results, setResults]       = useState<ServiceRequestWithPatient[]>([])
  const [loading, setLoading]       = useState(true)
  const keyRef = useRef(0)

  useEffect(() => {
    const key = ++keyRef.current
    const delay = patientQuery.trim() ? 400 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchOrders({
        category:     category || undefined,
        status:       status || undefined,
        patientQuery: patientQuery.trim() || undefined,
        count:        60,
      })
        .then((r) => { if (key === keyRef.current) { setResults(r); setLoading(false) } })
        .catch(() => { if (key === keyRef.current) { setResults([]); setLoading(false) } })
    }, delay)
    return () => clearTimeout(t)
  }, [category, status, patientQuery])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            placeholder="Search by patient name or MRN…"
            className="pl-9"
          />
        </div>

        <Select value={category} onValueChange={(v) => setCategory((v ?? "") as typeof category)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
            <SelectItem value="rad">Radiology</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="revoked">Cancelled</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading orders…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No orders found
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Test / Study</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Ordered</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ order, patient }) => {
                const cat      = getOrderCategory(order)
                const status   = order.status ?? "unknown"
                const priority = order.priority ?? "routine"
                const mrn      = patient ? getPatientMRN(patient) : null
                const encRef   = order.encounter?.reference
                const encId    = encRef?.startsWith("Encounter/") ? encRef.slice(10) : undefined
                const patId    = order.subject?.reference?.startsWith("Patient/")
                  ? order.subject.reference.slice(8) : undefined
                const href = encId ? `/encounters/${encId}` : patId ? `/patients/${patId}` : undefined

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
                      {order.code?.text ?? order.code?.coding?.[0]?.display ?? "—"}
                      {order.orderDetail && order.orderDetail.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {order.orderDetail.map((d) => d.text).filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient ? (
                        <div className="text-sm">
                          <span className="font-medium">{patientDisplayName(patient)}</span>
                          {mrn && (
                            <span className="ml-2 font-mono text-[11px] text-primary">MR-{mrn}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
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
                      {href && (
                        <Link href={href} className="text-muted-foreground/40 group-hover:text-primary transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
