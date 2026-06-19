export default function QuestionnairesLoading() {
    return (
        <div className="space-y-6 max-w-3xl animate-pulse">
            <div className="space-y-2">
                <div className="h-8 w-56 rounded-md bg-muted" />
                <div className="h-4 w-80 rounded bg-muted/60" />
            </div>
            <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-48 rounded bg-muted" />
                                <div className="h-3.5 w-72 rounded bg-muted/60" />
                            </div>
                        </div>
                        <div className="h-px w-full bg-border" />
                        <div className="h-3 w-32 rounded bg-muted/60" />
                    </div>
                ))}
            </div>
        </div>
    );
}
