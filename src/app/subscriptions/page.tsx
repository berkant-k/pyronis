import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Bell, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/utils";
import {
    listSubscriptions,
    subscriptionDisplayName,
    subscriptionStatusColor,
} from "@/lib/fhir-client";

export const metadata: Metadata = { title: "Subscriptions | Pyronis EMR" };
export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
    "rest-hook": "REST Hook",
    websocket:   "WebSocket",
    email:       "Email",
    sms:         "SMS",
    message:     "FHIR Message",
};

export default async function SubscriptionsPage() {
    const subscriptions = await listSubscriptions().catch(() => []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Subscriptions</h1>
                    <p className="text-sm text-muted-foreground">FHIR event subscriptions and notification channels</p>
                </div>
                <Link href="/subscriptions/new" className={cn(buttonVariants(), "gap-2")}>
                    <Plus className="h-4 w-4" />
                    New Subscription
                </Link>
            </div>

            {subscriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
                    <Bell className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No subscriptions defined yet.</p>
                    <Link href="/subscriptions/new" className={cn(buttonVariants({ variant: "outline" }), "gap-2 mt-1")}>
                        <Plus className="h-4 w-4" />
                        Create first subscription
                    </Link>
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Reason</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Criteria</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Status</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Channel</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Endpoint</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {subscriptions.map((sub) => {
                                const id = sub.id ?? "";
                                const endpoint = sub.channel?.endpoint ?? "";
                                return (
                                    <tr key={id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3 font-medium max-w-[180px] truncate">
                                            {subscriptionDisplayName(sub)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                                            {sub.criteria || <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill
                                                color={subscriptionStatusColor(sub)}
                                                label={sub.status ?? "unknown"}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {CHANNEL_LABELS[sub.channel?.type ?? ""] ?? sub.channel?.type ?? <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                                            {endpoint
                                                ? <span className="font-mono">{endpoint}</span>
                                                : <span className="text-muted-foreground/40">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/subscriptions/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                View <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
