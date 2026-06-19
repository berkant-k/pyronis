import type { Metadata } from "next";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "New Organization | Pyronis EMR" };

export default function NewOrganizationPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href="/organizations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to organizations
            </Link>
            <div className="flex items-center gap-3">
                <PlusCircle className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold">New Organization</h1>
                    <p className="text-sm text-muted-foreground">Register a new organization record</p>
                </div>
            </div>
            <OrganizationForm mode="create" />
        </div>
    );
}
