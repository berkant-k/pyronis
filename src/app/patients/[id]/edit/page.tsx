import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPatient, patientDisplayName, patientToFormState, patientPhotoDataUrl } from "@/lib/fhir-client";
import { PatientForm } from "@/components/patients/PatientForm";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const patient = await getPatient(id);
    return { title: `Edit ${patientDisplayName(patient)} | Pyronis EMR` };
  } catch {
    return { title: "Edit Patient | Pyronis EMR" };
  }
}

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let defaultValues;
  let existingPhotoDataUrl: string | null = null;
  try {
    const patient = await getPatient(id);
    defaultValues = patientToFormState(patient);
    existingPhotoDataUrl = patientPhotoDataUrl(patient);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/patients/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to patient
      </Link>

      <div className="flex items-center gap-3">
        <Pencil className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Edit Patient</h1>
          <p className="text-sm text-muted-foreground">Update patient demographic information</p>
        </div>
      </div>

      <PatientForm mode="edit" patientId={id} defaultValues={defaultValues} existingPhotoDataUrl={existingPhotoDataUrl} />
    </div>
  );
}
