"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchAppointments, patientDisplayName } from "@/lib/fhir-client"
import type { AppointmentWithPatient } from "@/lib/fhir-client"

// ─── Constants ────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day"

const HOUR_HEIGHT = 56    // px per hour
const START_HOUR = 6      // 6 AM
const END_HOUR = 21       // 9 PM
const TOTAL_HOURS = END_HOUR - START_HOUR
const TOTAL_PX = TOTAL_HOURS * HOUR_HEIGHT

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_LONG  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
const MONTHS    = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"]

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function sunOfWeek(d: Date): Date {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

function getMonthGrid(d: Date): Date[] {
  const y = d.getFullYear(), m = d.getMonth()
  const first = new Date(y, m, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(y, m+1, 0).getDate()
  const grid: Date[] = []
  for (let i = startDay-1; i >= 0; i--) grid.push(new Date(y, m, -i))
  for (let i = 1; i <= daysInMonth; i++) grid.push(new Date(y, m, i))
  let next = 1
  while (grid.length < 42) grid.push(new Date(y, m+1, next++))
  return grid
}

function getWeekDays(d: Date): Date[] {
  const sun = sunOfWeek(d)
  return Array.from({length:7}, (_,i) => addDays(sun, i))
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM"
  if (h < 12) return `${h} AM`
  if (h === 12) return "12 PM"
  return `${h-12} PM`
}
function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {hour:"numeric", minute:"2-digit", hour12:true})
}

// ─── Appointment helpers ───────────────────────────────────────────────────────

function groupByDay(appts: AppointmentWithPatient[]): Map<string, AppointmentWithPatient[]> {
  const map = new Map<string, AppointmentWithPatient[]>()
  for (const a of appts) {
    if (!a.appointment.start) continue
    const key = a.appointment.start.slice(0, 10)
    const arr = map.get(key) ?? []; arr.push(a); map.set(key, arr)
  }
  return map
}

function blockPos(a: AppointmentWithPatient): { top: number; height: number } {
  const start = a.appointment.start ? new Date(a.appointment.start) : new Date()
  const end   = a.appointment.end
    ? new Date(a.appointment.end)
    : new Date(start.getTime() + (a.appointment.minutesDuration ?? 30) * 60_000)
  const sMin = start.getHours()*60 + start.getMinutes()
  const eMin = end.getHours()*60 + end.getMinutes()
  return {
    top:    Math.max(0, sMin - START_HOUR*60) * (HOUR_HEIGHT/60),
    height: Math.max(22, (eMin - sMin) * (HOUR_HEIGHT/60)),
  }
}

function apptName(a: AppointmentWithPatient): string {
  if (a.patient) return patientDisplayName(a.patient)
  return a.appointment.appointmentType?.text
    ?? a.appointment.appointmentType?.coding?.[0]?.display
    ?? "Appointment"
}

function chipCls(status: string): string {
  const m: Record<string,string> = {
    booked:         "bg-blue-100 border-blue-300 text-blue-800",
    pending:        "bg-amber-100 border-amber-300 text-amber-800",
    proposed:       "bg-slate-100 border-slate-300 text-slate-700",
    arrived:        "bg-indigo-100 border-indigo-300 text-indigo-800",
    fulfilled:      "bg-green-100 border-green-300 text-green-800",
    cancelled:      "bg-red-50 border-red-200 text-red-400",
    noshow:         "bg-orange-100 border-orange-300 text-orange-800",
    "checked-in":   "bg-teal-100 border-teal-300 text-teal-800",
    waitlist:       "bg-purple-100 border-purple-300 text-purple-800",
  }
  return m[status] ?? "bg-gray-100 border-gray-300 text-gray-700"
}

