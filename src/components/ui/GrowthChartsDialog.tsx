"use client";

import {Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {cn} from "@/lib/utils";
import {buttonVariants} from "@/components/ui/button";
import {Activity, X} from "lucide-react";
import {GrowthCharts} from "@/components/patients/GrowthCharts";
import type {Observation, Patient} from "@medplum/fhirtypes";
import {PatientBanner, PatientInfo} from "@/components/ui/PatientBanner";

interface PatientGrowthDialogProps {
    patient?: Patient | null;
    observations: Observation[];
    patientInfo?: PatientInfo
    variant?: "default" | "outline"

}

export function GrowthChartsDialog({
                                       patient,
                                       observations,
                                       patientInfo,
                                       variant = "outline"
                                   }: PatientGrowthDialogProps) {
    return (
        <Dialog>
            <DialogTrigger className={cn(buttonVariants({variant}), "gap-2")}>
                <Activity className="h-4 w-4"/>
                Growth Chart
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="flex-row items-center justify-between px-5 py-4 border-b shrink-0">
                    <DialogTitle className="font-mono text-base">
                        Growth Chart : {patientInfo && <PatientBanner {...patientInfo} />}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <DialogClose
                            className={cn(
                                buttonVariants({variant: "ghost", size: "icon"}),
                                "h-8 w-8"
                            )}
                        >
                            <X className="h-4 w-4"/>
                        </DialogClose>
                    </div>
                </DialogHeader>
                <GrowthCharts observations={observations} patient={patient}></GrowthCharts>
            </DialogContent>

        </Dialog>
    )
}