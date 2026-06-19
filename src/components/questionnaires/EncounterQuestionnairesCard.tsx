"use client"

import { useState } from "react"
import type { QuestionnaireResponse } from "@medplum/fhirtypes"
import {
    BUILTIN_QUESTIONNAIRES,
    getBuiltinQuestionnaire,
    scoreResponse,
    SCORE_COLORS,
} from "@/lib/questionnaires"
import { deleteQuestionnaireResponse } from "@/lib/fhir-client"
import { QuestionnaireRenderer } from "./QuestionnaireRenderer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ClipboardList, Plus, ChevronLeft, Pencil, Trash2, Loader2 } from "lucide-react"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
    patientId: string
    encounterId: string
    initialResponses: QuestionnaireResponse[]
    patient?: PatientInfo
}

export function EncounterQuestionnairesCard({ patientId, encounterId, initialResponses, patient }: Props) {
    const [responses, setResponses] = useState(initialResponses)
    const [open, setOpen] = useState(false)
    const [selectedQId, setSelectedQId] = useState<string | null>(null)
    const [editingResponse, setEditingResponse] = useState<QuestionnaireResponse | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    const selectedQ = selectedQId ? getBuiltinQuestionnaire(selectedQId) : undefined

    function handleEdit(r: QuestionnaireResponse) {
        const qId = r.questionnaire?.split("/").pop() ?? null
        setEditingResponse(r)
        setSelectedQId(qId)
        setOpen(true)
    }

    async function handleDelete(id: string) {
        setDeleting(id)
        try {
            await deleteQuestionnaireResponse(id)
            setResponses((prev) => prev.filter((r) => r.id !== id))
        } catch {
            // leave existing state on error
        } finally {
            setDeleting(null)
        }
    }

    function handleSubmitted(response: QuestionnaireResponse) {
        if (editingResponse) {
            setResponses((prev) => prev.map((r) => r.id === response.id ? response : r))
        } else {
            setResponses((prev) => [response, ...prev])
        }
        setOpen(false)
        setSelectedQId(null)
        setEditingResponse(null)
    }

    function handleOpenChange(v: boolean) {
        setOpen(v)
        if (!v) {
            setSelectedQId(null)
            setEditingResponse(null)
        }
    }

    function handleBack() {
        setSelectedQId(null)
        setEditingResponse(null)
    }

    return (
        <Card>
            <CardHeader className="pt-4 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    Questionnaires
                    <Badge variant="secondary" className="ml-auto font-mono text-xs">
                        {responses.length}
                    </Badge>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5 h-7 text-xs")}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Start
                    </button>
                </CardTitle>
            </CardHeader>

            {responses.length > 0 ? (
                <CardContent className="pb-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border">
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Questionnaire</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                                <th className="w-16" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {responses.map((r, idx) => {
                                const qId = r.questionnaire?.split("/").pop()
                                const q = qId ? getBuiltinQuestionnaire(qId) : undefined
                                const score = q ? scoreResponse(q, r) : null
                                const authored = r.authored
                                    ? new Date(r.authored).toLocaleString("en-GB", {
                                        day: "2-digit", month: "short", year: "numeric",
                                        hour: "2-digit", minute: "2-digit",
                                    })
                                    : "—"
                                const title = q?.title ?? r.questionnaire ?? "Unknown"

                                return (
                                    <tr key={r.id ?? idx} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-4 py-3 font-medium">{title}</td>
                                        <td className="px-4 py-3">
                                            {score ? (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                                    SCORE_COLORS[score.color]
                                                )}>
                                                    {score.total}/{score.max} — {score.severity}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{authored}</td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={r.status === "completed" ? "default" : "secondary"}
                                                className={cn(
                                                    "text-xs",
                                                    r.status === "completed" && "bg-green-100 text-green-700 hover:bg-green-100"
                                                )}
                                            >
                                                {r.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {q && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(r)}
                                                        aria-label="Edit response"
                                                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => r.id && handleDelete(r.id)}
                                                    disabled={deleting === r.id}
                                                    aria-label="Delete response"
                                                    className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                                >
                                                    {deleting === r.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Trash2 className="h-3.5 w-3.5" />
                                                    }
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </CardContent>
            ) : (
                <CardContent className="pb-5">
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No questionnaires for this encounter
                    </p>
                </CardContent>
            )}

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 py-4 border-b shrink-0">
                        <div className="flex items-center gap-2">
                            {selectedQ && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="text-muted-foreground hover:text-foreground transition-colors -ml-1"
                                    aria-label="Back"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                            )}
                            <DialogTitle>
                                {selectedQ
                                    ? editingResponse ? `Edit — ${selectedQ.title}` : selectedQ.title
                                    : "Select Questionnaire"}
                            </DialogTitle>
                        </div>
                        {selectedQ?.description && !editingResponse && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-7">{selectedQ.description}</p>
                        )}
                    </DialogHeader>

                    {patient && <div className="px-6 pt-2"><PatientBanner {...patient} /></div>}

                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {!selectedQ ? (
                            <div className="grid grid-cols-2 gap-3">
                                {BUILTIN_QUESTIONNAIRES.map((q) => (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => setSelectedQId(q.id!)}
                                        className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/60 hover:bg-muted/30 transition-all"
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                                            <span className="font-semibold text-sm">{q.title}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{q.description}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <QuestionnaireRenderer
                                questionnaire={selectedQ}
                                patientId={patientId}
                                encounterId={encounterId}
                                initialResponse={editingResponse ?? undefined}
                                onSubmitted={handleSubmitted}
                                onCancel={handleBack}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
