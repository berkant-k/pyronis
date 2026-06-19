"use client"

import { useState, useLayoutEffect } from "react"
import { Loader2, ListTodo } from "lucide-react"
import type { Task } from "@medplum/fhirtypes"
import {
  createTask,
  updateTask,
  parseTask,
  TASK_CATEGORY_DISPLAY,
  TASK_STATUS_DISPLAY,
  TASK_PRIORITY_DISPLAY,
  type TaskFormInput,
} from "@/lib/fhir-client"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

interface FormState {
  category:  string
  title:     string
  note:      string
  priority:  TaskFormInput["priority"]
  status:    TaskFormInput["status"]
  dueDate:   string
  assignee:  string
}

const DEFAULT: FormState = {
  category: "general",
  title:    "",
  note:     "",
  priority: "routine",
  status:   "requested",
  dueDate:  "",
  assignee: "",
}

function fromResource(t: Task): FormState {
  const p = parseTask(t)
  return {
    category: p.category,
    title:    p.title,
    note:     p.note     ?? "",
    priority: p.priority,
    status:   p.status,
    dueDate:  p.dueDate  ?? "",
    assignee: p.assignee ?? "",
  }
}

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  patientId?:   string
  patientName?: string
  task?:        Task
  onSuccess:    (saved: Task) => void
  patient?:     PatientInfo
}

export function TaskFormDialog({
  open, onOpenChange, patientId, patientName, task, onSuccess, patient,
}: Props) {
  const [form, setForm]     = useState<FormState>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const isEdit = !!task

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return
    setError(null)
    setForm(task ? fromResource(task) : DEFAULT)
  }, [open, task])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError("Title is required"); return }
    setSaving(true); setError(null)
    try {
      const input: TaskFormInput = {
        patientId,
        patientName,
        category:  form.category,
        title:     form.title.trim(),
        note:      form.note.trim()     || undefined,
        priority:  form.priority,
        status:    form.status,
        dueDate:   form.dueDate         || undefined,
        assignee:  form.assignee.trim() || undefined,
      }
      const saved = isEdit
        ? await updateTask(task!.id!, input)
        : await createTask(input)
      onSuccess(saved)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            {isEdit ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form id="task-form" onSubmit={handleSubmit} className="space-y-4">

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v ?? "general")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_CATEGORY_DISPLAY).map(([code, label]) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="What needs to be done?"
              autoComplete="off"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", (v ?? "routine") as FormState["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY_DISPLAY).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", (v ?? "requested") as FormState["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_DISPLAY).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Assigned To</Label>
              <Input
                id="task-assignee"
                value={form.assignee}
                onChange={(e) => set("assignee", e.target.value)}
                placeholder="Clinician name"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="task-note">Notes</Label>
            <Textarea
              id="task-note"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Additional context or instructions…"
              rows={3}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </form>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)}
            className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </button>
          <button type="submit" form="task-form" disabled={saving || !form.title.trim()}
            className={cn(buttonVariants(), "gap-2")}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Create task"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
