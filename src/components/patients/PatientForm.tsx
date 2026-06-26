"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createPatient,
  updatePatient,
  generateNextMRN,
  PERSON_TYPE_OPTIONS,
  ETHNICITY_OPTIONS,
  type NewPatientInput,
  type PatientFormState,
} from "@/lib/fhir-client";
import { queryEmpiByQID, getEmpiBaseUrl } from "@/lib/empi-client";
import { COUNTRIES } from "@/lib/countries";
import {
  useInvalidatePatient,
  useInvalidatePatientSearch,
  useInvalidateDashboard,
} from "@/lib/query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Heart,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { PatientPhotoAvatar } from "@/components/patients/PatientPhotoAvatar";

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { code: "en", display: "English" },
  { code: "ar", display: "Arabic (العربية)" },
  { code: "hi", display: "Hindi (हिंदी)" },
  { code: "ur", display: "Urdu (اردو)" },
  { code: "tl", display: "Filipino / Tagalog" },
  { code: "ml", display: "Malayalam (മലയാളം)" },
  { code: "bn", display: "Bengali (বাংলা)" },
  { code: "ta", display: "Tamil (தமிழ்)" },
  { code: "ne", display: "Nepali (नेपाली)" },
  { code: "fr", display: "French (Français)" },
  { code: "de", display: "German (Deutsch)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormErrors {
  givenEn?: string;
  familyEn?: string;
  qid?: string;
  birthDate?: string;
  nationality?: string;
  gender?: string;
}

type EmpiStatus =
  | { type: "success"; name: string }
  | { type: "not-found" }
  | { type: "no-url" }
  | { type: "error"; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENDER_LABELS: Record<string, string> = {
  male: "Male", female: "Female", other: "Other", unknown: "Unknown",
};
const ADDR_LANG_LABELS: Record<string, string> = { en: "English", ar: "Arabic" };

function countryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
function optDisplay(opts: Array<{ code: string; display: string }>, code: string) {
  return opts.find((o) => o.code === code)?.display ?? code;
}

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const bd = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  const m = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  return age;
}

const EMPTY: PatientFormState = {
  mrn: "",
  active: true,
  vip: false,
  givenEn: "",
  middleEn: "",
  familyEn: "",
  givenAr: "",
  middleAr: "",
  familyAr: "",
  qid: "",
  passport: "",
  birthDate: "",
  nationality: "",
  gender: "",
  personType: "",
  ethnicity: "",
  birthPlaceCountry: "",
  birthPlaceCity: "",
  birthPlaceText: "",
  cadavericDonor: false,
  deceased: false,
  deceasedDateTime: "",
  insuranceCompany: "",
  addressCountry: "",
  addressCity: "",
  addressText: "",
  addressBuildingNumber: "",
  addressStreetNumber: "",
  addressUnit: "",
  addressZone: "",
  addressLang: "",
  phone: "",
  email: "",
  adminNotes: "",
  preferredLanguage: "",
};

