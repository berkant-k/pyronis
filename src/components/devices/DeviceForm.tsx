"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Cpu, Hash, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    createDevice,
    updateDevice,
    searchLocations,
    searchOrganizations,
    locationDisplayName,
    organizationDisplayName,
    type NewDeviceInput,
    type DeviceFormState,
} from "@/lib/fhir-client";
import type { Location, Organization } from "@medplum/fhirtypes";
import config from "@/lib/config.json";

interface Props {
    mode: "create" | "edit";
    deviceId?: string;
    defaultValues?: DeviceFormState;
}

const EMPTY: DeviceFormState = {
    name: "",
    identifier: "",
    status: "active",
    type: "",
    manufacturer: "",
    modelNumber: "",
    serialNumber: "",
    udi: "",
    ownerOrgId: "",
    ownerOrgName: "",
    locationId: "",
    locationName: "",
    note: "",
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

export function DeviceForm({ mode, deviceId, defaultValues }: Props) {
    const router = useRouter();
    const [form, setForm] = useState<DeviceFormState>(defaultValues ?? EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nameError, setNameError] = useState(false);

    const set = (field: keyof DeviceFormState, value: string) =>
        setForm((f) => ({ ...f, [field]: value }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) { setNameError(true); return; }
        setNameError(false);
        setSaving(true);
        setError(null);
        try {
            const input: NewDeviceInput = {
                name:         form.name,
                identifier:   form.identifier || undefined,
                status:       (form.status || "active") as NewDeviceInput["status"],
                type:         form.type || undefined,
                manufacturer: form.manufacturer || undefined,
                modelNumber:  form.modelNumber || undefined,
                serialNumber: form.serialNumber || undefined,
                udi:          form.udi || undefined,
                ownerOrgId:   form.ownerOrgId || undefined,
                locationId:   form.locationId || undefined,
                note:         form.note || undefined,
            };
            if (mode === "create") {
                const created = await createDevice(input);
                router.push(`/devices/${created.id}`);
            } else {
                await updateDevice(deviceId!, input);
                router.push(`/devices/${deviceId}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save device.");
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

            <Card className="relative z-10">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Cpu className="h-4 w-4 text-primary" />
                        Device Details
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
                            placeholder="e.g. Philips IntelliVue MX700"
                            className={cn("mt-1.5", nameError && "border-red-400 focus-visible:ring-red-400")}
                        />
                        {nameError && <p className="mt-1 text-xs text-red-500">Name is required.</p>}
                    </div>

                    {/* Identifier + Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="identifier" className="text-xs font-medium">
                                <span className="inline-flex items-center gap-1.5">
                                    <Hash className="h-3 w-3" />
                                    Asset / Device Code
                                </span>
                            </Label>
                            <Input
                                id="identifier"
                                value={form.identifier}
                                onChange={(e) => set("identifier", e.target.value)}
                                placeholder="e.g. DEV-ICU-01"
                                className="mt-1.5 font-mono"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Status</Label>
                            <Select value={form.status} onValueChange={(v) => set("status", v ?? "active")}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="entered-in-error">Entered in Error</SelectItem>
                                    <SelectItem value="unknown">Unknown</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Type */}
                    <div>
                        <Label className="text-xs font-medium">Device Type</Label>
                        <Select value={form.type} onValueChange={(v) => set("type", v ?? "")}>
                            <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select type…" />
                            </SelectTrigger>
                            <SelectContent>
                                {config.fhir.options.deviceType.map((opt) => (
                                    <SelectItem key={opt.code} value={opt.code}>{opt.display}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Manufacturer + Model */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="manufacturer" className="text-xs font-medium">Manufacturer</Label>
                            <Input
                                id="manufacturer"
                                value={form.manufacturer}
                                onChange={(e) => set("manufacturer", e.target.value)}
                                placeholder="e.g. Philips, GE, Siemens"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="modelNumber" className="text-xs font-medium">Model Number</Label>
                            <Input
                                id="modelNumber"
                                value={form.modelNumber}
                                onChange={(e) => set("modelNumber", e.target.value)}
                                placeholder="e.g. MX700"
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    {/* Serial + UDI */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="serialNumber" className="text-xs font-medium">Serial Number</Label>
                            <Input
                                id="serialNumber"
                                value={form.serialNumber}
                                onChange={(e) => set("serialNumber", e.target.value)}
                                placeholder="Manufacturer serial"
                                className="mt-1.5 font-mono"
                            />
                        </div>
                        <div>
                            <Label htmlFor="udi" className="text-xs font-medium">UDI (Human-Readable)</Label>
                            <Input
                                id="udi"
                                value={form.udi}
                                onChange={(e) => set("udi", e.target.value)}
                                placeholder="Universal Device Identifier"
                                className="mt-1.5 font-mono"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Owner org + Location */}
                    <SearchPicker<Organization>
                        label="Owner Organization"
                        value={form.ownerOrgName || (form.ownerOrgId ? `Organization/${form.ownerOrgId}` : "")}
                        placeholder="Search organization…"
                        onSearch={(q) => searchOrganizations(q)}
                        getLabel={(org) => organizationDisplayName(org)}
                        onSelect={(org) => { set("ownerOrgId", org.id ?? ""); set("ownerOrgName", organizationDisplayName(org)); }}
                        onClear={() => { set("ownerOrgId", ""); set("ownerOrgName", ""); }}
                    />
                    <SearchPicker<Location>
                        label="Current Location"
                        value={form.locationName || (form.locationId ? `Location/${form.locationId}` : "")}
                        placeholder="Search location…"
                        onSearch={(q) => searchLocations(q)}
                        getLabel={(loc) => locationDisplayName(loc)}
                        onSelect={(loc) => { set("locationId", loc.id ?? ""); set("locationName", locationDisplayName(loc)); }}
                        onClear={() => { set("locationId", ""); set("locationName", ""); }}
                    />

                    {/* Notes */}
                    <div>
                        <Label htmlFor="note" className="text-xs font-medium">Notes</Label>
                        <Textarea
                            id="note"
                            value={form.note}
                            onChange={(e) => set("note", e.target.value)}
                            placeholder="Maintenance notes, calibration info, etc."
                            rows={2}
                            className="mt-1.5 resize-none"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-2 pb-6">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                    Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : mode === "create" ? "Add Device" : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}
