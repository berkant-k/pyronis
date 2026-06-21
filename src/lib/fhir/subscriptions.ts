import type {
    Bundle,
    Subscription,
    SubscriptionStatus,
} from "@medplum/fhirtypes";
import config from "../config.json";
import { authHeaders } from "../auth";
import {
    fhirRequest,
    fhirFetch,
    getFhirBaseUrl,
} from "./client";
import type { StatusColor } from "@/components/ui/StatusPill";

// ─── Private constants ────────────────────────────────────────────────────────

const BP_FILTER    = config.fhir.extensions.backportFilterCriteria;
const BP_HEARTBEAT = config.fhir.extensions.backportHeartbeatPeriod;
const BP_CONTENT   = config.fhir.extensions.backportPayloadContent;
const NOTIFICATION_TAG = `${config.notifications.tag.system}|${config.notifications.tag.code}`;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface NewSubscriptionInput {
    status: "requested" | "active" | "error" | "off";
    reason: string;
    /** SubscriptionTopic canonical URL — stored as Subscription.criteria */
    topic: string;
    /** Backport filter expression, e.g. "Encounter?patient=Patient/123" */
    filterCriteria?: string;
    channelType: "rest-hook" | "websocket" | "email" | "sms" | "message";
    endpoint?: string;
    payload?: string;
    /** Backport payload content level: empty | id-only | full-resource */
    content?: string;
    /** Backport heartbeat period in seconds */
    heartbeatPeriod?: string;
    headers?: string[];
    end?: string;
}

export interface SubscriptionFormState {
    status: string;
    reason: string;
    topic: string;
    filterCriteria: string;
    channelType: string;
    endpoint: string;
    payload: string;
    content: string;
    heartbeatPeriod: string;
    headers: string[];
    end: string;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildSubscriptionBody(input: NewSubscriptionInput, id?: string): Subscription {
    const validHeaders = (input.headers ?? []).filter((h) => h.trim());
    const heartbeat = input.heartbeatPeriod ? Number(input.heartbeatPeriod) : null;

    const body: Record<string, unknown> = {
        resourceType: "Subscription",
        ...(id ? { id } : {}),
        status: input.status,
        reason: input.reason,
        criteria: input.topic,
        ...(input.filterCriteria?.trim() ? {
            _criteria: {
                extension: [{ url: BP_FILTER, valueString: input.filterCriteria.trim() }],
            },
        } : {}),
        channel: {
            ...(heartbeat ? { extension: [{ url: BP_HEARTBEAT, valueInteger: heartbeat }] } : {}),
            type: input.channelType,
            ...(input.endpoint?.trim() ? { endpoint: input.endpoint.trim() } : {}),
            ...(input.payload ? { payload: input.payload } : {}),
            ...(input.content ? {
                _payload: {
                    extension: [{ url: BP_CONTENT, valueCode: input.content }],
                },
            } : {}),
            ...(validHeaders.length ? { header: validHeaders } : {}),
        },
        ...(input.end?.trim() ? { end: new Date(input.end).toISOString() } : {}),
    };
    return body as unknown as Subscription;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getSubscription(id: string): Promise<Subscription> {
    return fhirFetch<Subscription>(`Subscription/${id}`);
}

export async function listSubscriptions(): Promise<Subscription[]> {
    const bundle = await fhirFetch<Bundle>("Subscription", { _count: "100", _sort: "-_lastUpdated" });
    return (bundle.entry ?? [])
        .map((e) => e.resource as Subscription)
        .filter((r): r is Subscription => r?.resourceType === "Subscription");
}

export async function createSubscription(input: NewSubscriptionInput): Promise<Subscription> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Subscription`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildSubscriptionBody(input)),
    });
    if (!res.ok) throw new Error(`Failed to create subscription: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Subscription>;
}

export async function updateSubscription(id: string, input: NewSubscriptionInput): Promise<Subscription> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Subscription/${id}`, {
        method: "PUT",
        headers: await authHeaders({ "Content-Type": "application/fhir+json", Accept: "application/fhir+json", prefer: "return=representation" }),
        body: JSON.stringify(buildSubscriptionBody(input, id)),
    });
    if (!res.ok) throw new Error(`Failed to update subscription: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Subscription>;
}

