"use client"

import { useState } from "react"
import { List, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppointmentSearch } from "./AppointmentSearch"
import { AppointmentCalendar } from "./AppointmentCalendar"
import { BookAppointmentDialog } from "./BookAppointmentDialog"

type ActiveView = "list" | "calendar"

export function AppointmentsView() {
  const [activeView, setActiveView] = useState<ActiveView>("list")
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <BookAppointmentDialog onSuccess={() => setRefreshKey((k) => k + 1)} />

        {/* List / Calendar toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setActiveView("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              activeView === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted text-muted-foreground"
            )}
          >
            <List className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setActiveView("calendar")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-l border-border transition-colors",
              activeView === "calendar"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted text-muted-foreground"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </button>
        </div>
      </div>

      {activeView === "list" ? <AppointmentSearch refreshKey={refreshKey} /> : <AppointmentCalendar />}
    </div>
  )
}
