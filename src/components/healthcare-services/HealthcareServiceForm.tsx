"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Hospital, Hash, Search, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    createHealthcareService,
    updateHealthcareService,
    searchLocations,
    searchOrganizations,
    locationDisplayName,
    organizationDisplayName,
    PRACTITIONER_SPECIALTIES,
    type NewHealthcareServiceInput,
    type HealthcareServiceFormState,
} from "@/lib/fhir-client";
import type { Location, Organization } from "@medplum/fhirtypes";
import config from "@/lib/config.json";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    mode: "create" | "edit";
    serviceId?: string;
    defaultValues?: HealthcareServiceFormState;
}

const DAYS: { code: string; label: string }[] = [
    { code: "mon", label: "M" },
    { code: "tue", label: "T" },
    { code: "wed", label: "W" },
    { code: "thu", label: "T" },
    { code: "fri", label: "F" },
    { code: "sat", label: "S" },
    { code: "sun", label: "S" },
];

const EMPTY: HealthcareServiceFormState = {
    name: "",
    identifier: "",
    active: true,
    comment: "",
    category: "",
    specialty: "",
    providedByOrgId: "",
    providedByOrgName: "",
    locationId: "",
    locationName: "",
    phone: "",
    availDays: [],
    availStartTime: "",
    availEndTime: "",
    availabilityExceptions: "",
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

export function HealthcareServiceForm({ mode, serviceId, defaultValues }: Props) {
    const router = useRouter();
    const [form, setForm] = useState<HealthcareServiceFormState>(defaultValues ?? EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nameError, setNameError] = useState(false);

    const set = <K extends keyof HealthcareServiceFormState>(field: K, value: HealthcareServiceFormState[K]) =>
        setForm((f) => ({ ...f, [field]: value }));

    function toggleDay(code: string) {
        setForm((f) => ({
            ...f,
            availDays: f.availDays.includes(code)
                ? f.availDays.filter((d) => d !== code)
                : [...f.availDays, code],
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) { setNameError(true); return; }
        setNameError(false);
        setSaving(true);
        setError(null);
        try {
            const input: NewHealthcareServiceInput = {
                name:                   form.name,
                identifier:             form.identifier || undefined,
                active:                 form.active,
                comment:                form.comment || undefined,
                category:               form.category || undefined,
                specialty:              form.specialty || undefined,
                providedByOrgId:        form.providedByOrgId || undefined,
                locationId:             form.locationId || undefined,
                phone:                  form.phone || undefined,
                availDays:              form.availDays.length ? form.availDays : undefined,
                availStartTime:         form.availStartTime || undefined,
                availEndTime:           form.availEndTime || undefined,
                availabilityExceptions: form.availabilityExceptions || undefined,
            };
            if (mode === "create") {
                const created = await createHealthcareService(input);
                router.push(`/healthcare-services/${created.id}`);
            } else {
                await updateHealthcareService(serviceId!, input);
                router.push(`/healthcare-services/${serviceId}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save service.");
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
                        <Hospital className="h-4 w-4 text-primary" />
                        Service Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Active toggle */}
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className={cn("h-4 w-4", form.active ? "text-green-500" : "text-muted-foreground")} />
                            <div>
                                <p className="text-sm font-medium">Active</p>
                                <p className="text-xs text-muted-foreground">Visible in directory and scheduling</p>
                            </div>
                        </div>
                        <Switch
                            checked={form.active}
                            onCheckedChange={(v) => set("active", v)}
                        />
                    </div>

                    {/* Name */}
                    <div>
                        <Label htmlFor="name" className="text-xs font-medium">
                            Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => { set("name", e.target.value); if (nameError) setNameError(false); }}
                            placeholder="e.g. Cardiology Outpatient Clinic"
                            className={cn("mt-1.5", nameError && "border-red-400 focus-visible:ring-red-400")}
                        />
                        {nameError && <p className="mt-1 text-xs text-red-500">Name is required.</p>}
                    </div>

                    {/* Identifier */}
                    <div>
                        <Label htmlFor="identifier" className="text-xs font-medium">
                            <span className="inline-flex items-center gap-1.5">
                                <Hash className="h-3 w-3" />
                                Service Code / Identifier
                            </span>
                        </Label>
                        <Input
                            id="identifier"
                            value={form.identifier}
                            onChange={(e) => set("identifier", e.target.value)}
                            placeholder="e.g. CARD-OP, LAB-01"
                            className="mt-1.5 font-mono"
                        />
                    </div>

                    {/* Category + Specialty */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs font-medium">Category</Label>
                            <Select value={form.category} onValueChange={(v) => set("category", v ?? "")}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select category…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {config.fhir.options.healthcareServiceCategory.map((opt) => (
                                        <SelectItem key={opt.code} value={opt.code}>{opt.display}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Specialty</Label>
                            <Select value={form.specialty} onValueChange={(v) => set("specialty", v ?? "")}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select specialty…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRACTITIONER_SPECIALTIES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <Label htmlFor="comment" className="text-xs font-medium">Description / Comment</Label>
                        <Textarea
                            id="comment"
                            value={form.comment}
                            onChange={(e) => set("comment", e.target.value)}
                            placeholder="Optional description of the service…"
                            rows={2}
                            className="mt-1.5 resize-none"
                        />
                    </div>

                    <Separator />

                    {/* Organization + Location */}
                    <SearchPicker<Organization>
                        label="Provided by Organization"
                        value={form.providedByOrgName || (form.providedByOrgId ? `Organization/${form.providedByOrgId}` : "")}
                        placeholder="Search organization…"
                        onSearch={(q) => searchOrganizations(q)}
                        getLabel={(org) => organizationDisplayName(org)}
                        onSelect={(org) => { set("providedByOrgId", org.id ?? ""); set("providedByOrgName", organizationDisplayName(org)); }}
                        onClear={() => { set("providedByOrgId", ""); set("providedByOrgName", ""); }}
                    />
                    <SearchPicker<Location>
                        label="Location"
                        value={form.locationName || (form.locationId ? `Location/${form.locationId}` : "")}
                        placeholder="Search location…"
                        onSearch={(q) => searchLocations(q)}
                        getLabel={(loc) => locationDisplayName(loc)}
                        onSelect={(loc) => { set("locationId", loc.id ?? ""); set("locationName", locationDisplayName(loc)); }}
                        onClear={() => { set("locationId", ""); set("locationName", ""); }}
                    />

                    {/* Phone */}
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

                    <Separator />

                    {/* Available days */}
                    <div>
                        <Label className="text-xs font-medium">Available Days</Label>
                        <div className="mt-2 flex gap-1.5">
                            {DAYS.map((d, i) => (
                                <button
                                    key={d.code}
                                    type="button"
                                    title={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}
                                    onClick={() => toggleDay(d.code)}
                                    className={cn(
                                        "h-8 w-8 rounded-full text-xs font-semibold transition-colors",
                                        form.availDays.includes(d.code)
                                            ? "bg-primary text-primary-foreground"
                                            : "border bg-muted text-muted-foreground hover:bg-muted/70"
                                    )}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Start / End time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="startTime" className="text-xs font-medium">Opening Time</Label>
                            <Input
                                id="startTime"
                                type="time"
                                value={form.availStartTime}
                                onChange={(e) => set("availStartTime", e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="endTime" className="text-xs font-medium">Closing Time</Label>
                            <Input
                                id="endTime"
                                type="time"
                                value={form.availEndTime}
                                onChange={(e) => set("availEndTime", e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    {/* Exceptions */}
                    <div>
                        <Label htmlFor="exceptions" className="text-xs font-medium">Availability Exceptions / Notes</Label>
                        <Textarea
                            id="exceptions"
                            value={form.availabilityExceptions}
                            onChange={(e) => set("availabilityExceptions", e.target.value)}
                            placeholder="e.g. Closed on public holidays. Reduced hours during Ramadan."
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
                    {saving ? "Saving…" : mode === "create" ? "Create Service" : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}
