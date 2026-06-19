"use client";

import { useState, useTransition } from "react";
import type { Practitioner, PractitionerRole } from "@medplum/fhirtypes";
import {
    createPractitionerRole,
    deletePractitionerRole,
    searchPractitioners,
    ROLE_CODE_OPTIONS,
    PRACTITIONER_SPECIALTIES,
    practitionerDisplayName,
    getPractitionerSpecialty,
} from "@/lib/fhir-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Loader2, Plus, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleWithPract { role: PractitionerRole; practitioner?: Practitioner }

interface Props {
    organizationId: string;
    initialRoles: RoleWithPract[];
}

export function OrgPractitionersCard({ organizationId, initialRoles }: Props) {
    const [roles, setRoles] = useState<RoleWithPract[]>(initialRoles);
    const [open, setOpen] = useState(false);
    const [practQuery, setPractQuery] = useState("");
    const [practResults, setPractResults] = useState<Practitioner[]>([]);
    const [selectedPract, setSelectedPract] = useState<Practitioner | null>(null);
    const [roleCode, setRoleCode] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function searchPracts(q: string) {
        setPractQuery(q);
        if (q.trim().length < 2) { setPractResults([]); return; }
        startTransition(async () => {
            const res = await searchPractitioners(q);
            setPractResults(res);
        });
    }

    function resetDialog() {
        setPractQuery("");
        setPractResults([]);
        setSelectedPract(null);
        setRoleCode("");
        setSpecialty("");
        setSaveError(null);
    }

    async function handleAdd() {
        if (!selectedPract?.id) { setSaveError("Select a practitioner"); return; }
        setSaving(true);
        setSaveError(null);
        try {
            const role = await createPractitionerRole({
                practitionerId: selectedPract.id,
                organizationId,
                roleCode: roleCode || undefined,
                specialty: specialty || undefined,
            });
            setRoles((prev) => [...prev, { role, practitioner: selectedPract }]);
            setOpen(false);
            resetDialog();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to add practitioner");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(roleId: string) {
        setDeleting(roleId);
        try {
            await deletePractitionerRole(roleId);
            setRoles((prev) => prev.filter((r) => r.role.id !== roleId));
        } catch {
            // silently ignore
        } finally {
            setDeleting(null);
        }
    }

    return (
        <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Practitioners
                    <Badge variant="secondary" className="text-xs">{roles.length}</Badge>
                </h3>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetDialog(); }}>
                    <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                        <Plus className="h-3.5 w-3.5" /> Add Practitioner
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Practitioner</DialogTitle>
                            <DialogDescription>Link a practitioner to this organization with an optional role and specialty.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-1">
                            <div className="space-y-1.5">
                                <Label>Practitioner <span className="text-destructive">*</span></Label>
                                {selectedPract ? (
                                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                                        <span className="font-medium">{practitionerDisplayName(selectedPract)}</span>
                                        <button onClick={() => { setSelectedPract(null); setPractQuery(""); setPractResults([]); }}
                                            className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            {isPending
                                                ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
                                                : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            }
                                            <Input
                                                value={practQuery}
                                                onChange={(e) => searchPracts(e.target.value)}
                                                placeholder="Search practitioners…"
                                                className="pl-8 text-sm"
                                            />
                                        </div>
                                        {practResults.length > 0 && (
                                            <div className="rounded-md border divide-y max-h-40 overflow-auto">
                                                {practResults.map((p) => (
                                                    <button key={p.id} type="button"
                                                        onClick={() => { setSelectedPract(p); setPractResults([]); setPractQuery(""); }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50">
                                                        <span className="font-medium">{practitionerDisplayName(p)}</span>
                                                        {getPractitionerSpecialty(p) && (
                                                            <span className="text-muted-foreground ml-1.5">— {getPractitionerSpecialty(p)}</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Role</Label>
                                <Select value={roleCode} onValueChange={(v) => setRoleCode(v ?? "")}>
                                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                    <SelectContent>
                                        {ROLE_CODE_OPTIONS.map((r) => (
                                            <SelectItem key={r.code} value={r.code}>{r.display}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Specialty</Label>
                                <Select value={specialty} onValueChange={(v) => setSpecialty(v ?? "")}>
                                    <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                                    <SelectContent>
                                        {PRACTITIONER_SPECIALTIES.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {saveError && (
                                <p className="text-sm text-destructive rounded bg-destructive/10 px-3 py-2">{saveError}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                            <Button onClick={handleAdd} disabled={saving || !selectedPract} className="gap-2">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                Add Practitioner
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {roles.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-8 text-muted-foreground">
                    <Users className="h-6 w-6 opacity-30" />
                    <p className="text-sm">No practitioners assigned</p>
                </div>
            ) : (
                <div className="divide-y">
                    {roles.map(({ role, practitioner }) => {
                        const roleName = role.code?.[0]?.text ?? role.code?.[0]?.coding?.[0]?.display ?? "";
                        const spec = role.specialty?.[0]?.text ?? "";
                        return (
                            <div key={role.id} className="flex items-center justify-between px-4 py-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {practitioner ? practitionerDisplayName(practitioner) : <span className="text-muted-foreground">Unknown</span>}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {roleName && <Badge variant="secondary" className="text-xs">{roleName}</Badge>}
                                        {spec && <span className="text-xs text-muted-foreground">{spec}</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => role.id && handleDelete(role.id)}
                                    disabled={deleting === role.id}
                                    aria-label="Remove practitioner"
                                    className="shrink-0 ml-3 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    {deleting === role.id
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Trash2 className="h-4 w-4" />
                                    }
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
