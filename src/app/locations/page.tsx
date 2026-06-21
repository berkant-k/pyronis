import type { Metadata } from "next";
import Link from "next/link";
import { Plus, MapPin, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    searchLocations,
    locationDisplayName,
    locationPhysicalTypeLabel,
    locationTypeLabel,
    locationStatusColor,
    parseFhirId,
} from "@/lib/fhir-client";
import { StatusPill } from "@/components/ui/StatusPill";

export const metadata: Metadata = { title: "Locations | Pyronis EMR" };
export const dynamic = "force-dynamic";

export default async function LocationsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const locations = await searchLocations(q).catch(() => []);

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Locations</h1>
                    <p className="text-sm text-muted-foreground">
                        Hospital, department, ward, room and bed hierarchy
                    </p>
                </div>
                <Link href="/locations/new" className={cn(buttonVariants(), "gap-2")}>
                    <Plus className="h-4 w-4" />
                    New Location
                </Link>
            </div>

            {/* ── Search ── */}
            <form method="GET" className="flex gap-2">
                <input
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Search by name…"
                    className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <button
                    type="submit"
                    className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
                >
                    Search
                </button>
            </form>

            {/* ── Table ── */}
            {locations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
                    <MapPin className="h-8 w-8 opacity-30" />
                    <p className="text-sm">
                        {q ? `No locations found for "${q}"` : "No locations defined yet."}
                    </p>
                    {!q && (
                        <Link href="/locations/new" className={cn(buttonVariants({ variant: "outline" }), "gap-2 mt-1")}>
                            <Plus className="h-4 w-4" />
                            Add first location
                        </Link>
                    )}
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Name</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Clinical Type</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Status</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Parent</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map((loc) => {
                                const id = loc.id ?? "";
                                const physLabel = locationPhysicalTypeLabel(loc);
                                const typeLabel = locationTypeLabel(loc);
                                const parentId = parseFhirId(loc.partOf?.reference, "Location");
                                const parentLabel = loc.partOf?.display ?? (parentId ? `Location/${parentId}` : null);
                                const orgLabel = loc.managingOrganization?.display ?? null;
                                return (
                                    <tr key={id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{locationDisplayName(loc)}</span>
                                                {physLabel && (
                                                    <span className="text-xs text-muted-foreground">{physLabel}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {typeLabel ?? <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill
                                                color={locationStatusColor(loc.status)}
                                                label={loc.status ?? "unknown"}
                                                className="capitalize"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {parentId ? (
                                                <Link href={`/locations/${parentId}`} className="hover:text-primary underline-offset-2 hover:underline">
                                                    {parentLabel}
                                                </Link>
                                            ) : orgLabel ? (
                                                orgLabel
                                            ) : (
                                                <span className="text-muted-foreground/40">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/locations/${id}`}
                                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
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
