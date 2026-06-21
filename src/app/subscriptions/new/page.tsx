import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";

export const metadata: Metadata = { title: "New Subscription | Pyronis EMR" };

export default function NewSubscriptionPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Subscriptions
            </Link>
            <h1 className="text-xl font-semibold">New Subscription</h1>
            <SubscriptionForm mode="create" />
        </div>
    );
}
