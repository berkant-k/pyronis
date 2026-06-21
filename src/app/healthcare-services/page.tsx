import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Hospital, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    searchHealthcareServices,
    healthcareServiceDisplayName,
    healthcareServiceCategoryLabel,
    parseFhirId,
} from "@/lib/fhir-client";

export const metadata: Metadata = { title: "Healthcare Services | Pyronis EMR" };
export const dynamic = "force-dynamic";

const STATUS_CLASSES = {
    active:   "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function HealthcareServicesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const services = await searchHealthcareServices(q).catch(() => []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Healthcare Services</h1>
                    <p className="text-sm text-muted-foreground">Clinical and support services offered by the facility</p>
                </div>
                <Link href="/healthcare-services/new" className={cn(buttonVariants(), "gap-2")}>
                    <Plus className="h-4 w-4" />
                    New Service
                </Link>
            </div>

            <form method="GET" className="flex gap-2">
                <input
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Search by name…"
                    className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>Search</button>
            </form>

            {services.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
                    <Hospital className="h-8 w-8 opacity-30" />
                    <p className="text-sm">
                        {q ? `No services found for "${q}"` : "No healthcare services defined yet."}
                    </p>
                    {!q && (
                        <Link href="/healthcare-services/new" className={cn(buttonVariants({ variant: "outline" }), "gap-2 mt-1")}>
                            <Plus className="h-4 w-4" />
                            Add first service
                        </Link>
                    )}
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Name</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Category</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Specialty</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Status</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Organization</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((svc) => {
                                const id = svc.id ?? "";
                                const active = svc.active !== false;
                                const orgId = parseFhirId(svc.providedBy?.reference, "Organization");
                                const orgName = svc.providedBy?.display ?? (orgId ? null : null);
                                const specialty = svc.specialty?.[0]?.text;
                                const statusCls = active ? STATUS_CLASSES.active : STATUS_CLASSES.inactive;
                                return (
                                    <tr key={id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{healthcareServiceDisplayName(svc)}</span>
                                                {svc.identifier?.[0]?.value && (
                                                    <span className="font-mono text-[10px] text-muted-foreground">{svc.identifier[0].value}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {healthcareServiceCategoryLabel(svc) ?? <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {specialty ?? <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusCls)}>
                                                {active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {orgId ? (
                                                <Link href={`/organizations/${orgId}`} className="hover:text-primary underline-offset-2 hover:underline">
                                                    {orgName ?? orgId}
                                                </Link>
                                            ) : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/healthcare-services/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
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
