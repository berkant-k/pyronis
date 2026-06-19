"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Stethoscope, Trash2, Loader2 } from "lucide-react"
import type { Observation } from "@medplum/fhirtypes"
import { deleteObservation, observationDisplayValue, formatDate } from "@/lib/fhir-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { NonVitalObservationDialog } from "./NonVitalObservationDialog"
import { type PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  patientId:    string
  encounterId:  string
  initialObs:   Observation[]
  patient?:     PatientInfo
}

function obsCategory(obs: Observation): string {
  const code = obs.category?.[0]?.coding?.[0]?.code ?? ""
  if (code === "exam") return "Physical Exam"
  if (code === "social-history") return "Social History"
  return code
}

function obsName(obs: Observation): string {
  return obs.code?.text ?? obs.code?.coding?.[0]?.display ?? obs.code?.coding?.[0]?.code ?? "—"
}

export function EncounterNonVitalObservationsCard({ patientId, encounterId, initialObs, patient }: Props) {
  const router = useRouter()
  const [observations, setObservations] = useState<Observation[]>(initialObs)
  const [deleting, setDeleting]         = useState<string | null>(null)

  function handleCreated(obs: Observation) {
    setObservations((prev) => [obs, ...prev])
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteObservation(id)
      setObservations((prev) => prev.filter((o) => o.id !== id))
      router.refresh()
    } catch {
      // leave state on error
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          Observations
          <Badge variant="secondary" className="ml-1 font-mono text-xs">{observations.length}</Badge>
          <div className="ml-auto">
            <NonVitalObservationDialog
              patientId={patientId}
              encounterId={encounterId}
              patient={patient}
              onSuccess={handleCreated}
            />
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-4">
        {observations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No observations recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Category</TableHead>
                <TableHead className="w-44">Type</TableHead>
                <TableHead>Finding / Value</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {observations.map((obs) => (
                <TableRow key={obs.id} className="group">
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {obsCategory(obs)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{obsName(obs)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {observationDisplayValue(obs)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(obs.effectiveDateTime ?? obs.issued)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => obs.id && handleDelete(obs.id)}
                      disabled={deleting === obs.id}
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive",
                        deleting === obs.id && "opacity-100"
                      )}
                    >
                      {deleting === obs.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
