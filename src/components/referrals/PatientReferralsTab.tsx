"use client"

import { useState } from "react"
import type { ServiceRequest, Encounter } from "@medplum/fhirtypes"
import {
  formatDate, referralStatusColor, referralPriorityColor, updateReferralStatus,
} from "@/lib/fhir-client"
import { Card } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select"
import { CreateReferralDialog } from "./CreateReferralDialog"
import { EditReferralDialog } from "./EditReferralDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"
import { StatusPill } from "@/components/ui/StatusPill"

interface Props {
  initialReferrals: ServiceRequest[]
  patientId:        string
  encounters?:      Encounter[]
  patient?:         PatientInfo
}

export function PatientReferralsTab({ initialReferrals, patientId, encounters = [], patient }: Props) {
  const [referrals, setReferrals] = useState(initialReferrals)
  const [updating, setUpdating]   = useState<string | null>(null)

  function handleCreated(r: ServiceRequest) {
    setReferrals((prev) => [r, ...prev])
  }

  function handleUpdated(r: ServiceRequest) {
    setReferrals((prev) => prev.map((x) => (x.id === r.id ? r : x)))
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdating(id)
    try {
      const updated = await updateReferralStatus(id, status)
      setReferrals((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch {
      // leave existing state on error
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <CreateReferralDialog
          patientId={patientId}
          encounters={encounters}
          onSuccess={handleCreated}
          patient={patient}
        />
      </div>

      {!referrals.length ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No referrals found
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Specialty</TableHead>
                <TableHead className="w-28">Priority</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((r) => {
                const specialty = r.code?.text ?? r.code?.coding?.[0]?.display ?? "—"
                const priority  = r.priority ?? "routine"
                const status    = r.status   ?? "unknown"
                const reason    = r.reasonCode?.[0]?.text
                return (
                  <TableRow key={r.id} className="group">
                    <TableCell className="font-medium">{specialty}</TableCell>
                    <TableCell>
                      <StatusPill color={referralPriorityColor(priority)} label={priority} />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={status}
                        onValueChange={(v) => r.id && handleStatusChange(r.id, v ?? status)}
                        disabled={updating === r.id}
                      >
                        <SelectTrigger className="h-auto w-auto border-0 p-0 shadow-none [&>svg]:hidden focus:ring-0">
                          <StatusPill color={referralStatusColor(status)} label={status === "revoked" ? "cancelled" : status.replace(/-/g, " ")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="revoked">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(r.authoredOn)}
                    </TableCell>
                    <TableCell>
                      <EditReferralDialog referral={r} onUpdated={handleUpdated} patient={patient} />
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
