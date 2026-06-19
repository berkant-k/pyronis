import type { Metadata } from "next"
import { FileText, AlertTriangle } from "lucide-react"
import { DiagnosticReportsSearch } from "@/components/reports/DiagnosticReportsSearch"
import { searchDiagnosticReports } from "@/lib/fhir-client"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Reports | Pyronis EMR" }

export default async function ReportsPage() {
  const result = await searchDiagnosticReports({ count: 80 }).catch(() => null)
  const initial = result ?? []
  const fetchFailed = result === null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Diagnostic Reports</h1>
          <p className="text-sm text-muted-foreground">
            Lab results, radiology, pathology, and other diagnostic reports
          </p>
        </div>
      </div>
      {fetchFailed && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Could not load data from the FHIR server. The list may be incomplete — try refreshing.
        </div>
      )}
      <DiagnosticReportsSearch initialData={initial} />
    </div>
  )
}
