"use client"

import { useState } from "react"
import { SendHorizontal } from "lucide-react"
import type { ServiceRequest } from "@medplum/fhirtypes"
import {
  formatDate, referralStatusColor, referralPriorityColor, updateReferralStatus,
} from "@/lib/fhir-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  patientId:        string
  encounterId:      string
  initialReferrals: ServiceRequest[]
  patient?:         PatientInfo
}

export function EncounterReferralsCard({ patientId, encounterId, initialReferrals, patient }: Props) {
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
    <Card>
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SendHorizontal className="h-4 w-4 text-muted-foreground" />
          Referrals
          <Badge variant="secondary" className="ml-auto font-mono text-xs">
            {referrals.length}
          </Badge>
          <CreateReferralDialog
            patientId={patientId}
            defaultEncounterId={encounterId}
            onSuccess={handleCreated}
            patient={patient}
          />
        </CardTitle>
      </CardHeader>

      {referrals.length > 0 ? (
        <CardContent className="pb-2">
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
        </CardContent>
      ) : (
        <CardContent className="pb-5">
          <p className="text-sm text-muted-foreground text-center py-4">
            No referrals for this encounter
          </p>
        </CardContent>
      )}
    </Card>
  )
}
