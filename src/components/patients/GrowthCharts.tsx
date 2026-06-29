"use client";

import {type ReactNode, useMemo, useState} from "react";
import type {Observation, Patient} from "@medplum/fhirtypes";
import {Activity, Ruler, Scale} from "lucide-react";
import {
    estimateCentile,
    extractGrowthSeries,
    getGrowthReference,
    type GrowthMetric,
    type GrowthReading,
    type GrowthReferenceRow,
} from "@/lib/growth";
import {formatDate} from "@/lib/fhir-client";
import {cn} from "@/lib/utils";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";

const METRICS: Array<{ key: GrowthMetric; label: string; unit: string; icon: typeof Scale }> = [
    {key: "weight", label: "Weight-for-age", unit: "kg", icon: Scale},
    {key: "height", label: "Height-for-age", unit: "cm", icon: Ruler},
    {key: "bmi", label: "BMI-for-age", unit: "kg/m2", icon: Activity},
];

const CENTILES = [
    {key: "p3", label: "P3", className: "stroke-slate-300"},
    {key: "p10", label: "P10", className: "stroke-blue-300"},
    {key: "p50", label: "P50", className: "stroke-primary"},
    {key: "p90", label: "P90", className: "stroke-amber-400"},
    {key: "p97", label: "P97", className: "stroke-red-400"},
] as const;

export function GrowthCharts({
                                 patient,
                                 observations,
                             }: {
    patient?: Patient | null;
    observations: Observation[];
}) {
    const [metric, setMetric] = useState<GrowthMetric>("weight");
    const series = useMemo(
        () => (patient ? extractGrowthSeries(patient, observations) : null),
        [patient, observations]
    );

    if (!patient || !series) return null;
    if (!patient.birthDate || !series.sex) {
        return (
            <GrowthShell>
                <div className="py-8 text-center text-sm text-muted-foreground">
                    Growth charts require birth date and binary recorded sex.
                </div>
            </GrowthShell>
        );
    }

    const active = METRICS.find((m) => m.key === metric) ?? METRICS[0];
    const readings = series[metric];
    const reference = getGrowthReference(metric, series.sex);
    const latest = readings.at(-1);

    return (
        <GrowthShell
            action={
                <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
                    {METRICS.map(({key, label, icon: Icon}) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setMetric(key)}
                            className={cn(
                                "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
                                metric === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5"/>
                            {label.split("-")[0]}
                        </button>
                    ))}
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium">{active.label}</p>
                        <p className="text-xs text-muted-foreground">
                            CDC 2-20 years reference, {series.sex}; centiles P3, P10, P50, P90, P97
                        </p>
                    </div>
                    {latest && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="secondary">{latest.value} {active.unit}</Badge>
                            <Badge variant="outline">{estimateCentile(metric, series.sex, latest)}</Badge>
                            <span className="text-muted-foreground">{formatDate(latest.date)}</span>
                        </div>
                    )}
                </div>

                {readings.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                        No {active.label.toLowerCase()} readings available.
                    </div>
                ) : (
                    <GrowthSvg reference={reference} readings={readings} unit={active.unit}/>
                )}
            </div>
        </GrowthShell>
    );
}

function GrowthShell({
                         children,
                         action,
                     }: {
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-4 w-4 text-muted-foreground"/>
                        Growth Charts
                    </CardTitle>
                    {action}
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function GrowthSvg({
                       reference,
                       readings,
                       unit,
                   }: {
    reference: GrowthReferenceRow[];
    readings: GrowthReading[];
    unit: string;
}) {
    const width = 860;
    const height = 340;
    const pad = {left: 48, right: 24, top: 18, bottom: 40};
    const xMin = 2;
    const xMax = 20;
    const allValues = [
        ...reference.flatMap((r) => [r.p3, r.p10, r.p50, r.p90, r.p97]),
        ...readings.map((r) => r.value),
    ];
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const yMin = Math.floor(rawMin - (rawMax - rawMin) * 0.08);
    const yMax = Math.ceil(rawMax + (rawMax - rawMin) * 0.08);

    const x = (age: number) => pad.left + ((age - xMin) / (xMax - xMin)) * (width - pad.left - pad.right);
    const y = (value: number) => height - pad.bottom - ((value - yMin) / (yMax - yMin)) * (height - pad.top - pad.bottom);
    const pathFor = (key: keyof Omit<GrowthReferenceRow, "ageYears">) =>
        reference.map((row, i) => `${i === 0 ? "M" : "L"} ${x(row.ageYears).toFixed(1)} ${y(row[key]).toFixed(1)}`).join(" ");
    const patientPath = readings.map((r, i) => `${i === 0 ? "M" : "L"} ${x(r.ageYears).toFixed(1)} ${y(r.value).toFixed(1)}`).join(" ");
    const yTicks = Array.from({length: 5}, (_, i) => yMin + ((yMax - yMin) / 4) * i);
    const xTicks = [2, 5, 8, 11, 14, 17, 20];

    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="min-h-[300px] w-full min-w-[620px]" role="img"
                 aria-label="Growth chart">
                <rect x={0} y={0} width={width} height={height} className="fill-background"/>
                {yTicks.map((tick) => (
                    <g key={tick}>
                        <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="stroke-border"
                              strokeDasharray="3 4"/>
                        <text x={pad.left - 10} y={y(tick) + 4} textAnchor="end"
                              className="fill-muted-foreground text-[10px]">
                            {tick.toFixed(0)}
                        </text>
                    </g>
                ))}
                {xTicks.map((tick) => (
                    <g key={tick}>
                        <line x1={x(tick)} x2={x(tick)} y1={pad.top} y2={height - pad.bottom}
                              className="stroke-border/70" strokeDasharray="2 6"/>
                        <text x={x(tick)} y={height - 16} textAnchor="middle"
                              className="fill-muted-foreground text-[10px]">
                            {tick}y
                        </text>
                    </g>
                ))}

                {CENTILES.map(({key, className}) => (
                    <path key={key} d={pathFor(key)} fill="none" strokeWidth={key === "p50" ? 2.4 : 1.6}
                          className={className}/>
                ))}
                <path d={patientPath} fill="none" strokeWidth={2.6} className="stroke-foreground"/>
                {readings.map((r) => (
                    <circle key={`${r.date}-${r.value}`} cx={x(r.ageYears)} cy={y(r.value)} r={4}
                            className="fill-background stroke-foreground" strokeWidth={2}>
                        <title>{`${r.value} ${unit} at ${r.ageYears.toFixed(1)} years`}</title>
                    </circle>
                ))}
                <text x={pad.left} y={height - 3} className="fill-muted-foreground text-[10px]">Age</text>
                <text x={12} y={pad.top + 6} className="fill-muted-foreground text-[10px]">{unit}</text>
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {CENTILES.map(({key, label, className}) => (
                    <span key={key} className="inline-flex items-center gap-1.5">
            <span className={cn("h-0.5 w-5", className.replace("stroke-", "bg-"))}/>
                        {label}
          </span>
                ))}
                <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-foreground"/>
          Patient
        </span>
            </div>
        </div>
    );
}
