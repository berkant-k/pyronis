import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrganization, organizationDisplayName, organizationToFormState } from "@/lib/fhir-client";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { ArrowLeft, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const o = await getOrganization(id);
        return { title: `Edit ${organizationDisplayName(o)} | Pyronis EMR` };
    } catch {
        return { title: "Edit Organization | Pyronis EMR" };
    }
}

export default async function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let defaultValues;
    try {
        const o = await getOrganization(id);
        defaultValues = organizationToFormState(o);
    } catch {
        notFound();
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href={`/organizations/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to organization
            </Link>
            <div className="flex items-center gap-3">
                <Pencil className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold">Edit Organization</h1>
                    <p className="text-sm text-muted-foreground">Update organization information</p>
                </div>
            </div>
            <OrganizationForm mode="edit" organizationId={id} defaultValues={defaultValues} />
        </div>
    );
}
