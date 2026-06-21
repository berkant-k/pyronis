import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getDevice,
    deviceDisplayName,
    deviceTypeLabel,
    parseFhirId,
} from "@/lib/fhir-client";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";
import { DeleteDeviceButton } from "@/components/devices/DeleteDeviceButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    Cpu,
    Pencil,
    Hash,
    Building2,
    MapPin,
    FileText,
    Barcode,
    Factory,
    Tag,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_CLASSES: Record<string, string> = {
    active:            "bg-green-100 text-green-700 border-green-200",
    inactive:          "bg-slate-100 text-slate-600 border-slate-200",
    "entered-in-error":"bg-red-100 text-red-700 border-red-200",
    unknown:           "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
    active:            "Active",
    inactive:          "Inactive",
    "entered-in-error":"Entered in Error",
    unknown:           "Unknown",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const dev = await getDevice(id);
        return { title: `${deviceDisplayName(dev)} | Pyronis EMR` };
    } catch {
        return { title: "Device | Pyronis EMR" };
    }
}

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let dev;
    try {
        dev = await getDevice(id);
    } catch {
        notFound();
    }

    const status     = dev.status ?? "unknown";
    const typeLabel  = deviceTypeLabel(dev);
    const identifier = dev.identifier?.[0]?.value;
    const orgId      = parseFhirId(dev.owner?.reference, "Organization");
    const orgName    = dev.owner?.display ?? orgId;
    const locId      = parseFhirId(dev.location?.reference, "Location");
    const locName    = dev.location?.display ?? locId;
    const udi        = dev.udiCarrier?.[0]?.carrierHRF;

    return (
        <div className="space-y-5 max-w-3xl">
            <Link href="/devices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to devices
            </Link>

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Cpu className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{deviceDisplayName(dev)}</h1>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {typeLabel && (
                                <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">{typeLabel}</span>
                            )}
                            <span className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                STATUS_CLASSES[status] ?? STATUS_CLASSES.unknown
                            )}>
                                {STATUS_LABELS[status] ?? status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <RawFhirDialog resource={dev as unknown as Record<string, unknown>} />
                    <Link href={`/devices/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <DeleteDeviceButton deviceId={id} />
                </div>
            </div>

            {/* ── Info grid ── */}
            <div className="grid grid-cols-2 gap-4">
                {/* Device Info */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device Info</h3>
                    {identifier && (
                        <div className="flex items-center gap-2 text-sm">
                            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-mono">{identifier}</span>
                        </div>
                    )}
                    {dev.manufacturer && (
                        <div className="flex items-center gap-2 text-sm">
                            <Factory className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{dev.manufacturer}</span>
                        </div>
                    )}
                    {dev.modelNumber && (
                        <div className="flex items-center gap-2 text-sm">
                            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <span className="text-muted-foreground text-xs">Model</span>
                                <p>{dev.modelNumber}</p>
                            </div>
                        </div>
                    )}
                    {dev.serialNumber && (
                        <div className="flex items-center gap-2 text-sm">
                            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <span className="text-muted-foreground text-xs">Serial</span>
                                <p className="font-mono">{dev.serialNumber}</p>
                            </div>
                        </div>
                    )}
                    {udi && (
                        <div className="flex items-start gap-2 text-sm">
                            <Barcode className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <span className="text-muted-foreground text-xs">UDI</span>
                                <p className="font-mono text-xs break-all">{udi}</p>
                            </div>
                        </div>
                    )}
                    {!identifier && !dev.manufacturer && !dev.modelNumber && !dev.serialNumber && !udi && (
                        <p className="text-sm text-muted-foreground">No device info recorded</p>
                    )}
                </div>

                {/* Assignment */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment</h3>
                    {orgId && (
                        <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <span className="text-muted-foreground text-xs">Owner</span>
                                <p><Link href={`/organizations/${orgId}`} className="text-primary hover:underline">{orgName}</Link></p>
                            </div>
                        </div>
                    )}
                    {locId && (
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <span className="text-muted-foreground text-xs">Location</span>
                                <p><Link href={`/locations/${locId}`} className="text-primary hover:underline">{locName}</Link></p>
                            </div>
                        </div>
                    )}
                    {dev.note?.[0]?.text && (
                        <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <span className="text-muted-foreground text-xs">Notes</span>
                                <p className="text-muted-foreground">{dev.note[0].text}</p>
                            </div>
                        </div>
                    )}
                    {!orgId && !locId && !dev.note?.[0]?.text && (
                        <p className="text-sm text-muted-foreground">No assignment recorded</p>
                    )}
                </div>
            </div>
        </div>
    );
}
