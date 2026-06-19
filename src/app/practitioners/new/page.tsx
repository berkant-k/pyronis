import type { Metadata } from "next";
import { PractitionerForm } from "@/components/practitioners/PractitionerForm";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "New Practitioner | Pyronis EMR" };

export default function NewPractitionerPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href="/practitioners" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to practitioners
            </Link>
            <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold">New Practitioner</h1>
                    <p className="text-sm text-muted-foreground">Register a new practitioner record</p>
                </div>
            </div>
            <PractitionerForm mode="create" />
        </div>
    );
}
