"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    createOrganization,
    updateOrganization,
    searchOrganizations,
    ORG_TYPE_OPTIONS,
    type NewOrganizationInput,
    type OrganizationFormState,
} from "@/lib/fhir-client";
import { COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Building2, Phone, MapPin, ShieldCheck, Hash } from "lucide-react";
import type { Organization } from "@medplum/fhirtypes";

const EMPTY: OrganizationFormState = {
    active: true,
    name: "",
    type: "",
    identifier: "",
    partOfId: "",
    partOfName: "",
    phone: "",
    email: "",
    addressText: "",
    addressCity: "",
    addressCountry: "",
};

interface Props {
    mode: "create" | "edit";
    organizationId?: string;
    defaultValues?: OrganizationFormState;
}

export function OrganizationForm({ mode, organizationId, defaultValues }: Props) {
    const router = useRouter();
    const [form, setForm] = useState<OrganizationFormState>(defaultValues ?? EMPTY);
    const [nameError, setNameError] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [allOrgs, setAllOrgs] = useState<Organization[]>([]);

    const cancelHref = mode === "edit" && organizationId
        ? `/organizations/${organizationId}`
        : "/organizations";

    useEffect(() => {
        searchOrganizations().then(setAllOrgs).catch(() => {});
    }, []);

    function set(field: keyof OrganizationFormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) { setNameError("Organization name is required"); return; }
        setNameError(null);

        const input: NewOrganizationInput = {
            active: form.active,
            name: form.name.trim(),
            type: form.type || undefined,
            identifier: form.identifier.trim() || undefined,
            partOfId: form.partOfId || undefined,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            addressText: form.addressText.trim() || undefined,
            addressCity: form.addressCity.trim() || undefined,
            addressCountry: form.addressCountry || undefined,
        };

        setSubmitting(true);
        setServerError(null);
        try {
            if (mode === "edit" && organizationId) {
                await updateOrganization(organizationId, input);
                router.push(`/organizations/${organizationId}`);
            } else {
                const o = await createOrganization(input);
                router.push(`/organizations/${o.id}`);
            }
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "Save failed");
            setSubmitting(false);
        }
    }

    const parentOptions = allOrgs.filter((o) => o.id !== organizationId && o.name);

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {serverError && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{serverError}</span>
                </div>
            )}

            {/* Status */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 max-w-xs">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className={`h-4 w-4 ${form.active ? "text-green-500" : "text-muted-foreground"}`} />
                            <div>
                                <p className="text-sm font-medium">Active</p>
                                <p className="text-xs text-muted-foreground">Visible in directory and dropdowns</p>
                            </div>
                        </div>
                        <Switch
                            checked={form.active}
                            onCheckedChange={(v) => setForm((prev) => ({ ...prev, active: v }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Identity */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4" /> Identity
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="space-y-1.5">
                        <Label>Name <span className="text-destructive">*</span></Label>
                        <Input
                            value={form.name}
                            onChange={(e) => { set("name", e.target.value); setNameError(null); }}
                            placeholder="e.g. Cardiology Department"
                            className={nameError ? "border-destructive" : ""}
                        />
                        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => set("type", v ?? "")}>
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    {ORG_TYPE_OPTIONS.map((o) => (
                                        <SelectItem key={o.code} value={o.code}>{o.display}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Parent Organization</Label>
                            <Select value={form.partOfId} onValueChange={(v) => set("partOfId", v ?? "")}>
                                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">None (top-level)</SelectItem>
                                    {parentOptions.map((o) => (
                                        <SelectItem key={o.id} value={o.id!}>{o.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Identifier */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Hash className="h-4 w-4" /> Identifier
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                    <div className="space-y-1.5">
                        <Label>Licence / HIN Number</Label>
                        <Input
                            value={form.identifier}
                            onChange={(e) => set("identifier", e.target.value)}
                            placeholder="e.g. HIN-00123"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Contact */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Phone className="h-4 w-4" /> Contact
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 pb-5">
                    <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            placeholder="+974 4444 5678"
                            type="tel"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            placeholder="info@org.qa"
                            type="email"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Address */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4" /> Address
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="space-y-1.5">
                        <Label>Street / Building</Label>
                        <Input
                            value={form.addressText}
                            onChange={(e) => set("addressText", e.target.value)}
                            placeholder="e.g. Al Rayyan Road, Building 3"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>City</Label>
                            <Input
                                value={form.addressCity}
                                onChange={(e) => set("addressCity", e.target.value)}
                                placeholder="e.g. Doha"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Country</Label>
                            <Select value={form.addressCountry} onValueChange={(v) => set("addressCountry", v ?? "")}>
                                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                                <SelectContent>
                                    {COUNTRIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="flex gap-3 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
                    Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === "create" ? "Create Organization" : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}
