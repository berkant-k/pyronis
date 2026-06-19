import type { Metadata } from "next";
import { PatientForm } from "@/components/patients/PatientForm";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "New Patient | Pyronis EMR" };

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to patients
      </Link>

      <div className="flex items-center gap-3">
        <UserPlus className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">New Patient</h1>
          <p className="text-sm text-muted-foreground">Register a new patient record</p>
        </div>
      </div>

      <PatientForm mode="create" />
    </div>
  );
}
