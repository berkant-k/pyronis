"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSubscription } from "@/lib/fhir-client";

export function DeleteSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteSubscription(subscriptionId);
            router.push("/subscriptions");
            router.refresh();
        } catch {
            setDeleting(false);
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleting}
        >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
        </Button>
    );
}
