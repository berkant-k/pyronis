"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Loader2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { checkInAppointment } from "@/lib/fhir-client"

interface CheckInButtonProps {
  appointmentId: string
}

export function CheckInButton({ appointmentId }: CheckInButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckIn() {
    setLoading(true)
    setError(null)
    try {
      await checkInAppointment(appointmentId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCheckIn}
        disabled={loading}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 disabled:opacity-60"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        {loading ? "Checking in…" : "Check In"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
