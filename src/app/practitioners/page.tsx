import type { Metadata } from "next";
import { searchPractitioners, practitionerDisplayName, getPractitionerSpecialty, getPractitionerLicence, getPractitionerQualText, formatDate } from "@/lib/fhir-client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Stethoscope, UserPlus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Practitioners | Pyronis EMR" };

export default async function PractitionersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams;
    const practitioners = await searchPractitioners(q).catch(() => []);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Stethoscope className="h-6 w-6 text-primary" />
                        Practitioners
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {practitioners.length} practitioner{practitioners.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Link href="/practitioners/new" className={cn(buttonVariants(), "gap-2")}>
                    <UserPlus className="h-4 w-4" /> New Practitioner
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
                    <Link href="/practitioners" className={cn(buttonVariants({ variant: "ghost" }))}>Clear</Link>
                )}
            </form>

            {practitioners.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
                    <Stethoscope className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">{q ? `No practitioners matching "${q}"` : "No practitioners registered yet"}</p>
                    <Link href="/practitioners/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 gap-1.5")}>
                        <UserPlus className="h-3.5 w-3.5" /> Add first practitioner
                    </Link>
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b">
                            <tr>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Qualification</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Specialty</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Licence</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {practitioners.map((p) => {
                                const specialty = getPractitionerSpecialty(p);
                                const qual = getPractitionerQualText(p);
                                const licence = getPractitionerLicence(p);
                                return (
                                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium">{practitionerDisplayName(p)}</p>
                                                {p.gender && (
                                                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                                        {p.gender}{p.birthDate ? ` · ${formatDate(p.birthDate)}` : ""}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{qual || "—"}</td>
                                        <td className="px-4 py-3">
                                            {specialty
                                                ? <Badge variant="secondary">{specialty}</Badge>
                                                : <span className="text-muted-foreground">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{licence || "—"}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={p.active !== false ? "default" : "secondary"} className={p.active !== false ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                                {p.active !== false ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/practitioners/${p.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
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
