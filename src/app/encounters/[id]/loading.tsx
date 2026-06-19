export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-36 rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-md bg-muted" />
          <div className="h-9 w-28 rounded-md bg-muted" />
          <div className="h-9 w-36 rounded-md bg-muted" />
        </div>
      </div>

      {/* Encounter header card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="h-1.5 w-full bg-muted" />
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-24 rounded-full bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
              </div>
              <div className="h-7 w-64 rounded-md bg-muted" />
              <div className="flex gap-3">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <div className="h-5 w-36 rounded bg-muted ml-auto" />
              <div className="h-4 w-28 rounded bg-muted ml-auto" />
              <div className="h-4 w-20 rounded bg-muted ml-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* SOAP note skeleton */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="h-5 w-32 rounded bg-muted" />
        {["S", "O", "A", "P"].map((s) => (
          <div key={s} className="space-y-1.5">
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-20 rounded-lg bg-muted" />
          </div>
        ))}
      </div>

      {/* Data section skeletons */}
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border bg-card">
          <div className="p-4 border-b border-border/60">
            <div className="h-4 w-36 rounded bg-muted" />
          </div>
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted ml-auto" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
