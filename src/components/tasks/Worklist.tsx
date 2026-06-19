"use client"

import { useState, useMemo } from "react"
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
import Link from "next/link"
import { TaskFormDialog } from "./TaskFormDialog"
import { StatusPill } from "@/components/ui/StatusPill"

type StatusFilter = "all" | "open" | "in-progress" | "on-hold" | "completed" | "cancelled"
type PriorityFilter = "all" | "stat" | "asap" | "urgent" | "routine"

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "open",       label: "Open" },
  { key: "in-progress",label: "In Progress" },
  { key: "on-hold",    label: "On Hold" },
  { key: "completed",  label: "Completed" },
  { key: "cancelled",  label: "Cancelled" },
]

const PRIORITY_FILTERS: { key: PriorityFilter; label: string }[] = [
  { key: "all",     label: "All priorities" },
  { key: "stat",    label: "STAT" },
  { key: "asap",    label: "ASAP" },
  { key: "urgent",  label: "Urgent" },
  { key: "routine", label: "Routine" },
]

interface Props {
  initialTasks: Task[]
}

export function Worklist({ initialTasks }: Props) {
  const [tasks, setTasks]           = useState<Task[]>(initialTasks)
  const [statusFilter, setStatus]   = useState<StatusFilter>("open")
  const [priorityFilter, setPriority] = useState<PriorityFilter>("all")
  const [dialogOpen, setDialog]     = useState(false)
  const [editTarget, setEdit]       = useState<Task | undefined>(undefined)
  const [completing, setCompleting] = useState<string | null>(null)

  function handleSuccess(saved: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  function openNew()         { setEdit(undefined); setDialog(true) }
  function openEdit(t: Task) { setEdit(t);          setDialog(true) }

  async function markDone(t: Task) {
    setCompleting(t.id!)
    try {
      const saved = await updateTask(t.id!, { ...parseTask(t), status: "completed" })
      handleSuccess(saved)
    } finally {
      setCompleting(null)
    }
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const status   = t.status ?? "requested"
      const priority = t.priority ?? "routine"
      const matchStatus =
        statusFilter === "all"       ? true :
        statusFilter === "open"      ? status === "requested" :
        status === statusFilter
      const matchPriority = priorityFilter === "all" || priority === priorityFilter
      return matchStatus && matchPriority
    })
  }, [tasks, statusFilter, priorityFilter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length }
    for (const t of tasks) {
      const s = t.status ?? "requested"
      const key = s === "requested" ? "open" : s
      c[key] = (c[key] ?? 0) + 1
    }
    return c
  }, [tasks])

  const isOverdue = (t: Task) => {
    const p = parseTask(t)
    return p.dueDate
      && t.status !== "completed"
      && t.status !== "cancelled"
      && p.dueDate < new Date().toISOString().slice(0, 10)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {label}
              {counts[key] !== undefined && (
                <span className="ml-1.5 opacity-60">{counts[key]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriority(e.target.value as PriorityFilter)}
            className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PRIORITY_FILTERS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={openNew}
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <ListTodo className="h-3.5 w-3.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Table */}
      {!filtered.length ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          {tasks.length === 0 ? "No tasks yet" : "No tasks match the current filter"}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Priority</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28">Due</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const parsed   = parseTask(t)
                const catLabel = TASK_CATEGORY_DISPLAY[parsed.category] ?? parsed.category
                const priLabel = TASK_PRIORITY_DISPLAY[parsed.priority] ?? parsed.priority
                const stLabel  = TASK_STATUS_DISPLAY[parsed.status]   ?? parsed.status
                const priCls   = taskPriorityColor(parsed.priority)
                const stCls    = taskStatusColor(parsed.status)
                const overdue  = isOverdue(t)
                const isDone   = t.status === "completed" || t.status === "cancelled"

                return (
                  <TableRow key={t.id} className={cn("group", isDone && "opacity-60")}>
                    <TableCell>
                      <StatusPill color={priCls} label={priLabel} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{catLabel}</TableCell>
                    <TableCell>
                      <div className={cn("font-medium text-sm", isDone && "line-through")}>{parsed.title}</div>
                      {parsed.note && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{parsed.note}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {parsed.patientId ? (
                        <Link
                          href={`/patients/${parsed.patientId}`}
                          className="text-primary hover:underline"
                        >
                          {parsed.patientName ?? `Patient/${parsed.patientId}`}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill color={stCls} label={stLabel} />
                    </TableCell>
                    <TableCell className={cn("text-sm", overdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
                      {parsed.dueDate ? formatDate(parsed.dueDate) : "—"}
                      {overdue && <span className="ml-1 text-xs">Overdue</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {parsed.assignee || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => markDone(t)}
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
                          onClick={() => openEdit(t)}
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
      )}

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialog}
        task={editTarget}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
