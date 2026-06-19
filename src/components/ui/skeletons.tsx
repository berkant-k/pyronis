// ─── Shared skeleton components for loading.tsx route segments ────────────────
// Each loading.tsx imports from here so layout changes happen in one place.

// ─── List page (covers: encounters, appointments, orders, medications,
//     observations, flags, immunizations, reports, tasks) ─────────────────────

export function ListPageSkeleton({
  maxWidth = "5xl",
  rows = 7,
  filterTabs = false,
}: {
  maxWidth?: "5xl" | "6xl"
  rows?: number
  filterTabs?: boolean
}) {
  const widthCls = maxWidth === "6xl" ? "max-w-6xl" : "max-w-5xl"
  return (
    <div className={`mx-auto ${widthCls} space-y-6 animate-pulse`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 rounded bg-muted" />
        <div className="space-y-1.5">
          <div className="h-7 w-32 rounded-md bg-muted" />
          <div className="h-4 w-60 rounded bg-muted" />
        </div>
      </div>

      {/* Filter controls */}
      {filterTabs ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
            <div className="h-7 w-16 rounded-md bg-muted" />
            <div className="h-7 w-20 rounded-md bg-background shadow-sm" />
            <div className="h-7 w-16 rounded-md bg-muted" />
          </div>
          <div className="h-9 flex-1 min-w-48 rounded-lg border bg-muted" />
          <div className="h-9 w-32 rounded-lg bg-muted" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 flex-1 min-w-48 rounded-lg border bg-muted" />
          <div className="h-9 w-32 rounded-lg bg-muted" />
          <div className="h-9 w-28 rounded-lg bg-muted" />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
          <div className="h-3.5 w-36 rounded bg-muted" />
          <div className="h-3.5 w-28 rounded bg-muted" />
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-3.5 w-20 rounded bg-muted ml-auto" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0"
          >
            <div className="h-4 w-44 rounded bg-muted" />
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-32 rounded-md bg-muted" />
          <div className="h-4 w-56 rounded bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-8 w-14 rounded-md bg-muted" />
                <div className="h-3 w-28 rounded bg-muted" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Content panels */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-4 w-14 rounded bg-muted" />
          </div>
          <div className="p-2 space-y-0.5">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2">
                <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3.5 w-36 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                <div className="h-3 w-14 rounded bg-muted shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-4 w-14 rounded bg-muted" />
          </div>
          <div className="p-2 space-y-0.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 rounded-md px-2 py-2.5">
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-5 w-20 rounded-full bg-muted" />
                  <div className="h-3.5 w-32 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
                <div className="h-3 w-12 rounded bg-muted shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border bg-card">
        <div className="px-4 pt-4 pb-3">
          <div className="h-3.5 w-28 rounded bg-muted" />
        </div>
        <div className="px-4 pb-4 flex flex-wrap gap-3">
          <div className="h-9 w-44 rounded-lg bg-muted" />
          <div className="h-9 w-36 rounded-lg bg-muted" />
          <div className="h-9 w-36 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  )
}

// ─── Patient list ─────────────────────────────────────────────────────────────

export function PatientListSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-muted" />
          <div className="space-y-1.5">
            <div className="h-7 w-24 rounded-md bg-muted" />
            <div className="h-4 w-52 rounded bg-muted" />
          </div>
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted" />
      </div>

      <div className="h-10 w-full rounded-xl border bg-muted" />

      <div className="flex flex-col items-center gap-3 py-16">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="h-5 w-44 rounded bg-muted" />
        <div className="h-4 w-60 rounded bg-muted" />
      </div>
    </div>
  )
}

// ─── Patient chart ────────────────────────────────────────────────────────────

export function PatientChartSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-36 rounded bg-muted" />
        <div className="h-9 w-20 rounded-lg bg-muted" />
      </div>

      {/* Patient mini-header card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="h-1 w-full bg-muted" />
        <div className="py-4 px-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-6 w-44 rounded-md bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
              </div>
              <div className="h-4 w-40 rounded bg-muted" />
            </div>
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* 3-column clinical summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
              <div className="h-5 w-5 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-5 w-7 rounded-full bg-muted ml-auto" />
            </div>
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Encounter timeline card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="h-5 w-9 rounded-full bg-muted ml-auto" />
        </div>
        <div className="p-5 relative space-y-5">
          <div className="absolute left-[23px] top-5 bottom-5 w-px bg-muted" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative flex gap-4 pl-8">
              <div className="absolute left-2.5 top-1 h-4 w-4 rounded-full bg-muted border-2 border-background" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 rounded-full bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-28 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vitals grid card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted ml-auto" />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-lg border bg-muted/30 px-3.5 py-3 space-y-2">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-7 w-16 rounded-md bg-muted" />
                <div className="h-3 w-10 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
