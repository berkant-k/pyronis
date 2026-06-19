"use client"

import { useState } from "react"
import { Camera } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PatientPhotoDialog } from "./PatientPhotoDialog"

interface Props {
  patientId:       string
  initials:        string
  initialPhotoUrl: string | null
  isActive:        boolean
  isDeceased:      boolean
}

export function PatientPhotoAvatar({
  patientId, initials, initialPhotoUrl, isActive, isDeceased,
}: Props) {
  const [photoUrl, setPhotoUrl]   = useState<string | null>(initialPhotoUrl)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="relative shrink-0 group">
        {/* Avatar / photo */}
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          title="Change photo"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Patient photo"
              className="h-16 w-16 rounded-full object-cover ring-4 ring-primary/15 shadow-md"
            />
          ) : (
            <Avatar className="h-16 w-16 ring-4 ring-primary/15 shadow-md">
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Camera overlay on hover */}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-5 w-5 text-white" />
          </span>
        </button>

        {/* Active/inactive status dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${isActive && !isDeceased ? "bg-green-500" : "bg-muted-foreground/40"}`}
          title={isActive ? "Active" : "Inactive"}
        />
      </div>

      <PatientPhotoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        currentPhotoUrl={photoUrl}
        initials={initials}
        onPhotoSaved={setPhotoUrl}
      />
    </>
  )
}
