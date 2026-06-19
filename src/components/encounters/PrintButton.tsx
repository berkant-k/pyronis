"use client"

import { Printer } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className={cn(buttonVariants({ size: "sm" }), "gap-2 print:hidden")}
    >
      <Printer className="h-4 w-4" />
      Print
    </button>
  )
}
