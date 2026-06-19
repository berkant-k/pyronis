"use client"

import { useState } from "react"
import { UserPlus, Phone, Mail, MapPin, Pencil } from "lucide-react"
import type { RelatedPerson } from "@medplum/fhirtypes"
import { relatedPersonDisplayName, relatedPersonRelationship } from "@/lib/fhir-client"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RelatedPersonFormDialog } from "./RelatedPersonFormDialog"
import type { PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  initialPersons: RelatedPerson[]
  patientId:      string
  patient?:       PatientInfo
}

export function PatientRelatedPersonsTab({ initialPersons, patientId, patient }: Props) {
  const [persons, setPersons]       = useState<RelatedPerson[]>(initialPersons)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RelatedPerson | undefined>(undefined)

  function handleSuccess(saved: RelatedPerson) {
    setPersons((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  function openNew()  { setEditTarget(undefined); setDialogOpen(true) }
  function openEdit(p: RelatedPerson) { setEditTarget(p); setDialogOpen(true) }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openNew}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add Contact
        </button>
      </div>

      {!persons.length ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No contacts or next of kin recorded
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {persons.map((p) => {
            const phone = p.telecom?.find((t) => t.system === "phone")?.value
            const email = p.telecom?.find((t) => t.system === "email")?.value
            const addr  = p.address?.[0]?.text

            return (
              <Card key={p.id} className="group">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">
                        {relatedPersonDisplayName(p)}
                      </p>
                      <p className="text-xs text-primary font-medium mt-0.5">
                        {relatedPersonRelationship(p)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {(phone || email || addr || p.gender || p.birthDate) && (
                    <div className="mt-3 space-y-1.5">
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {phone}
                        </a>
                      )}
                      {email && (
                        <a
                          href={`mailto:${email}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {email}
                        </a>
                      )}
                      {addr && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {addr}
                        </p>
                      )}
                      {(p.gender || p.birthDate) && (
                        <p className="text-xs text-muted-foreground/60 pt-0.5">
                          {[p.gender && p.gender.charAt(0).toUpperCase() + p.gender.slice(1), p.birthDate && `b. ${p.birthDate}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <RelatedPersonFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        person={editTarget}
        onSuccess={handleSuccess}
        patient={patient}
      />
    </div>
  )
}
