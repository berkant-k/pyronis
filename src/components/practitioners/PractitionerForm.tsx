"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    createPractitioner,
    updatePractitioner,
    PRACTITIONER_SPECIALTIES,
    PRACTITIONER_QUALIFICATIONS,
    type NewPractitionerInput,
    type PractitionerFormState,
} from "@/lib/fhir-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, User, Phone, Award, ShieldCheck } from "lucide-react";

const EMPTY: PractitionerFormState = {
    active: true,
    givenName: "",
    familyName: "",
    gender: "",
    birthDate: "",
    phone: "",
    email: "",
    licenceNumber: "",
    qualificationText: "",
    specialty: "",
};

interface FormErrors {
    givenName?: string;
    familyName?: string;
}

interface Props {
    mode: "create" | "edit";
    practitionerId?: string;
    defaultValues?: PractitionerFormState;
}

export function PractitionerForm({ mode, practitionerId, defaultValues }: Props) {
    const router = useRouter();
    const [form, setForm] = useState<PractitionerFormState>(defaultValues ?? EMPTY);
    const [errors, setErrors] = useState<FormErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const cancelHref = mode === "edit" && practitionerId
        ? `/practitioners/${practitionerId}`
        : "/practitioners";

    function set(field: keyof PractitionerFormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field in errors) setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs: FormErrors = {};
        if (!form.givenName.trim()) errs.givenName = "Given name is required";
        if (!form.familyName.trim()) errs.familyName = "Family name is required";
        if (Object.keys(errs).length) { setErrors(errs); return; }

        const input: NewPractitionerInput = {
            active: form.active,
            givenName: form.givenName.trim(),
            familyName: form.familyName.trim(),
            gender: (form.gender || undefined) as NewPractitionerInput["gender"],
            birthDate: form.birthDate || undefined,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            licenceNumber: form.licenceNumber.trim() || undefined,
            qualificationText: form.qualificationText || undefined,
            specialty: form.specialty || undefined,
        };

        setSubmitting(true);
        setServerError(null);
        try {
            if (mode === "edit" && practitionerId) {
                await updatePractitioner(practitionerId, input);
                router.push(`/practitioners/${practitionerId}`);
            } else {
                const p = await createPractitioner(input);
                router.push(`/practitioners/${p.id}`);
            }
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "Save failed");
            setSubmitting(false);
        }
    }

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
                                <p className="text-xs text-muted-foreground">Record is active and selectable</p>
                            </div>
                        </div>
                        <Switch
                            checked={form.active}
                            onCheckedChange={(v) => setForm((prev) => ({ ...prev, active: v }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Name & Demographics */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <User className="h-4 w-4" /> Identity
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Given Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.givenName}
                                onChange={(e) => set("givenName", e.target.value)}
                                placeholder="e.g. Mohammed"
                                className={errors.givenName ? "border-destructive" : ""}
                            />
                            {errors.givenName && <p className="text-xs text-destructive">{errors.givenName}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Family Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.familyName}
                                onChange={(e) => set("familyName", e.target.value)}
                                placeholder="e.g. Al-Rashid"
                                className={errors.familyName ? "border-destructive" : ""}
                            />
                            {errors.familyName && <p className="text-xs text-destructive">{errors.familyName}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Gender</Label>
                            <Select value={form.gender} onValueChange={(v) => set("gender", v ?? "")}>
                                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                    <SelectItem value="unknown">Unknown</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Date of Birth</Label>
                            <Input
                                type="date"
                                value={form.birthDate}
                                onChange={(e) => set("birthDate", e.target.value)}
                            />
                        </div>
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
                            placeholder="+974 5555 1234"
                            type="tel"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            placeholder="doctor@hospital.qa"
                            type="email"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Qualification & Specialty */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Award className="h-4 w-4" /> Qualification & Specialty
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Qualification</Label>
                            <Select value={form.qualificationText} onValueChange={(v) => set("qualificationText", v ?? "")}>
                                <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                                <SelectContent>
                                    {PRACTITIONER_QUALIFICATIONS.map((q) => (
                                        <SelectItem key={q} value={q}>{q}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Licence Number</Label>
                            <Input
                                value={form.licenceNumber}
                                onChange={(e) => set("licenceNumber", e.target.value)}
                                placeholder="e.g. QMC-12345"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Specialty</Label>
                        <Select value={form.specialty} onValueChange={(v) => set("specialty", v ?? "")}>
                            <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                            <SelectContent>
                                {PRACTITIONER_SPECIALTIES.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                    {mode === "create" ? "Create Practitioner" : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}
