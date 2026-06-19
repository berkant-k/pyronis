"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Syringe, Search, Loader2, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  searchImmunizations, patientDisplayName, getPatientMRN, formatDate, immunizationStatusColor,
} from "@/lib/fhir-client"
import type { ImmunizationWithPatient } from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"

interface Props {
  initialData: ImmunizationWithPatient[]
}

export function ImmunizationsSearch({ initialData }: Props) {
  const [status, setStatus]             = useState("")
  const [patientQuery, setPatientQuery] = useState("")
  const [results, setResults]           = useState<ImmunizationWithPatient[]>(initialData)
  const [loading, setLoading]           = useState(false)
  const keyRef = useRef(0)

  useEffect(() => {
    const key = ++keyRef.current
    const delay = patientQuery.trim() ? 400 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchImmunizations({
        status:       status || undefined,
        patientQuery: patientQuery.trim() || undefined,
        count:        60,
      })
        .then((r) => { if (key === keyRef.current) { setResults(r); setLoading(false) } })
        .catch(() => { if (key === keyRef.current) { setResults([]); setLoading(false) } })
    }, delay)
    return () => clearTimeout(t)
  }, [status, patientQuery])

  return (
    <div className="space-y-4">
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

        <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="completed">Given</SelectItem>
            <SelectItem value="not-done">Not Given</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading immunizations…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Syringe className="h-8 w-8 opacity-30" />
          <span className="text-sm">No immunizations found</span>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaccine</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-20">Route</TableHead>
                <TableHead className="w-16">Dose #</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ immunization: imm, patient }) => {
                const mrn       = patient ? getPatientMRN(patient) : null
                const patId     = imm.patient?.reference?.startsWith("Patient/")
                  ? imm.patient.reference.slice(8) : undefined
                const encRef    = imm.encounter?.reference
                const encId     = encRef?.startsWith("Encounter/") ? encRef.slice(10) : undefined
                const href      = encId ? `/encounters/${encId}` : patId ? `/patients/${patId}` : undefined
                const statusCls = immunizationStatusColor(imm.status ?? "")
                const vaccine   = imm.vaccineCode?.text ?? imm.vaccineCode?.coding?.[0]?.display ?? "—"
                const dose      = imm.protocolApplied?.[0]?.doseNumberPositiveInt

                return (
                  <TableRow key={imm.id} className="group">
                    <TableCell className="font-medium">{vaccine}</TableCell>
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
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(imm.occurrenceDateTime)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {imm.route?.text ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {dose ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusPill color={statusCls} label={imm.status === "not-done" ? "Not Given" : "Given"} />
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
