import type { Metadata } from "next"
import { Activity, AlertTriangle } from "lucide-react"
import { ObservationsSearch } from "@/components/observations/ObservationsSearch"
import { searchObservations } from "@/lib/fhir-client"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Observations | Pyronis EMR" }

export default async function ObservationsPage() {
  const result = await searchObservations({ category: "vital-signs", count: 60 }).catch(() => null)
  const initial = result ?? []
  const fetchFailed = result === null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Observations</h1>
          <p className="text-sm text-muted-foreground">Vital signs and clinical observations across all patients</p>
        </div>
      </div>
      {fetchFailed && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Could not load data from the FHIR server. The list may be incomplete — try refreshing.
        </div>
      )}
      <ObservationsSearch initialData={initial} />
    </div>
  )
}
