import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, ExternalLink } from "lucide-react";
import {
    getNotificationBundles,
    parseNotificationBundle,
    FHIR_RESOURCE_ROUTES,
} from "@/lib/fhir-client";
import { DismissNotificationButton } from "@/components/notifications/DismissNotificationButton";
import { RawFhirDialog } from "@/components/ui/RawFhirDialog";
import type { Bundle } from "@medplum/fhirtypes";

export const metadata: Metadata = { title: "Notifications | Pyronis EMR" };
export const dynamic = "force-dynamic";

const RESOURCE_COLORS: Record<string, string> = {
    Encounter:         "bg-blue-100 text-blue-700 border-blue-200",
    Patient:           "bg-teal-100 text-teal-700 border-teal-200",
    Observation:       "bg-green-100 text-green-700 border-green-200",
    DiagnosticReport:  "bg-amber-100 text-amber-700 border-amber-200",
    Flag:              "bg-red-100 text-red-700 border-red-200",
    Appointment:       "bg-purple-100 text-purple-700 border-purple-200",
    MedicationRequest: "bg-indigo-100 text-indigo-700 border-indigo-200",
    Task:              "bg-orange-100 text-orange-700 border-orange-200",
};

function ResourceTypeBadge({ type }: { type: string | null }) {
    if (!type) return <span className="text-muted-foreground/40">—</span>;
    const cls = RESOURCE_COLORS[type] ?? "bg-slate-100 text-slate-600 border-slate-200";
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
            {type}
        </span>
    );
}

function formatTime(ts: string | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default async function NotificationsPage() {
    const bundles = await getNotificationBundles(100).catch(() => [] as Bundle[]);
    const notifications = bundles.map((b) => ({
        bundle: b,
        parsed: parseNotificationBundle(b),
    }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Notifications</h1>
                    <p className="text-sm text-muted-foreground">
                        Incoming FHIR subscription notifications — {notifications.length} received
                    </p>
                </div>
            </div>

            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No notifications yet.</p>
                    <p className="text-xs text-muted-foreground/70">
                        Notifications appear here when a{" "}
                        <Link href="/subscriptions" className="text-primary hover:underline">subscription</Link>
                        {" "}triggers an event.
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Resource</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Subscription</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Received</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {notifications.map(({ bundle, parsed }) => {
                                const route = parsed.resourceType
                                    ? FHIR_RESOURCE_ROUTES[parsed.resourceType]
                                    : null;
                                const resourceHref = route && parsed.resourceId
                                    ? `${route}/${parsed.resourceId}`
                                    : null;
                                const subId = parsed.subscriptionRef?.split("/").pop();

                                return (
                                    <tr key={parsed.bundleId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <ResourceTypeBadge type={parsed.resourceType} />
                                                {resourceHref ? (
                                                    <Link
                                                        href={resourceHref}
                                                        className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                                                    >
                                                        {parsed.resourceId}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                ) : parsed.resourceId ? (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {parsed.resourceId}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {subId ? (
                                                <Link href={`/subscriptions/${subId}`} className="hover:text-primary hover:underline font-mono">
                                                    {subId}
                                                </Link>
                                            ) : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {formatTime(parsed.timestamp)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-3">
                                                <RawFhirDialog
                                                    resource={bundle as unknown as Record<string, unknown>}
                                                />
                                                <DismissNotificationButton bundleId={parsed.bundleId} />
                                            </div>
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
