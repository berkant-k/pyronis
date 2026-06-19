"use client";

import { useState } from "react";
import type { Questionnaire, QuestionnaireItem, QuestionnaireResponse } from "@medplum/fhirtypes";
import { Button } from "@/components/ui/button";
import { submitQuestionnaireResponse, updateQuestionnaireResponse } from "@/lib/fhir-client";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AnswerValue = {
    valueCoding?: { code: string; display: string; system: string };
    valueString?: string;
    valueInteger?: number;
    valueBoolean?: boolean;
};

interface Props {
    questionnaire: Questionnaire;
    patientId: string;
    encounterId?: string;
    initialResponse?: QuestionnaireResponse;
    onSubmitted: (response: QuestionnaireResponse) => void;
    onCancel?: () => void;
}

function initAnswers(response?: QuestionnaireResponse): Record<string, AnswerValue> {
    if (!response?.item) return {};
    const result: Record<string, AnswerValue> = {};
    for (const item of response.item) {
        if (item.answer?.[0]) result[item.linkId] = item.answer[0] as AnswerValue;
    }
    return result;
}

export function QuestionnaireRenderer({ questionnaire, patientId, encounterId, initialResponse, onSubmitted, onCancel }: Props) {
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => initAnswers(initialResponse));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function setAnswer(linkId: string, value: AnswerValue) {
        setAnswers((a) => ({ ...a, [linkId]: value }));
    }

    function flatLeafItems(items: QuestionnaireItem[]): QuestionnaireItem[] {
        const result: QuestionnaireItem[] = [];
        for (const item of items) {
            if (item.type === "group") {
                result.push(...flatLeafItems(item.item ?? []));
            } else if (item.type !== "display") {
                result.push(item);
            }
        }
        return result;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const leaves = flatLeafItems(questionnaire.item ?? []);
        const missing = leaves.filter((i) => i.required && !answers[i.linkId]);
        if (missing.length > 0) {
            setError(`Please answer all required questions (${missing.length} remaining).`);
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            const responseItems = leaves
                .filter((i) => answers[i.linkId])
                .map((i) => ({
                    linkId: i.linkId,
                    text: i.text,
                    answer: [answers[i.linkId] as Record<string, unknown>],
                }));

            const body: QuestionnaireResponse = {
                ...(initialResponse ?? {}),
                resourceType: "QuestionnaireResponse",
                questionnaire: questionnaire.url,
                status: "completed",
                subject: { reference: `Patient/${patientId}` },
                authored: new Date().toISOString(),
                item: responseItems as QuestionnaireResponse["item"],
            };
            if (encounterId) {
                body.encounter = { reference: `Encounter/${encounterId}` };
            }

            const saved = initialResponse?.id
                ? await updateQuestionnaireResponse(initialResponse.id, body)
                : await submitQuestionnaireResponse(body);
            onSubmitted(saved);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit questionnaire.");
        } finally {
            setSubmitting(false);
        }
    }

    function renderItem(item: QuestionnaireItem): React.ReactNode {
        if (item.type === "display") {
            return (
                <div key={item.linkId} className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800 leading-relaxed">
                    {item.text}
                </div>
            );
        }

        if (item.type === "group") {
            return (
                <div key={item.linkId} className="space-y-4">
                    {item.text && (
                        <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mt-2">
                            {item.text}
                        </h3>
                    )}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {(item.item ?? []).map((child) => renderItem(child))}
                    </div>
                </div>
            );
        }

        if (item.type === "choice") {
            const selected = answers[item.linkId]?.valueCoding?.code;
            return (
                <div key={item.linkId} className="space-y-2">
                    <p className="text-sm leading-snug">
                        {item.text}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {(item.answerOption ?? []).map((opt) => {
                            const code = opt.valueCoding?.code ?? "";
                            const display = opt.valueCoding?.display ?? code;
                            const isSelected = selected === code;
                            return (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() =>
                                        setAnswer(item.linkId, {
                                            valueCoding: opt.valueCoding as AnswerValue["valueCoding"],
                                        })
                                    }
                                    className={cn(
                                        "rounded-md border px-3 py-1.5 text-sm transition-colors",
                                        isSelected
                                            ? "border-primary bg-primary text-primary-foreground font-medium"
                                            : "border-border bg-background hover:border-primary/50 hover:bg-muted/40"
                                    )}
                                >
                                    {display}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (item.type === "boolean") {
            const val = answers[item.linkId]?.valueBoolean;
            return (
                <div key={item.linkId} className="flex items-center gap-3">
                    <div className="flex gap-2 shrink-0">
                        {([true, false] as const).map((v) => (
                            <button
                                key={String(v)}
                                type="button"
                                onClick={() => setAnswer(item.linkId, { valueBoolean: v })}
                                className={cn(
                                    "rounded-md border px-3 py-1 text-sm transition-colors",
                                    val === v
                                        ? "border-primary bg-primary text-primary-foreground font-medium"
                                        : "border-border bg-background hover:border-primary/50"
                                )}
                            >
                                {v ? "Yes" : "No"}
                            </button>
                        ))}
                    </div>
                    <span className="text-sm leading-snug">{item.text}</span>
                </div>
            );
        }

        if (item.type === "integer") {
            return (
                <div key={item.linkId} className="space-y-1.5">
                    <label className="text-sm">
                        {item.text}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={10}
                        value={answers[item.linkId]?.valueInteger ?? ""}
                        onChange={(e) =>
                            setAnswer(item.linkId, { valueInteger: parseInt(e.target.value, 10) })
                        }
                        className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>
            );
        }

        if (item.type === "text") {
            return (
                <div key={item.linkId} className="space-y-1.5">
                    <label className="text-sm">
                        {item.text}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    <textarea
                        rows={3}
                        value={answers[item.linkId]?.valueString ?? ""}
                        onChange={(e) => setAnswer(item.linkId, { valueString: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>
            );
        }

        if (item.type === "string") {
            return (
                <div key={item.linkId} className="space-y-1.5">
                    <label className="text-sm">{item.text}</label>
                    <input
                        type="text"
                        value={answers[item.linkId]?.valueString ?? ""}
                        onChange={(e) => setAnswer(item.linkId, { valueString: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>
            );
        }

        return null;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {(questionnaire.item ?? []).map((item) => renderItem(item))}

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                    {initialResponse ? "Save changes" : "Submit"}
                </Button>
            </div>
        </form>
    );
}
