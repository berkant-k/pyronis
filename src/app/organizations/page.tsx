import type { Metadata } from "next";
import { searchOrganizations, organizationDisplayName, organizationTypeLabel } from "@/lib/fhir-client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Building2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Organizations | Pyronis EMR" };

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams;
    const organizations = await searchOrganizations(q).catch(() => []);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" />
                        Organizations
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Link href="/organizations/new" className={cn(buttonVariants(), "gap-2")}>
                    <PlusCircle className="h-4 w-4" /> New Organization
                </Link>
            </div>

            {/* Search */}
            <form method="get" className="flex gap-2 max-w-md">
                <input
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Search by name…"
                    className="flex-1 h-9 rounded-md border bg-background px-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    autoComplete="off"
                />
                <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>Search</button>
                {q && (
                    <Link href="/organizations" className={cn(buttonVariants({ variant: "ghost" }))}>Clear</Link>
                )}
            </form>

            {organizations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
                    <Building2 className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">{q ? `No organizations matching "${q}"` : "No organizations registered yet"}</p>
                    <Link href="/organizations/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 gap-1.5")}>
                        <PlusCircle className="h-3.5 w-3.5" /> Add first organization
                    </Link>
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b">
                            <tr>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Identifier</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Contact</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {organizations.map((o) => {
                                const typeLabel = organizationTypeLabel(o);
                                const phone = o.telecom?.find((t) => t.system === "phone")?.value;
                                const email = o.telecom?.find((t) => t.system === "email")?.value;
                                const identifier = o.identifier?.[0]?.value;
                                return (
                                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{organizationDisplayName(o)}</p>
                                            {o.address?.[0]?.city && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{o.address[0].city}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {typeLabel
                                                ? <Badge variant="outline">{typeLabel}</Badge>
                                                : <span className="text-muted-foreground">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{identifier || "—"}</td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {phone || email
                                                ? <>{phone}{phone && email ? " · " : ""}{email}</>
                                                : "—"
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={o.active !== false ? "default" : "secondary"}
                                                className={o.active !== false ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                                {o.active !== false ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/organizations/${o.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                                                <ArrowRight className="h-4 w-4" />
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
