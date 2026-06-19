import type { Metadata } from "next"
import { ListTodo, AlertTriangle } from "lucide-react"
import { searchTasks } from "@/lib/fhir-client"
import { Worklist } from "@/components/tasks/Worklist"

export const dynamic  = "force-dynamic"
export const metadata: Metadata = { title: "Worklist | Pyronis EMR" }

export default async function TasksPage() {
  const result = await searchTasks().catch(() => null)
  const tasks = result ?? []
  const fetchFailed = result === null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <ListTodo className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Worklist</h1>
          <p className="text-sm text-muted-foreground">
            Clinical action items across all patients
          </p>
        </div>
      </div>
      {fetchFailed && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Could not load tasks from the FHIR server. The worklist may be incomplete — try refreshing.
        </div>
      )}
      <Worklist initialTasks={tasks} />
    </div>
  )
}
