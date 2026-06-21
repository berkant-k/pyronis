import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getHealthcareService,
    healthcareServiceDisplayName,
    healthcareServiceCategoryLabel,
    parseFhirId,
} from "@/lib/fhir-client";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";
import { DeleteHealthcareServiceButton } from "@/components/healthcare-services/DeleteHealthcareServiceButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    Hospital,
    Pencil,
    Phone,
    Building2,
    MapPin,
    Clock,
    FileText,
    Hash,
} from "lucide-react";

export const dynamic = "force-dynamic";

const DAY_LABELS: Record<string, string> = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
    fri: "Fri", sat: "Sat", sun: "Sun",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const svc = await getHealthcareService(id);
        return { title: `${healthcareServiceDisplayName(svc)} | Pyronis EMR` };
    } catch {
        return { title: "Healthcare Service | Pyronis EMR" };
    }
}

export default async function HealthcareServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let svc;
    try {
        svc = await getHealthcareService(id);
    } catch {
        notFound();
    }

    const active       = svc.active !== false;
    const catLabel     = healthcareServiceCategoryLabel(svc);
    const specialty    = svc.specialty?.[0]?.text;
    const identifier   = svc.identifier?.[0]?.value;
    const phone        = svc.telecom?.find((t) => t.system === "phone")?.value;
    const orgId        = parseFhirId(svc.providedBy?.reference, "Organization");
    const orgName      = svc.providedBy?.display ?? orgId;
    const locId        = parseFhirId(svc.location?.[0]?.reference, "Location");
    const locName      = svc.location?.[0]?.display ?? locId;
    const avail        = svc.availableTime?.[0];
    const days         = avail?.daysOfWeek?.map((d) => DAY_LABELS[d] ?? d).join(", ");

    return (
        <div className="space-y-5 max-w-3xl">
            <Link href="/healthcare-services" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to services
            </Link>

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Hospital className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{healthcareServiceDisplayName(svc)}</h1>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {catLabel && (
                                <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">{catLabel}</span>
                            )}
                            <span className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                active ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                                {active ? "Active" : "Inactive"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <RawFhirDialog resource={svc as unknown as Record<string, unknown>} />
                    <Link href={`/healthcare-services/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <DeleteHealthcareServiceButton serviceId={id} />
                </div>
            </div>

            {/* ── Info grid ── */}
            <div className="grid grid-cols-2 gap-4">
                {/* Details */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h3>
                    {identifier && (
                        <div className="flex items-center gap-2 text-sm">
                            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-mono">{identifier}</span>
                        </div>
                    )}
                    {specialty && (
                        <div className="flex items-center gap-2 text-sm">
                            <Hospital className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{specialty}</span>
                        </div>
                    )}
                    {svc.comment && (
                        <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{svc.comment}</span>
                        </div>
                    )}
                    {orgId && (
                        <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Link href={`/organizations/${orgId}`} className="text-primary hover:underline truncate">{orgName}</Link>
                        </div>
                    )}
                    {locId && (
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Link href={`/locations/${locId}`} className="text-primary hover:underline truncate">{locName}</Link>
                        </div>
                    )}
                    {phone && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{phone}</span>
                        </div>
                    )}
                    {!identifier && !specialty && !svc.comment && !orgId && !locId && !phone && (
                        <p className="text-sm text-muted-foreground">No details recorded</p>
                    )}
                </div>

                {/* Availability */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Availability</h3>
                    {days && (
                        <div className="flex items-start gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p>{days}</p>
                                {(avail?.availableStartTime || avail?.availableEndTime) && (
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                        {avail.availableStartTime?.slice(0, 5)} – {avail.availableEndTime?.slice(0, 5)}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {svc.availabilityExceptions && (
                        <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{svc.availabilityExceptions}</span>
                        </div>
                    )}
                    {!days && !svc.availabilityExceptions && (
                        <p className="text-sm text-muted-foreground">No availability recorded</p>
                    )}
                </div>
            </div>
        </div>
    );
}
