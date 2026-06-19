import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPatient,
  getPatientAllergies,
  patientDisplayName,
  getPatientMRN,
  formatDate,
  patientAge,
  EXT_VIP,
} from "@/lib/fhir-client";
import { AllergiesManager } from "@/components/patients/AllergiesManager";
import { ArrowLeft, Star, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const patient = await getPatient(id);
    return { title: `Allergies — ${patientDisplayName(patient)} | Pyronis EMR` };
  } catch {
    return { title: "Allergies | Pyronis EMR" };
  }
}

export default async function AllergiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let patient;
  try {
    patient = await getPatient(id);
  } catch {
    notFound();
  }

  const allergies = await getPatientAllergies(id).catch(() => []);

  const mrn = getPatientMRN(patient);
  const age = patientAge(patient);
  const isVip =
    patient.extension?.some((x) => x.url === EXT_VIP && x.valueBoolean === true) ?? false;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <Link
          href={`/patients/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to patient
        </Link>
      </div>

      {/* Patient mini-header */}
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400/60 to-red-300/20" />
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 ring-2 ring-red-100">
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight">
                  {patientDisplayName(patient)}
                </h1>
                {mrn && (
                  <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-2 py-0.5">
                    MR-{mrn}
                  </span>
                )}
                {isVip && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    VIP
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {[
                  patient.birthDate &&
                    `${formatDate(patient.birthDate)} · ${age} yrs`,
                  patient.gender &&
                    patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1),
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <ShieldAlert className="h-4 w-4" />
              <span>
                <span className="font-semibold text-foreground">{allergies.length}</span>{" "}
                allerg{allergies.length !== 1 ? "ies" : "y"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager */}
      <AllergiesManager
        patientId={id}
        initialAllergies={allergies}
        patient={{ name: patientDisplayName(patient), gender: patient.gender, birthDate: patient.birthDate }}
      />
    </div>
  );
}
