import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Cpu, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    searchDevices,
    deviceDisplayName,
    deviceTypeLabel,
    parseFhirId,
} from "@/lib/fhir-client";

export const metadata: Metadata = { title: "Devices | Pyronis EMR" };
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
    "entered-in-error":"Error",
    unknown:           "Unknown",
};

export default async function DevicesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const devices = await searchDevices(q).catch(() => []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Devices</h1>
                    <p className="text-sm text-muted-foreground">Medical equipment and asset registry</p>
                </div>
                <Link href="/devices/new" className={cn(buttonVariants(), "gap-2")}>
                    <Plus className="h-4 w-4" />
                    New Device
                </Link>
            </div>

            <form method="GET" className="flex gap-2">
                <input
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Search by name…"
                    className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>Search</button>
            </form>

            {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
                    <Cpu className="h-8 w-8 opacity-30" />
                    <p className="text-sm">
                        {q ? `No devices found for "${q}"` : "No devices registered yet."}
                    </p>
                    {!q && (
                        <Link href="/devices/new" className={cn(buttonVariants({ variant: "outline" }), "gap-2 mt-1")}>
                            <Plus className="h-4 w-4" />
                            Register first device
                        </Link>
                    )}
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Name</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Type</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Status</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Manufacturer</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Location</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((dev) => {
                                const id       = dev.id ?? "";
                                const status   = dev.status ?? "unknown";
                                const locId    = parseFhirId(dev.location?.reference, "Location");
                                const locName  = dev.location?.display ?? locId;
                                const typeLabel = deviceTypeLabel(dev);
                                const statusCls = STATUS_CLASSES[status] ?? STATUS_CLASSES.unknown;
                                return (
                                    <tr key={id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{deviceDisplayName(dev)}</span>
                                                {dev.serialNumber && (
                                                    <span className="font-mono text-[10px] text-muted-foreground">SN: {dev.serialNumber}</span>
                                                )}
                                                {!dev.serialNumber && dev.identifier?.[0]?.value && (
                                                    <span className="font-mono text-[10px] text-muted-foreground">{dev.identifier[0].value}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {typeLabel ?? <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusCls)}>
                                                {STATUS_LABELS[status] ?? status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {dev.manufacturer ?? <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {locId ? (
                                                <Link href={`/locations/${locId}`} className="hover:text-primary underline-offset-2 hover:underline">
                                                    {locName}
                                                </Link>
                                            ) : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/devices/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                View <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
