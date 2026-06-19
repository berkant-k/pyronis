import type { Metadata } from "next";
import { PatientSearch } from "@/components/patients/PatientSearch";
import { buttonVariants } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Patients | Pyronis EMR" };

export default function PatientsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Patients</h1>
            <p className="text-sm text-muted-foreground">Search and manage patient records</p>
          </div>
        </div>
        <Link href="/patients/new" className={cn(buttonVariants(), "inline-flex items-center gap-2")}>
          <UserPlus className="h-4 w-4" />
          New Patient
        </Link>
      </div>
      <PatientSearch />
    </div>
  );
}
