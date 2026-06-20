"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Flag, Search, Loader2, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  searchFlags, patientDisplayName, getPatientMRN,
  flagCategoryColor, flagStatusColor, FLAG_CATEGORY_DISPLAY,
  parseFhirId,
} from "@/lib/fhir-client"
import type { FlagWithPatient } from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"

interface Props {
  initialData: FlagWithPatient[]
}

export function FlagsSearch({ initialData }: Props) {
  const [status, setStatus]             = useState("active")
  const [patientQuery, setPatientQuery] = useState("")
  const [results, setResults]           = useState<FlagWithPatient[]>(initialData)
  const [loading, setLoading]           = useState(false)
  const keyRef = useRef(0)

  useEffect(() => {
    const key = ++keyRef.current
    const delay = patientQuery.trim() ? 400 : 0
    const t = setTimeout(() => {
      setLoading(true)
      searchFlags({
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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading flags…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Flag className="h-8 w-8 opacity-30" />
          <span className="text-sm">No flags found</span>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">From</TableHead>
                <TableHead className="w-28">To</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(({ flag: f, patient }) => {
                const mrn      = patient ? getPatientMRN(patient) : null
                const patId    = parseFhirId(f.subject?.reference, "Patient")
                const href     = patId ? `/patients/${patId}` : undefined
                const cat      = f.category?.[0]?.coding?.[0]?.code ?? ""
                const catLabel = FLAG_CATEGORY_DISPLAY[cat] ?? f.category?.[0]?.text
                const catCls   = flagCategoryColor(cat)
                const stsCls   = flagStatusColor(f.status ?? "")

                return (
                  <TableRow key={f.id} className="group">
                    <TableCell className="font-medium">
                      {f.code?.text ?? f.code?.coding?.[0]?.display ?? "—"}
                    </TableCell>
                    <TableCell>
                      {cat ? (
                        <StatusPill color={catCls} label={catLabel ?? ""} />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
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
                      <StatusPill color={stsCls} label={f.status ?? ""} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {f.period?.start ? new Date(f.period.start).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {f.period?.end ? new Date(f.period.end).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
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
