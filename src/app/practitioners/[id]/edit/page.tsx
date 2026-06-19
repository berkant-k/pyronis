import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPractitioner, practitionerDisplayName, practitionerToFormState } from "@/lib/fhir-client";
import { PractitionerForm } from "@/components/practitioners/PractitionerForm";
import { ArrowLeft, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const p = await getPractitioner(id);
        return { title: `Edit ${practitionerDisplayName(p)} | Pyronis EMR` };
    } catch {
        return { title: "Edit Practitioner | Pyronis EMR" };
    }
}

export default async function EditPractitionerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let defaultValues;
    try {
        const p = await getPractitioner(id);
        defaultValues = practitionerToFormState(p);
    } catch {
        notFound();
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href={`/practitioners/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to practitioner
            </Link>
            <div className="flex items-center gap-3">
                <Pencil className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold">Edit Practitioner</h1>
                    <p className="text-sm text-muted-foreground">Update practitioner information</p>
                </div>
            </div>
            <PractitionerForm mode="edit" practitionerId={id} defaultValues={defaultValues} />
        </div>
    );
}
