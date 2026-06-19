import type { Metadata } from "next";
import { BUILTIN_QUESTIONNAIRES } from "@/lib/questionnaires";
import { ClipboardList, Clock, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Questionnaires | Pyronis EMR" };

export default function QuestionnairesPage() {
    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold">Questionnaire Library</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Available screening tools and intake forms. Fill them from a patient&apos;s chart.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {BUILTIN_QUESTIONNAIRES.map((q) => {
                    const questionCount = (q.item ?? []).filter((i) => i.type !== "display").length;
                    const choiceCount = (q.item ?? []).filter((i) => i.type === "choice").length;
                    const hasScoring = ["phq9", "gad7", "audit-c"].includes(q.id ?? "");

                    return (
                        <div key={q.id} className="rounded-lg border bg-card p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <ClipboardList className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-base">{q.title}</h2>
                                        <p className="text-sm text-muted-foreground mt-0.5">{q.description}</p>
                                    </div>
                                </div>
                                {hasScoring && (
                                    <Badge variant="secondary" className="shrink-0 bg-purple-50 text-purple-700 border-purple-200">
                                        Auto-scored
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                                <span className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5" />
                                    {questionCount} question{questionCount !== 1 ? "s" : ""}
                                </span>
                                {choiceCount > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        ~{Math.ceil(questionCount / 5)} min
                                    </span>
                                )}
                                <span className="font-mono text-[11px] text-muted-foreground/60">{q.url}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
                To fill a questionnaire, open a patient chart and go to the{" "}
                <strong>Questionnaires</strong> tab under the Clinical section.
            </div>
        </div>
    );
}
