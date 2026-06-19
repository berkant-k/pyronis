"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  searchReferrals, formatDate, patientDisplayName,
  referralStatusColor, referralPriorityColor,
  type ReferralWithPatient,
} from "@/lib/fhir-client"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2, SendHorizontal } from "lucide-react"
import { StatusPill } from "@/components/ui/StatusPill"

interface Props {
  initialData: ReferralWithPatient[]
}

export function ReferralsSearch({ initialData }: Props) {
  const [results, setResults]           = useState(initialData)
  const [status, setStatus]             = useState("")
  const [priority, setPriority]         = useState("")
  const [patientQuery, setPatientQuery] = useState("")
  const [loading, setLoading]           = useState(false)
  const keyRef                          = useRef(0)

  useEffect(() => {
    const key   = ++keyRef.current
    const delay = patientQuery.trim() ? 400 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchReferrals({
        status:       status   || undefined,
        priority:     priority || undefined,
        patientQuery: patientQuery.trim() || undefined,
        count:        60,
      })
        .then((r) => { if (key === keyRef.current) { setResults(r); setLoading(false) } })
        .catch(() => { if (key === keyRef.current) { setResults([]); setLoading(false) } })
    }, delay)
    return () => clearTimeout(t)
  }, [status, priority, patientQuery])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by patient name…"
          value={patientQuery}
          onChange={(e) => setPatientQuery(e.target.value)}
          className="flex-1 min-w-48"
        />
        <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="revoked">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority || "__all__"} onValueChange={(v) => setPriority(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All priorities</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="asap">ASAP</SelectItem>
            <SelectItem value="stat">STAT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <SendHorizontal className="h-10 w-10 opacity-30" />
          <p className="text-sm">No referrals found</p>
          {patientQuery && (
            <p className="text-xs">Try a different patient name or clear the search</p>
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-28">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ referral, patient }) => {
                const specialty    = referral.code?.text ?? referral.code?.coding?.[0]?.display ?? "—"
                const priority     = referral.priority ?? "routine"
                const status       = referral.status   ?? "unknown"
                const reason       = referral.reasonCode?.[0]?.text
                const subjectRef   = referral.subject?.reference
                const patientId    = subjectRef?.startsWith("Patient/") ? subjectRef.slice(8) : undefined
                const displayName  = patient
                  ? patientDisplayName(patient)
                  : (referral.subject?.display ?? "Unknown patient")

                return (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">
                      {patientId ? (
                        <Link
                          href={`/patients/${patientId}`}
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {displayName}
                        </Link>
                      ) : displayName}
                    </TableCell>
                    <TableCell>{specialty}</TableCell>
                    <TableCell>
                      <StatusPill color={referralPriorityColor(priority)} label={priority} />
                    </TableCell>
                    <TableCell>
                      <StatusPill color={referralStatusColor(status)} label={status === "revoked" ? "cancelled" : status.replace(/-/g, " ")} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(referral.authoredOn)}
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