function blockCls(status: string): string {
  const m: Record<string,string> = {
    booked:         "bg-blue-500 border-blue-600 text-white",
    pending:        "bg-amber-400 border-amber-500 text-white",
    proposed:       "bg-slate-400 border-slate-500 text-white",
    arrived:        "bg-indigo-500 border-indigo-600 text-white",
    fulfilled:      "bg-green-500 border-green-600 text-white",
    cancelled:      "bg-red-300 border-red-400 text-white opacity-50",
    noshow:         "bg-orange-400 border-orange-500 text-white",
    "checked-in":   "bg-teal-500 border-teal-600 text-white",
    waitlist:       "bg-purple-400 border-purple-500 text-white",
  }
  return m[status] ?? "bg-gray-400 border-gray-500 text-white"
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({ currentDate, today, byDay, onDayClick }: {
  currentDate: Date
  today: Date
  byDay: Map<string, AppointmentWithPatient[]>
  onDayClick: (d: Date) => void
}) {
  const grid = getMonthGrid(currentDate)
  const curMonth = currentDate.getMonth()

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day-name header */}
      <div className="grid grid-cols-7 border-b bg-muted/20 shrink-0">
        {DAY_SHORT.map(n => (
          <div key={n} className="py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {n}
          </div>
        ))}
      </div>
      {/* 6-week grid */}
      <div className="grid grid-cols-7 flex-1 border-l">
        {grid.map((day, idx) => {
          const key = isoDate(day)
          const dayAppts = byDay.get(key) ?? []
          const inMonth  = day.getMonth() === curMonth
          const isToday  = sameDay(day, today)
          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={cn(
                "border-b border-r min-h-[110px] p-1 flex flex-col gap-0.5 cursor-pointer hover:bg-muted/30 transition-colors",
                !inMonth && "bg-muted/10"
              )}
            >
              {/* Day number */}
              <span className={cn(
                "self-start flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold mb-0.5",
                isToday  ? "bg-primary text-primary-foreground"
                         : inMonth ? "text-foreground" : "text-muted-foreground/35"
              )}>
                {day.getDate()}
              </span>

              {/* Appointment chips */}
              {dayAppts.slice(0, 3).map(a => (
                <Link
                  key={a.appointment.id}
                  href={`/appointments/${a.appointment.id}`}
                  onClick={e => e.stopPropagation()}
                  title={apptName(a)}
                  className={cn(
                    "flex items-center gap-1 rounded border px-1 py-0.5 text-[10px] leading-tight truncate",
                    chipCls(a.appointment.status ?? "")
                  )}
                >
                  {a.appointment.start && (
                    <span className="font-semibold shrink-0">{formatShortTime(a.appointment.start)}</span>
                  )}
                  <span className="truncate">{apptName(a)}</span>
                </Link>
              ))}
              {dayAppts.length > 3 && (
                <span className="pl-0.5 text-[10px] text-muted-foreground">+{dayAppts.length - 3} more</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Time grid (week + day) ───────────────────────────────────────────────────

function TimeGrid({ days, byDay, now }: {
  days: Date[]
  byDay: Map<string, AppointmentWithPatient[]>
  now: Date
}) {
  const hours  = Array.from({length: TOTAL_HOURS}, (_, i) => START_HOUR + i)
  const today  = new Date(); today.setHours(0,0,0,0)
  const nowMin = now.getHours()*60 + now.getMinutes()
  const nowTop = Math.max(0, (nowMin - START_HOUR*60)) * (HOUR_HEIGHT/60)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Sticky day headers */}
      <div className="shrink-0 flex border-b bg-background">
        <div className="w-14 shrink-0 border-r" />
        {days.map((day, i) => {
          const isToday = sameDay(day, today)
          return (
            <div key={i} className="flex-1 py-2 text-center border-r last:border-r-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {DAY_SHORT[day.getDay()]}
              </p>
              <div className={cn(
                "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                isToday ? "bg-primary text-primary-foreground" : "text-foreground"
              )}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable time area */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{height: TOTAL_PX}}>

          {/* Hour labels */}
          <div className="w-14 shrink-0 relative border-r select-none">
            {hours.map(h => (
              <div
                key={h}
                className="absolute right-2 pointer-events-none"
                style={{top: (h - START_HOUR)*HOUR_HEIGHT - 7}}
              >
                <span className="text-[10px] text-muted-foreground/60 leading-none">{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const key = isoDate(day)
            const dayAppts = byDay.get(key) ?? []
            const isToday  = sameDay(day, today)
            return (
              <div key={di} className="flex-1 relative border-r last:border-r-0" style={{height: TOTAL_PX}}>
                {/* Hour grid lines */}
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/30"
                    style={{top: (h - START_HOUR)*HOUR_HEIGHT}}
                  />
                ))}

                {/* Half-hour lines */}
                {hours.map(h => (
                  <div
                    key={`h-${h}`}
                    className="absolute left-0 right-0 border-t border-dashed border-border/15"
                    style={{top: (h - START_HOUR)*HOUR_HEIGHT + HOUR_HEIGHT/2}}
                  />
                ))}

                {/* Today tint */}
                {isToday && <div className="absolute inset-0 bg-primary/[0.025] pointer-events-none" />}

                {/* Current time indicator */}
                {isToday && nowMin >= START_HOUR*60 && nowMin < END_HOUR*60 && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{top: nowTop}}
                  >
                    <div className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full bg-red-500" />
                    <div className="border-t-2 border-red-500" />
                  </div>
                )}

                {/* Appointment blocks */}
                {dayAppts.map(a => {
                  const {top, height} = blockPos(a)
                  return (
                    <Link
                      key={a.appointment.id}
                      href={`/appointments/${a.appointment.id}`}
                      className={cn(
                        "absolute left-1 right-1 rounded border px-1.5 py-0.5 overflow-hidden z-10",
                        "hover:brightness-90 hover:shadow-sm transition-all",
                        blockCls(a.appointment.status ?? "")
                      )}
                      style={{top, height}}
                      title={apptName(a)}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">{apptName(a)}</p>
                      {height > 30 && a.appointment.start && (
                        <p className="text-[10px] opacity-80 leading-tight truncate">
                          {formatShortTime(a.appointment.start)}
                          {a.appointment.minutesDuration ? ` · ${a.appointment.minutesDuration}m` : ""}
                        </p>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main calendar component ───────────────────────────────────────────────────

export function AppointmentCalendar() {
  const [view, setView] = useState<ViewMode>("month")
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  })
  const [appts, setAppts] = useState<AppointmentWithPatient[]>([])
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(() => new Date())

  // Tick every minute for the time indicator
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Compute visible date range + display title
  const { dateFrom, dateTo, title, days } = useMemo(() => {
    if (view === "month") {
      const grid = getMonthGrid(anchor)
      return {
        dateFrom: isoDate(grid[0]),
        dateTo:   isoDate(grid[grid.length - 1]),
        title:    `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`,
        days:     [] as Date[],
      }
    }
    if (view === "week") {
      const weekDays = getWeekDays(anchor)
      const start = weekDays[0], end = weekDays[6]
      const same = start.getMonth() === end.getMonth()
      const title = same
        ? `${MONTHS[start.getMonth()].slice(0,3)} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
        : `${MONTHS[start.getMonth()].slice(0,3)} ${start.getDate()} – ${MONTHS[end.getMonth()].slice(0,3)} ${end.getDate()}, ${end.getFullYear()}`
      return { dateFrom: isoDate(start), dateTo: isoDate(end), title, days: weekDays }
    }
    // day
    return {
      dateFrom: isoDate(anchor),
      dateTo:   isoDate(anchor),
      title:    `${DAY_LONG[anchor.getDay()]}, ${MONTHS[anchor.getMonth()]} ${anchor.getDate()}, ${anchor.getFullYear()}`,
      days:     [anchor],
    }
  }, [view, anchor])

  // Fetch appointments whenever the range changes
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      setLoading(true)
      searchAppointments({ dateFrom, dateTo, count: 200 })
        .then(r => { if (!cancelled) setAppts(r) })
        .catch(() => { if (!cancelled) setAppts([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => { cancelled = true; clearTimeout(t) }
  }, [dateFrom, dateTo])

  const byDay = useMemo(() => groupByDay(appts), [appts])
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  // Navigation
  function navigate(dir: -1 | 1) {
    setAnchor(prev => {
      const d = new Date(prev)
      if (view === "month") d.setMonth(d.getMonth() + dir)
      if (view === "week")  d.setDate(d.getDate() + dir*7)
      if (view === "day")   d.setDate(d.getDate() + dir)
      return d
    })
  }
  function goToday() {
    const d = new Date(); d.setHours(0,0,0,0)
    setAnchor(d)
  }
  function handleDayClick(d: Date) {
    setAnchor(new Date(d))
    setView("day")
  }

  const weekDays = view !== "month" ? days : []

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-card" style={{height: "calc(100vh - 230px)", minHeight: 520}}>
      {/* ── Calendar header ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-background shrink-0">
        {/* Prev / Today / Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="h-7 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <h2 className="flex-1 text-sm font-semibold ml-1">
          {title}
          {loading && <Loader2 className="inline ml-2 h-3 w-3 animate-spin text-muted-foreground" />}
        </h2>

        {/* View switcher */}
        <div className="flex rounded-md border border-border overflow-hidden">
          {(["day", "week", "month"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium capitalize border-r last:border-r-0 transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted text-muted-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar body ── */}
      {view === "month" && (
        <MonthView
          currentDate={anchor}
          today={today}
          byDay={byDay}
          onDayClick={handleDayClick}
        />
      )}
      {(view === "week" || view === "day") && (
        <TimeGrid days={weekDays} byDay={byDay} now={now} />
      )}
    </div>
  )
}
