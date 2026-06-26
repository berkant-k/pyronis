import type { Metadata } from "next";
import { getPatient, patientDisplayName } from "@/lib/fhir-client";
import { PatientDetailView } from "@/components/patients/PatientDetailView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const patient = await getPatient(id);
    return { title: `${patientDisplayName(patient)} | Pyronis EMR` };
  } catch {
    return { title: "Patient | Pyronis EMR" };
  }
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDetailView patientId={id} />;
}
