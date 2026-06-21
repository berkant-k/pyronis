import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSubscription, subscriptionDisplayName, subscriptionToFormState } from "@/lib/fhir-client";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { ArrowLeft, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const sub = await getSubscription(id);
        return { title: `Edit ${subscriptionDisplayName(sub)} | Pyronis EMR` };
    } catch {
        return { title: "Edit Subscription | Pyronis EMR" };
    }
}

export default async function EditSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let defaultValues;
    try {
        const sub = await getSubscription(id);
        defaultValues = subscriptionToFormState(sub);
    } catch {
        notFound();
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href={`/subscriptions/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to subscription
            </Link>
            <div className="flex items-center gap-3">
                <Pencil className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold">Edit Subscription</h1>
                    <p className="text-sm text-muted-foreground">Update subscription settings</p>
                </div>
            </div>
            <SubscriptionForm mode="edit" subscriptionId={id} defaultValues={defaultValues} />
        </div>
    );
}
