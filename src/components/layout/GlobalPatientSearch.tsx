"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Search, Loader2, User, ChevronRight } from "lucide-react"
import type { Patient } from "@medplum/fhirtypes"
import {
  searchPatients,
  patientDisplayName,
  patientAge,
  getPatientMRN,
  formatDate,
} from "@/lib/fhir-client"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function GlobalPatientSearch() {
  const [query, setQuery]           = useState("")
  const [results, setResults]       = useState<Patient[]>([])
  const [open, setOpen]             = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef    = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const portalRef   = useRef<HTMLDivElement>(null)
  const latestQuery = useRef("")
  const router = useRouter()

  // "/" shortcut focuses the input
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return
      const tag = (e.target as Element).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Click outside closes the dropdown — also exclude the portal so clicks on
  // results are not treated as "outside" before the click event fires.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      const insideContainer = containerRef.current?.contains(target)
      const insidePortal    = portalRef.current?.contains(target)
      if (!insideContainer && !insidePortal) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  // Track container position for the portal dropdown
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (containerRef.current) setContainerRect(containerRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    const delay = q.length >= 2 ? 350 : 0
    const t = setTimeout(() => {
      if (q.length < 2) {
        setResults([])
        setHasSearched(false)
        return
      }
      latestQuery.current = q
      startTransition(async () => {
        const r = await searchPatients(q).catch(() => [])
        if (latestQuery.current === q) {
          setResults(r)
          setHasSearched(true)
        }
      })
    }, delay)
    return () => clearTimeout(t)
  }, [query])

  function handleSelect(p: Patient) {
    setOpen(false)
    setQuery("")
    setResults([])
    setHasSearched(false)
    router.push(`/patients/${p.id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showDropdown = open && query.trim().length >= 2

  const dropdownContent = showDropdown && containerRect && createPortal(
    <div
      ref={portalRef}
      style={{
        position: "fixed",
        top: containerRect.bottom + 6,
        left: containerRect.left,
        width: 440,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-lg border bg-background shadow-xl"
    >
      {isPending ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Searching…</span>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-8 text-muted-foreground">
          <User className="h-6 w-6 opacity-30" />
          <p className="text-sm">No patients found for &ldquo;{query.trim()}&rdquo;</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <ul className="divide-y divide-border/60">
            {results.slice(0, 8).map((p) => {
              const mrn  = getPatientMRN(p)
              const name = patientDisplayName(p)
              const ini  = name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
              const dob  = p.birthDate
                ? `${formatDate(p.birthDate)} · ${patientAge(p)} yrs`
                : null

              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/70 transition-colors"
                    onClick={() => handleSelect(p)}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                        {ini || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        {mrn && (
                          <span className="font-mono text-[11px] text-primary">MR-{mrn}</span>
                        )}
                        {dob && (
                          <span className="text-[11px] text-muted-foreground">{dob}</span>
                        )}
                        {p.gender && (
                          <span className="text-[11px] capitalize text-muted-foreground">{p.gender}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary" />
                  </button>
                </li>
              )
            })}
          </ul>
          {results.length > 8 && (
            <div className="border-t px-3 py-2">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => { setOpen(false); router.push("/patients") }}
              >
                {results.length} results — open full patient list
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>,
    document.body
  )

  return (
    <div ref={containerRef} className="relative max-w-sm flex-1">
      {/* Icon */}
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search patients, records…"
        className="h-8 pl-8 pr-10 text-sm bg-muted/60 border-transparent focus:border-border focus:bg-background transition-colors"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Right slot: spinner while fetching, kbd hint otherwise */}
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <kbd className="hidden select-none items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:flex">
            /
          </kbd>
        )}
      </div>

      {dropdownContent}
    </div>
  )
}
