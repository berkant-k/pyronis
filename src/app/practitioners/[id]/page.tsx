import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getPractitioner,
    getPractitionerRoles,
    practitionerDisplayName,
    getPractitionerSpecialty,
    getPractitionerLicence,
    getPractitionerQualText,
    formatDate,
} from "@/lib/fhir-client";
import { PractitionerRolesCard } from "@/components/practitioners/PractitionerRolesCard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, Pencil, Stethoscope, Phone, Mail, Award, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const p = await getPractitioner(id);
        return { title: `${practitionerDisplayName(p)} | Pyronis EMR` };
    } catch {
        return { title: "Practitioner | Pyronis EMR" };
    }
}

export default async function PractitionerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let practitioner;
    try {
        practitioner = await getPractitioner(id);
    } catch {
        notFound();
    }

    const roles = await getPractitionerRoles(id);
    const phone = practitioner.telecom?.find((t) => t.system === "phone")?.value;
    const email = practitioner.telecom?.find((t) => t.system === "email")?.value;
    const qual = getPractitionerQualText(practitioner);
    const licence = getPractitionerLicence(practitioner);
    const specialty = getPractitionerSpecialty(practitioner);

    return (
        <div className="space-y-5 max-w-3xl">
            <Link href="/practitioners" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to practitioners
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Stethoscope className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{practitionerDisplayName(practitioner)}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {specialty && <Badge variant="secondary">{specialty}</Badge>}
                            {qual && <span className="text-sm text-muted-foreground">{qual}</span>}
                            <Badge variant={practitioner.active !== false ? "default" : "secondary"}
                                className={practitioner.active !== false ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                {practitioner.active !== false ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <RawFhirDialog resource={practitioner as unknown as Record<string, unknown>} />
                    <Link href={`/practitioners/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demographics</h3>
                    {practitioner.gender && (
                        <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="capitalize">{practitioner.gender}</span>
                        </div>
                    )}
                    {practitioner.birthDate && (
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{formatDate(practitioner.birthDate)}</span>
                        </div>
                    )}
                    {!practitioner.gender && !practitioner.birthDate && (
                        <p className="text-sm text-muted-foreground">No demographic info recorded</p>
                    )}
                </div>

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
                    {!phone && !email && (
                        <p className="text-sm text-muted-foreground">No contact info recorded</p>
                    )}
                </div>

                {(qual || licence) && (
                    <div className="rounded-lg border bg-card p-4 space-y-3 col-span-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qualification</h3>
                        <div className="flex items-center gap-2 text-sm">
                            <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{qual || "—"}</span>
                            {licence && <span className="text-muted-foreground ml-2">· Licence: <span className="font-mono">{licence}</span></span>}
                        </div>
                    </div>
                )}
            </div>

            {/* Roles */}
            <PractitionerRolesCard practitionerId={id} initialRoles={roles} />
        </div>
    );
}
