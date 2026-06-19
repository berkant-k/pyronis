"use client"

import { useState } from "react"
import { ListTodo, Pencil, CheckCircle2, Loader2 } from "lucide-react"
import type { Task } from "@medplum/fhirtypes"
import {
  updateTask,
  parseTask,
  formatDate,
  TASK_CATEGORY_DISPLAY,
  TASK_STATUS_DISPLAY,
  TASK_PRIORITY_DISPLAY,
  taskStatusColor,
  taskPriorityColor,
} from "@/lib/fhir-client"
import { Card } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TaskFormDialog } from "./TaskFormDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import type { PatientInfo } from "@/components/ui/PatientBanner"

const OPEN_STATUSES = new Set(["requested", "in-progress", "on-hold"])

interface Props {
  initialTasks: Task[]
  patientId:    string
  patientName?: string
  patient?:     PatientInfo
}

export function PatientTasksTab({ initialTasks, patientId, patientName, patient }: Props) {
  const [tasks, setTasks]         = useState<Task[]>(initialTasks)
  const [dialogOpen, setDialog]   = useState(false)
  const [editTarget, setEdit]     = useState<Task | undefined>(undefined)
  const [completing, setCompleting] = useState<string | null>(null)

  function handleSuccess(saved: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  function openNew()           { setEdit(undefined); setDialog(true) }
  function openEdit(t: Task)   { setEdit(t);          setDialog(true) }

  async function markDone(t: Task) {
    setCompleting(t.id!)
    try {
      const input = parseTask(t)
      const saved = await updateTask(t.id!, { ...input, status: "completed" })
      handleSuccess(saved)
    } finally {
      setCompleting(null)
    }
  }

  const openTasks  = tasks.filter((t) => OPEN_STATUSES.has(t.status ?? ""))
  const closedTasks = tasks.filter((t) => !OPEN_STATUSES.has(t.status ?? ""))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openNew}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <ListTodo className="h-3.5 w-3.5" />
          Add Task
        </button>
      </div>

      {!tasks.length ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No tasks recorded
        </div>
      ) : (
        <div className="space-y-4">
          {openTasks.length > 0 && (
            <TaskSection
              heading="Open Tasks"
              tasks={openTasks}
              completing={completing}
              onEdit={openEdit}
              onComplete={markDone}
              showComplete
            />
          )}
          {closedTasks.length > 0 && (
            <TaskSection
              heading="Completed / Cancelled"
              tasks={closedTasks}
              completing={completing}
              onEdit={openEdit}
              onComplete={markDone}
            />
          )}
        </div>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialog}
        patientId={patientId}
        patientName={patientName}
        task={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </div>
  )
}

function TaskSection({
  heading, tasks, completing, onEdit, onComplete, showComplete,
}: {
  heading:      string
  tasks:        Task[]
  completing:   string | null
  onEdit:       (t: Task) => void
  onComplete:   (t: Task) => void
  showComplete?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">{heading}</p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead className="w-32">Category</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Due</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => {
              const parsed   = parseTask(t)
              const catLabel = TASK_CATEGORY_DISPLAY[parsed.category] ?? parsed.category
              const priLabel = TASK_PRIORITY_DISPLAY[parsed.priority] ?? parsed.priority
              const stLabel  = TASK_STATUS_DISPLAY[parsed.status]   ?? parsed.status
              const priCls   = taskPriorityColor(parsed.priority)
              const stCls    = taskStatusColor(parsed.status)
              const isOverdue = parsed.dueDate && parsed.status !== "completed" && parsed.status !== "cancelled"
                && parsed.dueDate < new Date().toISOString().slice(0, 10)

              return (
                <TableRow key={t.id} className="group">
                  <TableCell>
                    <StatusPill color={priCls} label={priLabel} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{catLabel}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{parsed.title}</div>
                    {parsed.note && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{parsed.note}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill color={stCls} label={stLabel} />
                  </TableCell>
                  <TableCell className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                    {parsed.dueDate ? formatDate(parsed.dueDate) : "—"}
                    {isOverdue && <span className="ml-1 text-xs">Overdue</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {parsed.assignee || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {showComplete && (
                        <button
                          type="button"
                          onClick={() => onComplete(t)}
                          disabled={completing === t.id}
                          className="text-muted-foreground/50 hover:text-green-600 transition-colors"
                          title="Mark complete"
                        >
                          {completing === t.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        className="text-muted-foreground/40 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
