import type { Metadata } from "next"
import { Flag, AlertTriangle } from "lucide-react"
import { FlagsSearch } from "@/components/flags/FlagsSearch"
import { searchFlags } from "@/lib/fhir-client"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Flags | Pyronis EMR" }

export default async function FlagsPage() {
  const result = await searchFlags({ status: "active", count: 60 }).catch(() => null)
  const initial = result ?? []
  const fetchFailed = result === null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Patient Flags</h1>
          <p className="text-sm text-muted-foreground">Clinical warnings and safety alerts across all patients</p>
        </div>
      </div>
      {fetchFailed && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Could not load data from the FHIR server. The list may be incomplete — try refreshing.
        </div>
      )}
      <FlagsSearch initialData={initial} />
    </div>
  )
}
