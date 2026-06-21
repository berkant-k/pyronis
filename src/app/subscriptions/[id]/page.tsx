import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getSubscription,
    subscriptionDisplayName,
    subscriptionStatusColor,
    subscriptionFilterCriteria,
    subscriptionHeartbeat,
    subscriptionPayloadContent,
} from "@/lib/fhir-client";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";
import { DeleteSubscriptionButton } from "@/components/subscriptions/DeleteSubscriptionButton";
import { StatusPill } from "@/components/ui/StatusPill";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Bell, Pencil, Globe, FileCode, Clock, Hash, Filter, Timer } from "lucide-react";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
    "rest-hook": "REST Hook",
    websocket:   "WebSocket",
    email:       "Email",
    sms:         "SMS",
    message:     "FHIR Message",
};

const CONTENT_LABELS: Record<string, string> = {
    "empty":         "Empty (notification only)",
    "id-only":       "ID Only",
    "full-resource": "Full Resource",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const sub = await getSubscription(id);
        return { title: `${subscriptionDisplayName(sub)} | Pyronis EMR` };
    } catch {
        return { title: "Subscription | Pyronis EMR" };
    }
}

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let sub;
    try {
        sub = await getSubscription(id);
    } catch {
        notFound();
    }

    const filterCriteria  = subscriptionFilterCriteria(sub);
    const heartbeat       = subscriptionHeartbeat(sub);
    const payloadContent  = subscriptionPayloadContent(sub);
    const channelLabel    = CHANNEL_LABELS[sub.channel?.type ?? ""] ?? sub.channel?.type;

    return (
        <div className="space-y-5 max-w-3xl">
            <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to subscriptions
            </Link>

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bell className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{subscriptionDisplayName(sub)}</h1>
                        <div className="mt-1.5">
                            <StatusPill color={subscriptionStatusColor(sub)} label={sub.status ?? "unknown"} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <RawFhirDialog resource={sub as unknown as Record<string, unknown>} />
                    <Link href={`/subscriptions/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <DeleteSubscriptionButton subscriptionId={id} />
                </div>
            </div>

            {/* ── Info grid ── */}
            <div className="grid grid-cols-2 gap-4">
                {/* Subscription details */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic &amp; Filter</h3>

                    <div className="flex items-start gap-2 text-sm">
                        <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                            <p className="text-muted-foreground text-xs">Subscription Topic</p>
                            <p className="font-mono text-xs break-all">{sub.criteria || "—"}</p>
                        </div>
                    </div>

                    {filterCriteria && (
                        <div className="flex items-start gap-2 text-sm">
                            <Filter className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p className="text-muted-foreground text-xs">Filter Criteria</p>
                                <p className="font-mono text-xs break-all">{filterCriteria}</p>
                            </div>
                        </div>
                    )}

                    {sub.end && (
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">Expires</p>
                                <p>{new Date(sub.end).toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {sub.error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            <p className="font-semibold mb-0.5">Last error</p>
                            <p>{sub.error}</p>
                        </div>
                    )}
                </div>

                {/* Channel */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel</h3>

                    {channelLabel && (
                        <div className="flex items-center gap-2 text-sm">
                            <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{channelLabel}</span>
                        </div>
                    )}

                    {sub.channel?.endpoint && (
                        <div className="flex items-start gap-2 text-sm">
                            <Globe className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p className="text-muted-foreground text-xs">Endpoint</p>
                                <p className="font-mono text-xs break-all">{sub.channel.endpoint}</p>
                            </div>
                        </div>
                    )}

                    {sub.channel?.payload && (
                        <div className="flex items-center gap-2 text-sm">
                            <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">Payload MIME type</p>
                                <p className="font-mono text-xs">{sub.channel.payload}</p>
                            </div>
                        </div>
                    )}

                    {payloadContent && (
                        <div className="flex items-center gap-2 text-sm">
                            <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">Content level</p>
                                <p>{CONTENT_LABELS[payloadContent] ?? payloadContent}</p>
                            </div>
                        </div>
                    )}

                    {heartbeat !== null && (
                        <div className="flex items-center gap-2 text-sm">
                            <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">Heartbeat</p>
                                <p>{heartbeat}s</p>
                            </div>
                        </div>
                    )}

                    {(sub.channel?.header ?? []).length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                            <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p className="text-muted-foreground text-xs mb-1">Headers</p>
                                <ul className="space-y-0.5">
                                    {(sub.channel?.header ?? []).map((h, i) => (
                                        <li key={i} className="font-mono text-xs">{h}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
