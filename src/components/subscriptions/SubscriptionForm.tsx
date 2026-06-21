"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Bell, Plus, Trash2, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    createSubscription,
    updateSubscription,
    type NewSubscriptionInput,
    type SubscriptionFormState,
} from "@/lib/fhir-client";
import config from "@/lib/config.json";

interface Props {
    mode: "create" | "edit";
    subscriptionId?: string;
    defaultValues?: SubscriptionFormState;
}

const EMPTY: SubscriptionFormState = {
    status:          "requested",
    reason:          "",
    topic:           "",
    filterCriteria:  "",
    channelType:     "rest-hook",
    endpoint:        "",
    payload:         "application/fhir+json",
    content:         "id-only",
    heartbeatPeriod: "",
    headers:         [],
    end:             "",
};

const CHANNEL_TYPES = [
    { code: "rest-hook", label: "REST Hook" },
    { code: "websocket", label: "WebSocket" },
    { code: "email",     label: "Email" },
    { code: "sms",       label: "SMS" },
    { code: "message",   label: "FHIR Message" },
];

export function SubscriptionForm({ mode, subscriptionId, defaultValues }: Props) {
    const router = useRouter();
    const [form, setForm] = useState<SubscriptionFormState>(defaultValues ?? EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reasonError, setReasonError] = useState(false);
    const [topicError, setTopicError] = useState(false);

    const set = (field: keyof SubscriptionFormState, value: string) =>
        setForm((f) => ({ ...f, [field]: value }));

    function fillWebhookUrl() {
        set("endpoint", `${window.location.origin}/api/fhir/notify`);
    }

    function addHeader() {
        setForm((f) => ({ ...f, headers: [...f.headers, ""] }));
    }
    function setHeader(i: number, value: string) {
        setForm((f) => {
            const headers = [...f.headers];
            headers[i] = value;
            return { ...f, headers };
        });
    }
    function removeHeader(i: number) {
        setForm((f) => ({ ...f, headers: f.headers.filter((_, j) => j !== i) }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        let valid = true;
        if (!form.reason.trim()) { setReasonError(true); valid = false; } else setReasonError(false);
        if (!form.topic.trim())  { setTopicError(true);  valid = false; } else setTopicError(false);
        if (!valid) return;

        setSaving(true);
        setError(null);
        try {
            const input: NewSubscriptionInput = {
                status:          (form.status || "requested") as NewSubscriptionInput["status"],
                reason:          form.reason,
                topic:           form.topic,
                filterCriteria:  form.filterCriteria || undefined,
                channelType:     (form.channelType || "rest-hook") as NewSubscriptionInput["channelType"],
                endpoint:        form.endpoint || undefined,
                payload:         form.payload || undefined,
                content:         form.content || undefined,
                heartbeatPeriod: form.heartbeatPeriod || undefined,
                headers:         form.headers.length ? form.headers : undefined,
                end:             form.end || undefined,
            };
            if (mode === "create") {
                const created = await createSubscription(input);
                router.push(`/subscriptions/${created.id}`);
            } else {
                await updateSubscription(subscriptionId!, input);
                router.push(`/subscriptions/${subscriptionId}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save subscription.");
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <Card className="relative z-10">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Bell className="h-4 w-4 text-primary" />
                        Subscription
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Status + Expiry */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs font-medium">Status</Label>
                            <Select value={form.status} onValueChange={(v) => set("status", v ?? "requested")}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="requested">Requested</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                    <SelectItem value="off">Off</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="end" className="text-xs font-medium">Expires</Label>
                            <Input
                                id="end"
                                type="datetime-local"
                                value={form.end}
                                onChange={(e) => set("end", e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <Label htmlFor="reason" className="text-xs font-medium">
                            Reason <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="reason"
                            value={form.reason}
                            onChange={(e) => { set("reason", e.target.value); if (reasonError) setReasonError(false); }}
                            placeholder="e.g. Notify on new in-progress encounters"
                            className={cn("mt-1.5", reasonError && "border-red-400 focus-visible:ring-red-400")}
                        />
                        {reasonError && <p className="mt-1 text-xs text-red-500">Reason is required.</p>}
                    </div>

                    {/* SubscriptionTopic URL */}
                    <div>
                        <Label htmlFor="topic" className="text-xs font-medium">
                            Subscription Topic URL <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="topic"
                            value={form.topic}
                            onChange={(e) => { set("topic", e.target.value); if (topicError) setTopicError(false); }}
                            placeholder="http://example.org/FHIR/SubscriptionTopic/encounter-complete"
                            className={cn("mt-1.5 font-mono text-xs", topicError && "border-red-400 focus-visible:ring-red-400")}
                        />
                        {topicError
                            ? <p className="mt-1 text-xs text-red-500">Topic URL is required.</p>
                            : <p className="mt-1 text-xs text-muted-foreground">Canonical URL of the SubscriptionTopic resource on the FHIR server.</p>
                        }
                    </div>

                    {/* Filter Criteria */}
                    <div>
                        <Label htmlFor="filterCriteria" className="text-xs font-medium">Filter Criteria</Label>
                        <Textarea
                            id="filterCriteria"
                            value={form.filterCriteria}
                            onChange={(e) => set("filterCriteria", e.target.value)}
                            placeholder="Encounter?patient=Patient/123"
                            rows={2}
                            className="mt-1.5 resize-none font-mono text-xs"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Backport filter expression to narrow which events trigger a notification.
                        </p>
                    </div>

                    <Separator />

                    {/* Channel type */}
                    <div>
                        <Label className="text-xs font-medium">Channel Type</Label>
                        <Select value={form.channelType} onValueChange={(v) => set("channelType", v ?? "rest-hook")}>
                            <SelectTrigger className="mt-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CHANNEL_TYPES.map((t) => (
                                    <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Endpoint */}
                    <div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="endpoint" className="text-xs font-medium">Endpoint URL</Label>
                            {form.channelType === "rest-hook" && (
                                <button
                                    type="button"
                                    onClick={fillWebhookUrl}
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                    <Webhook className="h-3 w-3" />
                                    Use this app&apos;s webhook
                                </button>
                            )}
                        </div>
                        <Input
                            id="endpoint"
                            value={form.endpoint}
                            onChange={(e) => set("endpoint", e.target.value)}
                            placeholder="https://…"
                            className="mt-1.5"
                        />
                    </div>

                    {/* Payload MIME type + Content level */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs font-medium">Payload MIME Type</Label>
                            <Select value={form.payload} onValueChange={(v) => set("payload", v ?? "")}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="application/fhir+json">application/fhir+json</SelectItem>
                                    <SelectItem value="application/fhir+xml">application/fhir+xml</SelectItem>
                                    <SelectItem value="">None</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Content Level</Label>
                            <Select value={form.content} onValueChange={(v) => set("content", v ?? "")}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {config.fhir.options.subscriptionContent.map((opt) => (
                                        <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Heartbeat period */}
                    <div className="w-1/2 pr-2">
                        <Label htmlFor="heartbeatPeriod" className="text-xs font-medium">Heartbeat Period (seconds)</Label>
                        <Input
                            id="heartbeatPeriod"
                            type="number"
                            min={0}
                            value={form.heartbeatPeriod}
                            onChange={(e) => set("heartbeatPeriod", e.target.value)}
                            placeholder="e.g. 120"
                            className="mt-1.5"
                        />
                    </div>

                    {/* HTTP Headers */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-medium">HTTP Headers</Label>
                            <button
                                type="button"
                                onClick={addHeader}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <Plus className="h-3 w-3" />
                                Add header
                            </button>
                        </div>
                        {form.headers.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No additional headers.</p>
                        ) : (
                            <div className="space-y-2">
                                {form.headers.map((h, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Input
                                            value={h}
                                            onChange={(e) => setHeader(i, e.target.value)}
                                            placeholder="Authorization: Bearer token"
                                            className="font-mono text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeHeader(i)}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-2 pb-6">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                    Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : mode === "create" ? "Create Subscription" : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}
