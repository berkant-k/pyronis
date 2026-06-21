import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDevice, deviceDisplayName, deviceToFormState } from "@/lib/fhir-client";
import { DeviceForm } from "@/components/devices/DeviceForm";
import { ArrowLeft, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    try {
        const dev = await getDevice(id);
        return { title: `Edit ${deviceDisplayName(dev)} | Pyronis EMR` };
    } catch {
        return { title: "Edit Device | Pyronis EMR" };
    }
}

export default async function EditDevicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let defaultValues;
    try {
        const dev = await getDevice(id);
        defaultValues = deviceToFormState(dev);
    } catch {
        notFound();
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href={`/devices/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to device
            </Link>
            <div className="flex items-center gap-3">
                <Pencil className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold">Edit Device</h1>
                    <p className="text-sm text-muted-foreground">Update device information</p>
                </div>
            </div>
            <DeviceForm mode="edit" deviceId={id} defaultValues={defaultValues} />
        </div>
    );
}
