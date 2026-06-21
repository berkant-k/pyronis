import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHealthcareService, healthcareServiceDisplayName, healthcareServiceToFormState } from "@/lib/fhir-client";
import { HealthcareServiceForm } from "@/components/healthcare-services/HealthcareServiceForm";
import { ArrowLeft, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const svc = await getHealthcareService(id);
        return { title: `Edit ${healthcareServiceDisplayName(svc)} | Pyronis EMR` };
    } catch {
        return { title: "Edit Healthcare Service | Pyronis EMR" };
    }
}

export default async function EditHealthcareServicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let defaultValues;
    try {
        const svc = await getHealthcareService(id);
        defaultValues = healthcareServiceToFormState(svc);
    } catch {
        notFound();
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href={`/healthcare-services/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to service
            </Link>
            <div className="flex items-center gap-3">
                <Pencil className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold">Edit Healthcare Service</h1>
                    <p className="text-sm text-muted-foreground">Update service information</p>
                </div>
            </div>
            <HealthcareServiceForm mode="edit" serviceId={id} defaultValues={defaultValues} />
        </div>
    );
}
