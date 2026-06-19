"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Loader2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { closeEncounter } from "@/lib/fhir-client"

interface Props {
  encounterId: string
}

export function CloseEncounterButton({ encounterId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState("")

  async function handleClose() {
    setClosing(true)
    setError("")
    try {
      await closeEncounter(encounterId)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close encounter")
    } finally {
      setClosing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError("")
      }}
    >
      <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800")}>
        <CheckCircle className="h-4 w-4" />
        Close Encounter
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-amber-600" />
            Close Encounter
          </DialogTitle>
          <DialogDescription>
            This will mark the encounter as <strong>finished</strong> and record the current time as the end of the visit. This action cannot be undone from the UI.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive px-1">{error}</p>}

        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={closing}
            className={cn(buttonVariants(), "gap-2 bg-amber-600 hover:bg-amber-700")}
          >
            {closing && <Loader2 className="h-4 w-4 animate-spin" />}
            {closing ? "Closing…" : "Close Encounter"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
