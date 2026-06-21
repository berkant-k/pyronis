import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DeviceForm } from "@/components/devices/DeviceForm";

export const metadata: Metadata = { title: "New Device | Pyronis EMR" };

export default function NewDevicePage() {
    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Link href="/devices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Devices
            </Link>
            <h1 className="text-xl font-semibold">Register Device</h1>
            <DeviceForm mode="create" />
        </div>
    );
}