function validate(f: PatientFormState): FormErrors {
  const e: FormErrors = {};
  if (!f.givenEn.trim()) e.givenEn = "Given name (English) is required";
  if (!f.familyEn.trim()) e.familyEn = "Family name (English) is required";
  if (!f.qid.trim()) {
    e.qid = "Qatar National ID is required";
  } else if (!/^\d{11}$/.test(f.qid.trim())) {
    e.qid = "QID must be exactly 11 digits";
  }
  if (!f.birthDate) e.birthDate = "Date of birth is required";
  if (!f.nationality) e.nationality = "Nationality is required";
  if (!f.gender) e.gender = "Gender is required";
  return e;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PatientFormProps {
  mode: "create" | "edit";
  patientId?: string;
  defaultValues?: PatientFormState;
  existingPhotoDataUrl?: string | null;
}

const STATUS_FIELDS = [
  { field: "active" as const,        label: "Active Patient",  short: "Active", icon: ShieldCheck, activeColor: "text-green-500" },
  { field: "vip" as const,           label: "VIP",             short: "VIP",    icon: Star,        activeColor: "text-amber-500" },
  { field: "cadavericDonor" as const, label: "Cadaveric Donor", short: "Donor",  icon: Heart,       activeColor: "text-rose-500" },
] as const;

export function PatientForm({ mode, patientId, defaultValues, existingPhotoDataUrl }: PatientFormProps) {
  const router = useRouter();
  const invalidatePatient = useInvalidatePatient();
  const invalidatePatientSearch = useInvalidatePatientSearch();
  const invalidateDashboard = useInvalidateDashboard();
  const [form, setForm]               = useState<PatientFormState>(defaultValues ?? EMPTY);
  const [errors, setErrors]           = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [mrnLoading, setMrnLoading]   = useState(mode === "create");
  const [activeTab, setActiveTab]     = useState("demographics");
  const empiUrl                       = getEmpiBaseUrl();
  const [empiQuerying, setEmpiQuerying] = useState(false);
  const [empiStatus, setEmpiStatus]   = useState<EmpiStatus | null>(null);

  const cancelHref = mode === "edit" && patientId ? `/patients/${patientId}` : "/patients";

  // Computed display values for the identity panel (edit mode)
  const initials      = [form.givenEn[0], form.familyEn[0]].filter(Boolean).join("").toUpperCase();
  const enDisplayName = [form.givenEn, form.middleEn, form.familyEn].filter(Boolean).join(" ");
  const arDisplayName = [form.givenAr, form.middleAr, form.familyAr].filter(Boolean).join(" ");
  const age           = calcAge(form.birthDate);

  useEffect(() => {
    if (mode !== "create") return;
    generateNextMRN().then((mrn) => {
      setForm((prev) => ({ ...prev, mrn }));
      setMrnLoading(false);
    });
  }, [mode]);

  function set(field: keyof PatientFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field in errors) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function setBool(field: "active" | "vip" | "cadavericDonor" | "deceased", value: boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleQueryEmpi() {
    if (!empiUrl) { setEmpiStatus({ type: "no-url" }); return; }
    if (!form.qid.trim()) return;
    setEmpiQuerying(true);
    setEmpiStatus(null);
    try {
      const empiState = await queryEmpiByQID(form.qid.trim(), empiUrl);
      if (!empiState) { setEmpiStatus({ type: "not-found" }); return; }
      // Merge eMPI demographics; preserve our system/admin fields
      const { mrn, active, vip, insuranceCompany, adminNotes, personType, cadavericDonor, deceased, deceasedDateTime, preferredLanguage } = form;
      const displayName = [empiState.givenEn, empiState.familyEn].filter(Boolean).join(" ");
      setForm({ ...empiState, mrn, active, vip, insuranceCompany, adminNotes, personType, cadavericDonor, deceased, deceasedDateTime, preferredLanguage });
      setEmpiStatus({ type: "success", name: displayName });
    } catch (err) {
      setEmpiStatus({ type: "error", message: err instanceof Error ? err.message : "eMPI query failed" });
    } finally {
      setEmpiQuerying(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Jump to the first tab containing an error
      if (errs.givenEn || errs.familyEn || errs.qid || errs.birthDate || errs.nationality || errs.gender) setActiveTab("demographics");
      return;
    }

    const country = COUNTRIES.find((c) => c.code === form.nationality);
    const input: NewPatientInput = {
      mrn:     form.mrn,
      active:  form.active,
      vip:     form.vip,
      givenEn:  form.givenEn.trim(),
      middleEn: form.middleEn.trim() || undefined,
      familyEn: form.familyEn.trim(),
      givenAr:  form.givenAr.trim() || undefined,
      middleAr: form.middleAr.trim() || undefined,
      familyAr: form.familyAr.trim() || undefined,
      qid:      form.qid.trim(),
      passport: form.passport.trim() || undefined,
      birthDate:          form.birthDate,
      nationality:        form.nationality,
      nationalityDisplay: country?.name ?? form.nationality,
      gender: form.gender as NewPatientInput["gender"],
      personType:    form.personType || undefined,
      ethnicity:     form.ethnicity || undefined,
      deceased:      form.deceased || undefined,
      deceasedDateTime: form.deceased && form.deceasedDateTime ? form.deceasedDateTime : undefined,
      birthPlaceCountry: form.birthPlaceCountry || undefined,
      birthPlaceCity:    form.birthPlaceCity.trim() || undefined,
      birthPlaceText:    form.birthPlaceText.trim() || undefined,
      cadavericDonor:    form.cadavericDonor || undefined,
      insuranceCompany:  form.insuranceCompany.trim() || undefined,
      addressCountry:    form.addressCountry || undefined,
      addressCity:       form.addressCity.trim() || undefined,
      addressText:       form.addressText.trim() || undefined,
      addressBuildingNumber: form.addressBuildingNumber.trim() || undefined,
      addressStreetNumber:   form.addressStreetNumber.trim() || undefined,
      addressUnit:           form.addressUnit.trim() || undefined,
      addressZone:           form.addressZone.trim() || undefined,
      addressLang:           form.addressLang || undefined,
      phone:           form.phone.trim() || undefined,
      email:           form.email.trim() || undefined,
      preferredLanguage: form.preferredLanguage || undefined,
      adminNotes:      form.adminNotes.trim() || undefined,
    };

    setSubmitting(true);
    setServerError(null);
    try {
      if (mode === "edit" && patientId) {
        await updatePatient(patientId, input);
        invalidatePatient(patientId);
        invalidateDashboard();
        router.push(`/patients/${patientId}`);
      } else {
        const patient = await createPatient(input);
        invalidatePatientSearch();
        invalidateDashboard();
        router.push(`/patients/${patient.id}`);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : mode === "edit" ? "Failed to update patient" : "Failed to create patient");
      setSubmitting(false);
    }
  }

  function hasTabError(tab: string) {
    if (tab === "demographics") return !!(errors.givenEn || errors.familyEn || errors.qid || errors.birthDate || errors.nationality || errors.gender);
    return false;
  }

  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {serverError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Edit mode: Identity panel ─────────────────────────────────── */}
      {mode === "edit" && patientId && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-5">
              {/* Clickable avatar → PatientPhotoDialog */}
              <div className="shrink-0">
                <PatientPhotoAvatar
                  patientId={patientId}
                  initials={initials || "?"}
                  initialPhotoUrl={existingPhotoDataUrl ?? null}
                  isActive={form.active}
                  isDeceased={form.deceased}
                />
              </div>

              {/* Name + demographics */}
              <div className="flex-1 min-w-0 space-y-0.5">
                {enDisplayName ? (
                  <h2 className="text-xl font-semibold leading-tight tracking-tight">{enDisplayName}</h2>
                ) : (
                  <p className="text-base italic text-muted-foreground">No name set</p>
                )}
                {arDisplayName && (
                  <p className="text-base text-muted-foreground" dir="rtl" lang="ar">{arDisplayName}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0 pt-1 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">MR-{form.mrn}</span>
                  {form.birthDate && (
                    <span>
                      {form.birthDate}
                      {age !== null ? ` · ${age}y` : ""}
                    </span>
                  )}
                  {form.gender && <span className="capitalize">{form.gender}</span>}
                </div>
              </div>

              {/* Status toggles */}
              <div className="flex flex-col gap-3 border-l pl-5 shrink-0">
                {STATUS_FIELDS.map(({ field, short, icon: Icon, activeColor }) => (
                  <div key={field} className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${form[field] ? activeColor : "text-muted-foreground"}`} />
                    <span className="w-10 text-xs text-muted-foreground">{short}</span>
                    <Switch
                      checked={form[field]}
                      onCheckedChange={(v) => setBool(field, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Create mode: MRN + status card ───────────────────────────── */}
      {mode === "create" && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-5 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Medical Record Number
              </p>
              <div className="mt-1">
                {mrnLoading ? (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                  </span>
                ) : (
                  <span className="font-mono text-2xl font-bold tracking-wider">MR-{form.mrn}</span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Auto-generated
              </div>
            </div>

            <div className="flex gap-6 border-l pl-6">
              {STATUS_FIELDS.map(({ field, label, icon: Icon, activeColor }) => (
                <div key={field} className="flex flex-col items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${form[field] ? activeColor : "text-muted-foreground"}`} />
                  <Switch
                    checked={form[field]}
                    onCheckedChange={(v) => setBool(field, v)}
                  />
                  <span className="text-center text-xs text-muted-foreground leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabbed sections ──────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v as string); }}>
        <TabsList className="w-full" variant="line">
          {(["demographics", "contact", "clinical"] as const).map((tab) => {
            const labels: Record<string, string> = {
              demographics: "Demographics",
              contact:      "Contact & Address",
              clinical:     "Clinical & Admin",
            };
            return (
              <TabsTrigger key={tab} value={tab} className="flex-1 gap-1.5">
                {labels[tab]}
                {hasTabError(tab) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── Demographics tab (names + identity) ── */}
        <TabsContent value="demographics" className="mt-5 space-y-5">
          {/* English name */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">English Name</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Given Name *" error={errors.givenEn}>
                <Input
                  value={form.givenEn}
                  onChange={(e) => set("givenEn", e.target.value)}
                  placeholder="e.g. Mohammed"
                />
              </Field>
              <Field label="Middle Name" error={undefined}>
                <Input
                  value={form.middleEn}
                  onChange={(e) => set("middleEn", e.target.value)}
                  placeholder="e.g. Ali"
                />
              </Field>
              <Field label="Family Name *" error={errors.familyEn}>
                <Input
                  value={form.familyEn}
                  onChange={(e) => set("familyEn", e.target.value)}
                  placeholder="e.g. Al-Dosari"
                />
              </Field>
            </div>
          </div>

          {/* Arabic name */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Arabic Name <span className="font-normal">(optional)</span></p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="الاسم الأول" error={undefined}>
                <Input dir="rtl" lang="ar" value={form.givenAr} onChange={(e) => set("givenAr", e.target.value)} placeholder="مثال: محمد" className="text-right" />
              </Field>
              <Field label="الاسم الأوسط" error={undefined}>
                <Input dir="rtl" lang="ar" value={form.middleAr} onChange={(e) => set("middleAr", e.target.value)} placeholder="مثال: علي" className="text-right" />
              </Field>
              <Field label="اسم العائلة" error={undefined}>
                <Input dir="rtl" lang="ar" value={form.familyAr} onChange={(e) => set("familyAr", e.target.value)} placeholder="مثال: الدوسري" className="text-right" />
              </Field>
            </div>
          </div>

          <Separator />

          {/* QID + eMPI */}
          <Field label="Qatar National ID (QID) *" error={errors.qid}>
            <div className="flex gap-2">
              <Input
                value={form.qid}
                onChange={(e) => {
                  set("qid", e.target.value.replace(/\D/g, "").slice(0, 11));
                  setEmpiStatus(null);
                }}
                placeholder="28500000000"
                inputMode="numeric"
                maxLength={11}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handleQueryEmpi}
                disabled={form.qid.trim().length === 0 || empiQuerying}
                title={!empiUrl ? "Configure eMPI URL in Settings first" : "Look up patient in eMPI"}
              >
                {empiQuerying
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Search className="h-3.5 w-3.5" />}
                {empiQuerying ? "Querying…" : "Query eMPI"}
              </Button>
            </div>
            <EmpiStatusMessage status={empiStatus} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Passport Number" error={undefined}>
              <Input
                value={form.passport}
                onChange={(e) => set("passport", e.target.value.toUpperCase())}
                placeholder="e.g. A1234567"
              />
            </Field>
            <Field label="Date of Birth *" error={errors.birthDate}>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                max={todayIso}
              />
            </Field>
            <Field label="Nationality *" error={errors.nationality}>
              <Select value={form.nationality} onValueChange={(v) => set("nationality", v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(v) => v ? countryName(String(v)) : "Select country"}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gender *" error={errors.gender}>
              <Select value={form.gender} onValueChange={(v) => set("gender", v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(v) => v ? (GENDER_LABELS[String(v)] ?? String(v)) : "Select gender"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Person Type" error={undefined}>
              <Select value={form.personType} onValueChange={(v) => set("personType", v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(v) => v ? optDisplay(PERSON_TYPE_OPTIONS, String(v)) : "Select person type"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PERSON_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.code} value={o.code}>{o.display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ethnicity" error={undefined}>
              <Select value={form.ethnicity} onValueChange={(v) => set("ethnicity", v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(v) => v ? optDisplay(ETHNICITY_OPTIONS, String(v)) : "Select ethnicity"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ETHNICITY_OPTIONS.map((o) => (
                    <SelectItem key={o.code} value={o.code}>{o.display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Separator />

          {/* Deceased */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.deceased}
                onCheckedChange={(v) => {
                  setBool("deceased", v);
                  if (!v) set("deceasedDateTime", "");
                }}
              />
              <Label className="cursor-pointer select-none">Patient is deceased</Label>
            </div>
            {form.deceased && (
              <div className="pl-0.5">
                <Field label="Date of Death" error={undefined}>
                  <Input
                    type="date"
                    value={form.deceasedDateTime}
                    onChange={(e) => set("deceasedDateTime", e.target.value)}
                    max={todayIso}
                    className="max-w-[220px]"
                  />
                </Field>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Contact & Address tab ── */}
        <TabsContent value="contact" className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mobile Phone" error={undefined}>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+974 5000 0000"
                inputMode="tel"
              />
            </Field>
            <Field label="Email" error={undefined}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="patient@example.com"
                inputMode="email"
              />
            </Field>
          </div>

          <Separator />

          <p className="text-sm font-medium text-muted-foreground">Address <span className="font-normal">(optional)</span></p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Country" error={undefined}>
                <Select value={form.addressCountry} onValueChange={(v) => set("addressCountry", v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>{(v) => v ? countryName(String(v)) : "Select country"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="City" error={undefined}>
                <Input
                  value={form.addressCity}
                  onChange={(e) => set("addressCity", e.target.value)}
                  placeholder="e.g. Doha"
                />
              </Field>
            </div>

            <Field label="Full Address" error={undefined}>
              <Input
                value={form.addressText}
                onChange={(e) => set("addressText", e.target.value)}
                placeholder="Street, district, building…"
              />
            </Field>

            <div className="grid grid-cols-4 gap-4">
              <Field label="Zone" error={undefined}>
                <Input value={form.addressZone} onChange={(e) => set("addressZone", e.target.value)} placeholder="e.g. 35" />
              </Field>
              <Field label="Street No." error={undefined}>
                <Input value={form.addressStreetNumber} onChange={(e) => set("addressStreetNumber", e.target.value)} placeholder="e.g. 920" />
              </Field>
              <Field label="Building No." error={undefined}>
                <Input value={form.addressBuildingNumber} onChange={(e) => set("addressBuildingNumber", e.target.value)} placeholder="e.g. 14" />
              </Field>
              <Field label="Unit / Flat" error={undefined}>
                <Input value={form.addressUnit} onChange={(e) => set("addressUnit", e.target.value)} placeholder="e.g. 3A" />
              </Field>
            </div>

            <Field label="Address Language" error={undefined}>
              <Select value={form.addressLang} onValueChange={(v) => set("addressLang", v ?? "")}>
                <SelectTrigger className="max-w-[220px]">
                  <SelectValue>{(v) => v ? (ADDR_LANG_LABELS[String(v)] ?? String(v)) : "Select language"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </TabsContent>

        {/* ── Clinical & Admin tab ── */}
        <TabsContent value="clinical" className="mt-5 space-y-5">
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Birth Place <span className="font-normal">(optional)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Country of Birth" error={undefined}>
                <Select value={form.birthPlaceCountry} onValueChange={(v) => set("birthPlaceCountry", v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>{(v) => v ? countryName(String(v)) : "Select country"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="City of Birth" error={undefined}>
                <Input
                  value={form.birthPlaceCity}
                  onChange={(e) => set("birthPlaceCity", e.target.value)}
                  placeholder="e.g. Doha"
                />
              </Field>
            </div>
            <Field label="Birth Place Description" error={undefined}>
              <Input
                value={form.birthPlaceText}
                onChange={(e) => set("birthPlaceText", e.target.value)}
                placeholder="Free-text description of birth location"
              />
            </Field>
          </div>

          <Separator />

          <Field label="Preferred Communication Language" error={undefined}>
            <Select value={form.preferredLanguage} onValueChange={(v) => set("preferredLanguage", v ?? "")}>
              <SelectTrigger className="max-w-[320px]">
                <SelectValue>{(v) => v ? optDisplay(LANGUAGE_OPTIONS, String(v)) : "Select language"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Not specified —</SelectItem>
                {LANGUAGE_OPTIONS.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.display}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Main Insurance Company" error={undefined}>
            <Input
              value={form.insuranceCompany}
              onChange={(e) => set("insuranceCompany", e.target.value)}
              placeholder="e.g. Qatar Insurance Company"
            />
          </Field>

          <Separator />

          <Field label="Administrative Notes" error={undefined}>
            <Textarea
              value={form.adminNotes}
              onChange={(e) => set("adminNotes", e.target.value)}
              placeholder="Internal notes visible only to administrative staff…"
              rows={4}
              className="resize-none"
            />
          </Field>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(cancelHref)}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || mrnLoading}
          className="min-w-32"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "edit" ? "Saving…" : "Creating…"}
            </>
          ) : mode === "edit" ? "Save Changes" : "Create Patient"}
        </Button>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={error ? "text-destructive" : ""}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function EmpiStatusMessage({ status }: { status: EmpiStatus | null }) {
  if (!status) {
    return <p className="mt-1 text-xs text-muted-foreground">11-digit national identifier</p>;
  }
  if (status.type === "success") {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        Patient found: <strong>{status.name}</strong> — demographics pre-filled. Review before saving.
      </p>
    );
  }
  if (status.type === "not-found") {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        No patient found in eMPI with this QID.
      </p>
    );
  }
  if (status.type === "no-url") {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        eMPI server not configured. Go to{" "}
        <a href="/settings" className="underline underline-offset-2">Settings</a> to set it up.
      </p>
    );
  }
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {status.message}
    </p>
  );
}
