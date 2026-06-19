import type { Metadata } from "next"
import { Syringe, AlertTriangle } from "lucide-react"
import { ImmunizationsSearch } from "@/components/immunizations/ImmunizationsSearch"
import { searchImmunizations } from "@/lib/fhir-client"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Immunizations | Pyronis EMR" }

export default async function ImmunizationsPage() {
  const result = await searchImmunizations({ count: 60 }).catch(() => null)
  const initial = result ?? []
  const fetchFailed = result === null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Syringe className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Immunizations</h1>
          <p className="text-sm text-muted-foreground">Vaccination records across all patients</p>
        </div>
      </div>
      {fetchFailed && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Could not load data from the FHIR server. The list may be incomplete — try refreshing.
        </div>
      )}
      <ImmunizationsSearch initialData={initial} />
    </div>
  )
}
