import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";

export const metadata: Metadata = { title: "Appointments | Pyronis EMR" };

export default function AppointmentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Search, schedule, and manage patient appointments
          </p>
        </div>
      </div>
      <AppointmentsView />
    </div>
  );
}
