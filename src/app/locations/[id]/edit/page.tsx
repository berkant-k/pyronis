import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocation, locationDisplayName, locationToFormState } from "@/lib/fhir-client";
import { LocationForm } from "@/components/locations/LocationForm";
import { ArrowLeft, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const loc = await getLocation(id);
        return { title: `Edit ${locationDisplayName(loc)} | Pyronis EMR` };
    } catch {
        return { title: "Edit Location | Pyronis EMR" };
    }
}

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let defaultValues;
    try {
        const loc = await getLocation(id);
        defaultValues = locationToFormState(loc);
    } catch {
        notFound();
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link
                href={`/locations/${id}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" /> Back to location
            </Link>
            <div className="flex items-center gap-3">
                <Pencil className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold">Edit Location</h1>
                    <p className="text-sm text-muted-foreground">Update location information</p>
                </div>
            </div>
            <LocationForm mode="edit" locationId={id} defaultValues={defaultValues} />
        </div>
    );
}
