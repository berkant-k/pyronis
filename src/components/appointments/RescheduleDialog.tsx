"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { rescheduleAppointment } from "@/lib/fhir-client"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
]

function toDateTimeLocal(iso?: string): string {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 16)
}

interface RescheduleDialogProps {
  appointmentId: string
  currentStart?: string
  currentDurationMinutes?: number
  patient?: PatientInfo
}

export function RescheduleDialog({ appointmentId, currentStart, currentDurationMinutes, patient }: RescheduleDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(toDateTimeLocal(currentStart))
  const [duration, setDuration] = useState(String(currentDurationMinutes ?? 30))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setStart(toDateTimeLocal(currentStart))
    setDuration(String(currentDurationMinutes ?? 30))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!start) { setError("Please select a new date and time."); return }
    setLoading(true)
    setError(null)
    try {
      await rescheduleAppointment(appointmentId, start, parseInt(duration, 10))
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
        <CalendarClock className="h-4 w-4" />
        Reschedule
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>Choose a new date, time, and duration.</DialogDescription>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resched-start">
              New date & time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="resched-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resched-duration">Duration</Label>
            <Select value={duration} onValueChange={(v) => setDuration(v ?? "30")}>
              <SelectTrigger id="resched-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
