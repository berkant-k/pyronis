"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import type { Patient } from "@medplum/fhirtypes"
import {
  searchPatients,
  patientDisplayName,
  patientAge,
  formatDate,
  getPatientMRN,
  getPatientQID,
} from "@/lib/fhir-client"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Loader2, User, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  selected: Patient | null
  onSelect: (patient: Patient) => void
  onClear: () => void
  disabledId?: string
}

function initials(p: Patient): string {
  const name = p.name?.find((n) => !n.extension?.length) ?? p.name?.[0]
  const first = name?.given?.[0]?.[0] ?? ""
  const last = name?.family?.[0] ?? ""
  return (first + last).toUpperCase() || "?"
}

export function PatientPickerSearch({ selected, onSelect, onClear, disabledId }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Patient[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const latestQuery = useRef("")

  useEffect(() => {
    const q = query.trim()
    const delay = q.length >= 2 ? 400 : 0
    const timer = setTimeout(() => {
      if (!q || q.length < 2) {
        setResults([])
        setHasSearched(false)
        return
      }
      latestQuery.current = q
      startTransition(async () => {
        const res = await searchPatients(q)
        if (latestQuery.current === q) {
          setResults(res)
          setHasSearched(true)
        }
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [query])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length < 2) return
    const captured = query.trim()
    latestQuery.current = captured
    startTransition(async () => {
      const res = await searchPatients(captured)
      if (latestQuery.current === captured) {
        setResults(res)
        setHasSearched(true)
      }
    })
  }

  function clearSearch() {
    setQuery("")
    setResults([])
    setHasSearched(false)
  }

  if (selected) {
    const mrn = getPatientMRN(selected)
    return (
      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials(selected)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{patientDisplayName(selected)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mrn ? `MR-${mrn}` : "No MRN"} · {patientAge(selected)} yrs · {selected.gender ?? "unknown"}
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="shrink-0 ml-2 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1 transition-colors"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative">
        {isPending
          ? <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground animate-spin" />
          : <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        }
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, MRN, QID, passport, phone…"
          className="pl-8 pr-8 text-sm h-9"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center gap-1.5 py-6 text-muted-foreground">
          <User className="h-6 w-6 opacity-40" />
          <p className="text-xs">No patients found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-md border divide-y max-h-52 overflow-auto">
          {results.map((p) => {
            const mrn = getPatientMRN(p)
            const qid = getPatientQID(p)
            const isDisabled = p.id === disabledId
            return (
              <button
                key={p.id}
                type="button"
                disabled={isDisabled}
                onClick={() => { onSelect(p); clearSearch() }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  isDisabled
                    ? "opacity-40 cursor-not-allowed bg-muted/30"
                    : "hover:bg-muted/50 cursor-pointer"
                )}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{initials(p)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{patientDisplayName(p)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {mrn ? `MR-${mrn}` : ""}
                    {qid ? ` · QID ${qid}` : ""}
                    {" · "}{formatDate(p.birthDate)}
                  </p>
                </div>
                {isDisabled && (
                  <span className="text-[10px] text-muted-foreground shrink-0">Already selected</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {!hasSearched && (
        <p className="text-xs text-muted-foreground text-center py-3 opacity-60">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  )
}
