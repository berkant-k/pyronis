"use client"

import { useState, useLayoutEffect } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  createRelatedPerson,
  updateRelatedPerson,
  RELATED_PERSON_RELATIONSHIP_DISPLAY,
  relatedPersonDisplayName,
  relatedPersonRelationship,
} from "@/lib/fhir-client"
import type { RelatedPersonInput } from "@/lib/fhir-client"
import type { RelatedPerson } from "@medplum/fhirtypes"

interface FormState {
  relationship: string
  givenName:    string
  familyName:   string
  gender:       string
  birthDate:    string
  phone:        string
  email:        string
  address:      string
  note:         string
}

const DEFAULT: FormState = {
  relationship: "",
  givenName:    "",
  familyName:   "",
  gender:       "",
  birthDate:    "",
  phone:        "",
  email:        "",
  address:      "",
  note:         "",
}

function fromResource(r: RelatedPerson): FormState {
  const n     = r.name?.[0]
  const phone = r.telecom?.find((t) => t.system === "phone")?.value ?? ""
  const email = r.telecom?.find((t) => t.system === "email")?.value ?? ""
  return {
    relationship: r.relationship?.[0]?.coding?.[0]?.code ?? "",
    givenName:    n?.given?.join(" ") ?? "",
    familyName:   n?.family ?? "",
    gender:       r.gender ?? "",
    birthDate:    r.birthDate ?? "",
    phone,
    email,
    address:      r.address?.[0]?.text ?? "",
    note:         "",
  }
}

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  patientId:    string
  person?:      RelatedPerson
  onSuccess:    (saved: RelatedPerson) => void
  patient?:     PatientInfo
}

export function RelatedPersonFormDialog({ open, onOpenChange, patientId, person, onSuccess, patient }: Props) {
  const [form, setForm]     = useState<FormState>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const isEdit = !!person

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return
    setError(null)
    setForm(person ? fromResource(person) : DEFAULT)
  }, [open, person])
  /* eslint-enable react-hooks/set-state-in-effect */

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.relationship)          { setError("Relationship is required"); return }
    if (!form.givenName.trim() && !form.familyName.trim()) { setError("At least a first or last name is required"); return }
    setSaving(true)
    setError(null)
    try {
      const input: RelatedPersonInput = {
        patientId,
        relationship: form.relationship,
        givenName:    form.givenName.trim(),
        familyName:   form.familyName.trim(),
        gender:       form.gender || undefined,
        birthDate:    form.birthDate || undefined,
        phone:        form.phone.trim() || undefined,
        email:        form.email.trim() || undefined,
        address:      form.address.trim() || undefined,
      }
      const saved = isEdit
        ? await updateRelatedPerson(person!.id!, input)
        : await createRelatedPerson(input)
      onSuccess(saved)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            {isEdit ? `Edit — ${relatedPersonDisplayName(person!)} (${relatedPersonRelationship(person!)})` : "Add Contact / Next of Kin"}
          </DialogTitle>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form id="rp-form" onSubmit={handleSubmit} className="space-y-4">

          {/* Relationship */}
          <div className="space-y-1.5">
            <Label>Relationship *</Label>
            <Select value={form.relationship} onValueChange={(v) => set("relationship", v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select relationship…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(RELATED_PERSON_RELATIONSHIP_DISPLAY).map(([code, label]) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-given">First Name</Label>
              <Input
                id="rp-given"
                value={form.givenName}
                onChange={(e) => set("givenName", e.target.value)}
                placeholder="Given name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-family">Last Name</Label>
              <Input
                id="rp-family"
                value={form.familyName}
                onChange={(e) => set("familyName", e.target.value)}
                placeholder="Family name"
              />
            </div>
          </div>

          {/* Gender + DOB */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unknown</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-dob">Date of Birth</Label>
              <Input
                id="rp-dob"
                type="date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-phone">Phone</Label>
              <Input
                id="rp-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+974 XXXX XXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-email">Email</Label>
              <Input
                id="rp-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="rp-address">Address</Label>
            <Input
              id="rp-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street, city, country"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </form>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </button>
          <button type="submit" form="rp-form" disabled={saving} className={cn(buttonVariants(), "gap-2")}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Add contact"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
