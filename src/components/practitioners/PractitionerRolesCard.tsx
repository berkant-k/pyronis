"use client";

import { useState, useTransition } from "react";
import type { Organization, PractitionerRole } from "@medplum/fhirtypes";
import {
    createPractitionerRole,
    deletePractitionerRole,
    searchOrganizations,
    ROLE_CODE_OPTIONS,
    PRACTITIONER_SPECIALTIES,
    organizationDisplayName,
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
import { Building2, Loader2, Plus, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleWithOrg { role: PractitionerRole; org?: Organization }

interface Props {
    practitionerId: string;
    initialRoles: RoleWithOrg[];
}

export function PractitionerRolesCard({ practitionerId, initialRoles }: Props) {
    const [roles, setRoles] = useState<RoleWithOrg[]>(initialRoles);
    const [open, setOpen] = useState(false);
    const [orgQuery, setOrgQuery] = useState("");
    const [orgResults, setOrgResults] = useState<Organization[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [roleCode, setRoleCode] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function searchOrgs(q: string) {
        setOrgQuery(q);
        if (q.trim().length < 2) { setOrgResults([]); return; }
        startTransition(async () => {
            const res = await searchOrganizations(q);
            setOrgResults(res);
        });
    }

    function resetDialog() {
        setOrgQuery("");
        setOrgResults([]);
        setSelectedOrg(null);
        setRoleCode("");
        setSpecialty("");
        setSaveError(null);
    }

    async function handleAdd() {
        if (!selectedOrg?.id) { setSaveError("Select an organization"); return; }
        setSaving(true);
        setSaveError(null);
        try {
            const role = await createPractitionerRole({
                practitionerId,
                organizationId: selectedOrg.id,
                roleCode: roleCode || undefined,
                specialty: specialty || undefined,
            });
            setRoles((prev) => [...prev, { role, org: selectedOrg }]);
            setOpen(false);
            resetDialog();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to add role");
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
            // silently ignore; role stays visible
        } finally {
            setDeleting(null);
        }
    }

    return (
        <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Organization Roles
                    <Badge variant="secondary" className="text-xs">{roles.length}</Badge>
                </h3>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetDialog(); }}>
                    <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                        <Plus className="h-3.5 w-3.5" /> Add Role
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Organization Role</DialogTitle>
                            <DialogDescription>Link this practitioner to an organization with an optional role and specialty.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-1">
                            {/* Org search */}
                            <div className="space-y-1.5">
                                <Label>Organization <span className="text-destructive">*</span></Label>
                                {selectedOrg ? (
                                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                                        <span className="font-medium">{organizationDisplayName(selectedOrg)}</span>
                                        <button onClick={() => { setSelectedOrg(null); setOrgQuery(""); setOrgResults([]); }}
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
                                                value={orgQuery}
                                                onChange={(e) => searchOrgs(e.target.value)}
                                                placeholder="Search organizations…"
                                                className="pl-8 text-sm"
                                            />
                                        </div>
                                        {orgResults.length > 0 && (
                                            <div className="rounded-md border divide-y max-h-40 overflow-auto">
                                                {orgResults.map((o) => (
                                                    <button key={o.id} type="button"
                                                        onClick={() => { setSelectedOrg(o); setOrgResults([]); setOrgQuery(""); }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50">
                                                        {organizationDisplayName(o)}
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
                            <Button onClick={handleAdd} disabled={saving || !selectedOrg} className="gap-2">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                Add Role
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {roles.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-8 text-muted-foreground">
                    <Building2 className="h-6 w-6 opacity-30" />
                    <p className="text-sm">No organization roles assigned</p>
                </div>
            ) : (
                <div className="divide-y">
                    {roles.map(({ role, org }) => {
                        const roleName = role.code?.[0]?.text ?? role.code?.[0]?.coding?.[0]?.display ?? "";
                        const spec = role.specialty?.[0]?.text ?? "";
                        return (
                            <div key={role.id} className="flex items-center justify-between px-4 py-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {org ? organizationDisplayName(org) : <span className="text-muted-foreground">Unknown org</span>}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {roleName && <Badge variant="secondary" className="text-xs">{roleName}</Badge>}
                                        {spec && <span className="text-xs text-muted-foreground">{spec}</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => role.id && handleDelete(role.id)}
                                    disabled={deleting === role.id}
                                    aria-label="Remove role"
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
