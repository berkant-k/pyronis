export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      {/* Back + actions bar */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded-md bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 rounded-md bg-muted" />
          <div className="h-9 w-36 rounded-md bg-muted" />
          <div className="h-9 w-24 rounded-md bg-muted" />
          <div className="h-9 w-24 rounded-md bg-muted" />
        </div>
      </div>

      {/* Patient header card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="h-1.5 w-full bg-muted" />
        <div className="pt-5 pb-4 px-6 space-y-4">
          {/* Photo + identity */}
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-52 rounded-md bg-muted" />
              <div className="flex gap-2">
                <div className="h-5 w-20 rounded-md bg-muted" />
                <div className="h-5 w-14 rounded-full bg-muted" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
              </div>
            </div>
          </div>
          {/* Clinical signals */}
          <div className="pt-4 border-t border-border/60 flex flex-wrap gap-2">
            <div className="h-7 w-44 rounded-full bg-muted" />
            <div className="h-7 w-32 rounded-full bg-muted" />
            <div className="h-7 w-28 rounded-full bg-muted" />
            <div className="h-7 w-24 rounded-full bg-muted" />
          </div>
        </div>
      </div>

      {/* Tabs section */}
      <div className="space-y-3">
        {/* Group selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
          <div className="h-8 w-20 rounded-md bg-background shadow-sm" />
          <div className="h-8 w-28 rounded-md bg-muted/50" />
          <div className="h-8 w-36 rounded-md bg-muted/50" />
        </div>
        {/* Tab triggers */}
        <div className="flex flex-wrap gap-1 p-[3px] rounded-lg bg-muted w-full">
          {[80, 90, 100, 110, 70, 90, 110].map((w, i) => (
            <div key={i} className="h-8 rounded-md bg-muted/60" style={{ width: w }} />
          ))}
        </div>
        {/* Tab content skeleton — table rows */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b border-border/60">
            <div className="h-4 w-48 rounded bg-muted" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
