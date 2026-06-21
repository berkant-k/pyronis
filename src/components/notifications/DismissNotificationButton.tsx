"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteNotificationBundle } from "@/lib/fhir-client";

export function DismissNotificationButton({ bundleId }: { bundleId: string }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    async function handleDismiss() {
        setDeleting(true);
        try {
            await deleteNotificationBundle(bundleId);
            router.refresh();
        } catch {
            setDeleting(false);
        }
    }

    return (
        <button
            onClick={handleDismiss}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
            aria-label="Dismiss notification"
        >
            {deleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />
            }
        </button>
    );
}
