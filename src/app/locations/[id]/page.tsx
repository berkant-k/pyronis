import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getLocation,
    locationDisplayName,
    locationPhysicalTypeLabel,
    locationTypeLabel,
    locationStatusColor,
    parseFhirId,
} from "@/lib/fhir-client";
import { StatusPill } from "@/components/ui/StatusPill";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";
import { DeleteLocationButton } from "@/components/locations/DeleteLocationButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    MapPin,
    Pencil,
    Phone,
    Building2,
    GitBranch,
    FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const loc = await getLocation(id);
        return { title: `${locationDisplayName(loc)} | Pyronis EMR` };
    } catch {
        return { title: "Location | Pyronis EMR" };
    }
}

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let loc;
    try {
        loc = await getLocation(id);
    } catch {
        notFound();
    }

    const phone      = loc.telecom?.find((t) => t.system === "phone")?.value;
    const physLabel  = locationPhysicalTypeLabel(loc);
    const typeLabel  = locationTypeLabel(loc);
    const parentId   = parseFhirId(loc.partOf?.reference, "Location");
    const parentName = loc.partOf?.display ?? (parentId ? `Location/${parentId}` : null);
    const orgId      = parseFhirId(loc.managingOrganization?.reference, "Organization");
    const orgName    = loc.managingOrganization?.display ?? (orgId ? `Organization/${orgId}` : null);
    const address    = loc.address;

    return (
        <div className="space-y-5 max-w-3xl">
            <Link href="/locations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to locations
            </Link>

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <MapPin className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{locationDisplayName(loc)}</h1>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {physLabel && (
                                <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
                                    {physLabel}
                                </span>
                            )}
                            <StatusPill
                                color={locationStatusColor(loc.status)}
                                label={loc.status ?? "unknown"}
                                className="capitalize"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <RawFhirDialog resource={loc as unknown as Record<string, unknown>} />
                    <Link
                        href={`/locations/${id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                    >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <DeleteLocationButton locationId={id} />
                </div>
            </div>

            {/* ── Info grid ── */}
            <div className="grid grid-cols-2 gap-4">
                {/* Contact */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
                    {phone && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{phone}</span>
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
                    {!phone && !address && (
                        <p className="text-sm text-muted-foreground">No contact info recorded</p>
                    )}
                </div>

                {/* Details */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h3>
                    {typeLabel && (
                        <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{typeLabel}</span>
                        </div>
                    )}
                    {loc.description && (
                        <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{loc.description}</span>
                        </div>
                    )}
                    {parentId && (
                        <div className="flex items-center gap-2 text-sm">
                            <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Part of:</span>
                            <Link
                                href={`/locations/${parentId}`}
                                className="text-primary hover:underline truncate"
                            >
                                {parentName ?? parentId}
                            </Link>
                        </div>
                    )}
                    {orgId && (
                        <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Managed by:</span>
                            <Link
                                href={`/organizations/${orgId}`}
                                className="text-primary hover:underline truncate"
                            >
                                {orgName ?? orgId}
                            </Link>
                        </div>
                    )}
                    {!typeLabel && !loc.description && !parentId && !orgId && (
                        <p className="text-sm text-muted-foreground">No additional details</p>
                    )}
                </div>
            </div>
        </div>
    );
}