export async function deleteSubscription(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Subscription/${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete subscription: ${res.status}`);
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function subscriptionDisplayName(sub: Subscription): string {
    return sub.reason || sub.criteria || sub.id || "Unnamed Subscription";
}

export function subscriptionStatusColor(sub: Subscription): StatusColor {
    const map: Record<string, StatusColor> = {
        active:    "green",
        requested: "amber",
        error:     "red",
        off:       "slate",
    };
    return map[sub.status ?? ""] ?? "muted";
}

// ─── Backport extension accessors ─────────────────────────────────────────────

function _subRaw(sub: Subscription) {
    return sub as unknown as Record<string, unknown>;
}

export function subscriptionFilterCriteria(sub: Subscription): string | null {
    const el = _subRaw(sub)._criteria as { extension?: { url: string; valueString?: string }[] } | undefined;
    return el?.extension?.find((e) => e.url === BP_FILTER)?.valueString ?? null;
}

export function subscriptionHeartbeat(sub: Subscription): number | null {
    const ch = (_subRaw(sub).channel ?? {}) as Record<string, unknown>;
    const exts = (ch.extension as { url: string; valueInteger?: number }[] | undefined) ?? [];
    return exts.find((e) => e.url === BP_HEARTBEAT)?.valueInteger ?? null;
}

export function subscriptionPayloadContent(sub: Subscription): string | null {
    const ch = (_subRaw(sub).channel ?? {}) as Record<string, unknown>;
    const el = ch._payload as { extension?: { url: string; valueCode?: string }[] } | undefined;
    return el?.extension?.find((e) => e.url === BP_CONTENT)?.valueCode ?? null;
}

export function subscriptionToFormState(sub: Subscription): SubscriptionFormState {
    return {
        status:          sub.status ?? "requested",
        reason:          sub.reason ?? "",
        topic:           sub.criteria ?? "",
        filterCriteria:  subscriptionFilterCriteria(sub) ?? "",
        channelType:     sub.channel?.type ?? "rest-hook",
        endpoint:        sub.channel?.endpoint ?? "",
        payload:         sub.channel?.payload ?? "application/fhir+json",
        content:         subscriptionPayloadContent(sub) ?? "",
        heartbeatPeriod: subscriptionHeartbeat(sub)?.toString() ?? "",
        headers:         sub.channel?.header ?? [],
        end:             sub.end ? sub.end.slice(0, 16) : "",
    };
}

// ─── Notification bundles ─────────────────────────────────────────────────────

export async function getNotificationBundles(count = 50): Promise<Bundle[]> {
    const outer = await fhirFetch<Bundle>("Bundle", {
        _tag: NOTIFICATION_TAG,
        _sort: "-_lastUpdated",
        _count: String(count),
    });
    return (outer.entry ?? [])
        .map((e) => e.resource as Bundle)
        .filter((r): r is Bundle => r?.resourceType === "Bundle");
}

export async function deleteNotificationBundle(id: string): Promise<void> {
    const res = await fhirRequest(`${getFhirBaseUrl()}/Bundle/${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete notification: ${res.status}`);
}

export interface ParsedNotification {
    bundleId:        string;
    resourceType:    string | null;
    resourceId:      string | null;
    subscriptionRef: string | null;
    timestamp:       string | null;
}

export function parseNotificationBundle(bundle: Bundle): ParsedNotification {
    const first = bundle.entry?.[0]?.resource;
    const status = first?.resourceType === "SubscriptionStatus"
        ? (first as SubscriptionStatus)
        : null;

    const focusRef = status?.notificationEvent?.[0]?.focus?.reference
        ?? bundle.entry?.[1]?.fullUrl
        ?? null;

    let resourceType: string | null = null;
    let resourceId:   string | null = null;
    if (focusRef) {
        const parts = focusRef.split("/");
        resourceId   = parts[parts.length - 1] ?? null;
        resourceType = parts[parts.length - 2] ?? null;
    }

    return {
        bundleId:        bundle.id ?? "",
        resourceType,
        resourceId,
        subscriptionRef: status?.subscription?.reference ?? null,
        timestamp:       status?.notificationEvent?.[0]?.timestamp
                         ?? bundle.meta?.lastUpdated
                         ?? null,
    };
}

// ─── Resource route map ───────────────────────────────────────────────────────

// Maps FHIR resource types to their UI route prefix.
export const FHIR_RESOURCE_ROUTES: Record<string, string> = {
    Encounter:         "/encounters",
    Patient:           "/patients",
    Appointment:       "/appointments",
    Observation:       "/observations",
    MedicationRequest: "/medications",
    ServiceRequest:    "/orders",
    DiagnosticReport:  "/reports",
    Task:              "/tasks",
    Flag:              "/flags",
    Immunization:      "/immunizations",
    Subscription:      "/subscriptions",
    Location:          "/locations",
    Organization:      "/organizations",
    Practitioner:      "/practitioners",
    Device:            "/devices",
    HealthcareService: "/healthcare-services",
};
