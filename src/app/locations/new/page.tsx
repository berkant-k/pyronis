import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LocationForm } from "@/components/locations/LocationForm";

export const metadata: Metadata = { title: "New Location | Pyronis EMR" };

export default function NewLocationPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Link
                href="/locations"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Locations
            </Link>
            <h1 className="text-xl font-semibold">New Location</h1>
            <LocationForm mode="create" />
        </div>
    );
}
