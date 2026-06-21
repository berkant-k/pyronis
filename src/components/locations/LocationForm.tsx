"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MapPin, Hash, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    createLocation,
    updateLocation,
    searchLocations,
    searchOrganizations,
    locationDisplayName,
    organizationDisplayName,
    type NewLocationInput,
    type LocationFormState,
} from "@/lib/fhir-client";
import type { Location, Organization } from "@medplum/fhirtypes";
import config from "@/lib/config.json";
import { COUNTRIES } from "@/lib/countries";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    mode: "create" | "edit";
    locationId?: string;
    defaultValues?: LocationFormState;
}

const EMPTY: LocationFormState = {
    identifier: "",
    name: "",
    description: "",
    status: "active",
    physicalType: "",
    type: "",
    partOfId: "",
    partOfName: "",
    managingOrganizationId: "",
    managingOrganizationName: "",
    addressText: "",
    addressCity: "",
    addressCountry: "",
    phone: "",
};

// ─── Search picker ────────────────────────────────────────────────────────────

function SearchPicker<T>({
    label,
    value,
    placeholder,
    onSearch,
    getLabel,
    onSelect,
    onClear,
}: {
    label: string;
    value: string;
    placeholder: string;
    onSearch: (q: string) => Promise<T[]>;
    getLabel: (item: T) => string;
    onSelect: (item: T) => void;
    onClear: () => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<T[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSearch = useCallback(async (q: string) => {
        setQuery(q);
        if (q.length < 2) { setResults([]); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await onSearch(q);
            setResults(res);
            setOpen(true);
        } finally {
            setLoading(false);
        }
    }, [onSearch]);

    if (value) {
        return (
            <div>
                <Label className="text-xs font-medium">{label}</Label>
                <div className="mt-1.5 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="flex-1 truncate">{value}</span>
                    <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <Label className="text-xs font-medium">{label}</Label>
            <div className="relative mt-1.5">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-8 text-sm"
                />
                {loading && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">searching…</span>
                )}
            </div>
            {open && results.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-auto">
                    {results.map((item, i) => (
                        <li key={i}>
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                onClick={() => { onSelect(item); setOpen(false); setQuery(""); setResults([]); }}
                            >
                                {getLabel(item)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function LocationForm({ mode, locationId, defaultValues }: Props) {
    const router = useRouter();
    const [form, setForm] = useState<LocationFormState>(defaultValues ?? EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nameError, setNameError] = useState(false);

    const set = (field: keyof LocationFormState, value: string) =>
        setForm((f) => ({ ...f, [field]: value }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) { setNameError(true); return; }
        setNameError(false);
        setSaving(true);
        setError(null);
        try {
            const input: NewLocationInput = {
                name:                   form.name,
                identifier:             form.identifier || undefined,
                description:            form.description || undefined,
                status:                 (form.status || "active") as NewLocationInput["status"],
                physicalType:           form.physicalType || undefined,
                type:                   form.type || undefined,
                partOfId:               form.partOfId || undefined,
                managingOrganizationId: form.managingOrganizationId || undefined,
                addressText:            form.addressText || undefined,
                addressCity:            form.addressCity || undefined,
                addressCountry:         form.addressCountry || undefined,
                phone:                  form.phone || undefined,
            };
            if (mode === "create") {
                const created = await createLocation(input);
                router.push(`/locations/${created.id}`);
            } else {
                await updateLocation(locationId!, input);
                router.push(`/locations/${locationId}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save location.");
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* ── Combined details + status + hierarchy panel ── */}
            <Card className="relative z-10">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-primary" />
                        Location Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Name */}
                    <div>
                        <Label htmlFor="name" className="text-xs font-medium">
                            Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => { set("name", e.target.value); if (nameError) setNameError(false); }}
                            placeholder="e.g. Ward 4B, ICU Room 3, Bed 12"
                            className={cn("mt-1.5", nameError && "border-red-400 focus-visible:ring-red-400")}
                        />
                        {nameError && <p className="mt-1 text-xs text-red-500">Name is required.</p>}
                    </div>

                    {/* Identifier */}
                    <div>
                        <Label htmlFor="identifier" className="text-xs font-medium">
                            <span className="inline-flex items-center gap-1.5">
                                <Hash className="h-3 w-3" />
                                Location Code / Identifier
                            </span>
                        </Label>
                        <Input
                            id="identifier"
                            value={form.identifier}
                            onChange={(e) => set("identifier", e.target.value)}
                            placeholder="e.g. ICU-04, BED-12, WARD-B"
                            className="mt-1.5 font-mono"
                        />
                    </div>

                    {/* Physical type + Clinical type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs font-medium">Physical Type</Label>
                            <Select
                                value={form.physicalType}
                                onValueChange={(v) => set("physicalType", v ?? "")}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select type…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {config.fhir.options.locationPhysicalType.map((opt) => (
                                        <SelectItem key={opt.code} value={opt.code}>
                                            {opt.display}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Clinical Type</Label>
                            <Select
                                value={form.type}
                                onValueChange={(v) => set("type", v ?? "")}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select type…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {config.fhir.options.locationType.map((opt) => (
                                        <SelectItem key={opt.code} value={opt.code}>
                                            {opt.display}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <Label className="text-xs font-medium">Status</Label>
                        <Select
                            value={form.status}
                            onValueChange={(v) => set("status", v ?? "active")}
                        >
                            <SelectTrigger className="mt-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description" className="text-xs font-medium">Description</Label>
                        <Textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            placeholder="Optional description…"
                            rows={2}
                            className="mt-1.5 resize-none"
                        />
                    </div>

                    <Separator />

                    {/* Hierarchy */}
                    <SearchPicker<Location>
                        label="Parent Location"
                        value={form.partOfName || (form.partOfId ? `Location/${form.partOfId}` : "")}
                        placeholder="Search parent location…"
                        onSearch={(q) => searchLocations(q)}
                        getLabel={(loc) => locationDisplayName(loc)}
                        onSelect={(loc) => {
                            set("partOfId", loc.id ?? "");
                            set("partOfName", locationDisplayName(loc));
                        }}
                        onClear={() => { set("partOfId", ""); set("partOfName", ""); }}
                    />
                    <SearchPicker<Organization>
                        label="Managing Organization"
                        value={form.managingOrganizationName || (form.managingOrganizationId ? `Organization/${form.managingOrganizationId}` : "")}
                        placeholder="Search organization…"
                        onSearch={(q) => searchOrganizations(q)}
                        getLabel={(org) => organizationDisplayName(org)}
                        onSelect={(org) => {
                            set("managingOrganizationId", org.id ?? "");
                            set("managingOrganizationName", organizationDisplayName(org));
                        }}
                        onClear={() => { set("managingOrganizationId", ""); set("managingOrganizationName", ""); }}
                    />

                    <Separator />

                    {/* Contact & Address */}
                    <div>
                        <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            placeholder="+974 4000 0000"
                            className="mt-1.5"
                        />
                    </div>
                    <div>
                        <Label htmlFor="addressText" className="text-xs font-medium">Street / Building</Label>
                        <Input
                            id="addressText"
                            value={form.addressText}
                            onChange={(e) => set("addressText", e.target.value)}
                            placeholder="Building name or street"
                            className="mt-1.5"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="city" className="text-xs font-medium">City</Label>
                            <Input
                                id="city"
                                value={form.addressCity}
                                onChange={(e) => set("addressCity", e.target.value)}
                                placeholder="Doha"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Country</Label>
                            <Select
                                value={form.addressCountry}
                                onValueChange={(v) => set("addressCountry", v ?? "")}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select country…" />
                                </SelectTrigger>
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

            {/* ── Actions ── */}
            <div className="flex justify-end gap-3 pt-2 pb-6">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={saving}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : mode === "create" ? "Create Location" : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}
