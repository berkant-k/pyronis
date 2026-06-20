import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getOrganization,
    getOrganizationPractitioners,
    organizationDisplayName,
    organizationTypeLabel,
    parseFhirId,
} from "@/lib/fhir-client";
import { OrgPractitionersCard } from "@/components/organizations/OrgPractitionersCard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, Building2, Pencil, Phone, Mail, MapPin, Hash, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const o = await getOrganization(id);
        return { title: `${organizationDisplayName(o)} | Pyronis EMR` };
    } catch {
        return { title: "Organization | Pyronis EMR" };
    }
}

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let org;
    try {
        org = await getOrganization(id);
    } catch {
        notFound();
    }

    const practitioners = await getOrganizationPractitioners(id);
    const phone = org.telecom?.find((t) => t.system === "phone")?.value;
    const email = org.telecom?.find((t) => t.system === "email")?.value;
    const identifier = org.identifier?.[0]?.value;
    const typeLabel = organizationTypeLabel(org);
    const address = org.address?.[0];
    const parentRef = org.partOf?.reference;

    return (
        <div className="space-y-5 max-w-3xl">
            <Link href="/organizations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to organizations
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{organizationDisplayName(org)}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {typeLabel && <Badge variant="outline">{typeLabel}</Badge>}
                            <Badge variant={org.active !== false ? "default" : "secondary"}
                                className={org.active !== false ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                {org.active !== false ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <RawFhirDialog resource={org as unknown as Record<string, unknown>} />
                    <Link href={`/organizations/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
                    {phone && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{phone}</span>
                        </div>
                    )}
                    {email && (
                        <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{email}</span>
                        </div>
                    )}
                    {address && (
                        <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span>
                                {[address.text, address.city, address.country].filter(Boolean).join(", ")}
                            </span>
                        </div>
                    )}
                    {!phone && !email && !address && (
                        <p className="text-sm text-muted-foreground">No contact info recorded</p>
                    )}
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h3>
                    {identifier && (
                        <div className="flex items-center gap-2 text-sm">
                            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-mono">{identifier}</span>
                        </div>
                    )}
                    {parentRef && (
                        <div className="flex items-center gap-2 text-sm">
                            <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Part of:</span>
                            <Link href={`/organizations/${parseFhirId(parentRef, "Organization") ?? parentRef}`}
                                className="text-primary hover:underline truncate">
                                {parseFhirId(parentRef, "Organization") ?? parentRef}
                            </Link>
                        </div>
                    )}
                    {!identifier && !parentRef && (
                        <p className="text-sm text-muted-foreground">No additional details</p>
                    )}
                </div>
            </div>

            {/* Practitioners */}
            <OrgPractitionersCard organizationId={id} initialRoles={practitioners} />
        </div>
    );
}
