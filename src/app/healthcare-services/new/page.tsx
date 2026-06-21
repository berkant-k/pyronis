import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HealthcareServiceForm } from "@/components/healthcare-services/HealthcareServiceForm";

export const metadata: Metadata = { title: "New Healthcare Service | Pyronis EMR" };

export default function NewHealthcareServicePage() {
    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Link href="/healthcare-services" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Healthcare Services
            </Link>
            <h1 className="text-xl font-semibold">New Healthcare Service</h1>
            <HealthcareServiceForm mode="create" />
        </div>
    );
}
