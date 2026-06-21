"use client"

import type {
  DiagnosticReport,
  Encounter,
  Immunization,
  MedicationAdministration,
  MedicationRequest,
  Observation,
  Procedure,
  QuestionnaireResponse,
  ServiceRequest,
  Condition,
} from "@medplum/fhirtypes"
import {
  formatDate,
  formatDateTime,
  getEncounterTriageAcuity,
  triageAcuityColor,
  triageAcuityLabel,
} from "@/lib/fhir-client"
import { StatusPill } from "@/components/ui/StatusPill"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Activity, FileText, Info, MapPin, Pill, Stethoscope, Users,
} from "lucide-react"
import { VitalsDisplay } from "@/components/patients/VitalsDisplay"
import { ConditionsManager } from "@/components/encounters/ConditionsManager"
import { MedicationAdminRecord } from "@/components/encounters/MedicationAdminRecord"
import { OrdersManager } from "@/components/orders/OrdersManager"
import { ProceduresManager } from "@/components/encounters/ProceduresManager"
import { EncounterReferralsCard } from "@/components/referrals/EncounterReferralsCard"
import { EncounterReportsCard } from "@/components/reports/EncounterReportsCard"
import { EncounterImmunizationsCard } from "@/components/immunizations/EncounterImmunizationsCard"
import { EncounterQuestionnairesCard } from "@/components/questionnaires/EncounterQuestionnairesCard"
import { DischargeRxManager } from "@/components/encounters/DischargeRxManager"
import { EncounterNonVitalObservationsCard } from "@/components/observations/EncounterNonVitalObservationsCard"
import type { PatientInfo } from "@/components/ui/PatientBanner"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EncounterTabsSectionProps {
  encounter:             Encounter
  patientId:             string
  encounterId:           string
  patientInfo?:          PatientInfo
  observations:          Observation[]
  nonVitalObs:           Observation[]
  conditions:            Condition[]
  inpatientOrders:       MedicationRequest[]
  administrations:       MedicationAdministration[]
  medications:           MedicationRequest[]
  orders:                ServiceRequest[]
  procedureOrders:       ServiceRequest[]
  procedures:            Procedure[]
  encounterReferrals:    ServiceRequest[]
  encounterReports:      DiagnosticReport[]
  encounterImmunizations: Immunization[]
  encounterQRs:          QuestionnaireResponse[]
  dischargeRx:           MedicationRequest[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  "in-progress":      "In Progress",
  "finished":         "Finished",
  "cancelled":        "Cancelled",
  "planned":          "Planned",
  "on-hold":          "On Hold",
  "entered-in-error": "Error",
}

const CLASS_LABELS: Record<string, string> = {
  AMB:  "Ambulatory",
  IMP:  "Inpatient",
  EMER: "Emergency",
  VR:   "Virtual",
  HH:   "Home Health",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EncounterTabsSection({
  encounter,
  patientId,
  encounterId,
  patientInfo,
  observations,
  nonVitalObs,
  conditions,
  inpatientOrders,
  administrations,
  medications,
  orders,
  procedureOrders,
  procedures,
  encounterReferrals,
  encounterReports,
  encounterImmunizations,
  encounterQRs,
  dischargeRx,
}: EncounterTabsSectionProps) {
  const vitalsCount    = observations.length
  const clinicalCount  = conditions.length + inpatientOrders.length + medications.length + orders.length + procedureOrders.length + procedures.length
  const documentsCount = encounterReferrals.length + encounterReports.length + encounterImmunizations.length + encounterQRs.length
  const dischargeCount = dischargeRx.length

  return (
    <Tabs defaultValue="clinical" className="space-y-0">
      {/* Tab bar */}
      <TabsList className="!h-auto w-full justify-start gap-0.5 flex-wrap rounded-b-none border-b bg-muted/60 px-2 py-1.5 [&_[data-slot='tabs-trigger']]:h-8 [&_[data-slot='tabs-trigger']]:gap-1.5">
        <TabsTrigger value="vitals">
          <Activity className="h-3.5 w-3.5" />
          Vitals
          {vitalsCount > 0 && <CountBadge n={vitalsCount} />}
        </TabsTrigger>

        <TabsTrigger value="clinical">
          <Stethoscope className="h-3.5 w-3.5" />
          Clinical
          {clinicalCount > 0 && <CountBadge n={clinicalCount} />}
        </TabsTrigger>

        <TabsTrigger value="documents">
          <FileText className="h-3.5 w-3.5" />
          Documents
          {documentsCount > 0 && <CountBadge n={documentsCount} />}
        </TabsTrigger>

        <TabsTrigger value="discharge">
          <Pill className="h-3.5 w-3.5" />
          Discharge Rx
          {dischargeCount > 0 && <CountBadge n={dischargeCount} />}
        </TabsTrigger>

        <TabsTrigger value="details">
          <Info className="h-3.5 w-3.5" />
          Details
        </TabsTrigger>
      </TabsList>

      {/* ── Vitals & Observations ───────────────────────────────────────────── */}
      <TabsContent value="vitals" className="space-y-4 pt-4">
        {observations.length > 0 ? (
          <Card>
            <CardHeader className="pt-4 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Vital Signs
                <Badge variant="secondary" className="ml-auto font-mono text-xs">
                  {observations.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <VitalsDisplay observations={observations} />
            </CardContent>
          </Card>
        ) : (
          <EmptyTabState icon={<Activity className="h-8 w-8 opacity-20" />} label="No vital signs recorded for this encounter" />
        )}

        <EncounterNonVitalObservationsCard
          patientId={patientId}
          encounterId={encounterId}
          initialObs={nonVitalObs}
          patient={patientInfo}
        />
      </TabsContent>

      {/* ── Clinical ────────────────────────────────────────────────────────── */}
      <TabsContent value="clinical" className="space-y-4 pt-4">
        <ConditionsManager
          encounterId={encounterId}
          patientId={patientId}
          initialConditions={conditions}
          patient={patientInfo}
        />

        <MedicationAdminRecord
          patientId={patientId}
          encounterId={encounterId}
          initialOrders={inpatientOrders}
          initialAdmins={administrations}
          patient={patientInfo}
        />

        {medications.length > 0 && (
          <Card>
            <CardHeader className="pt-4 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-4 w-4 text-muted-foreground" />
                Medications Ordered
                <Badge variant="secondary" className="ml-auto font-mono text-xs">
                  {medications.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medication</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead className="w-36">Authored</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medications.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.medicationCodeableConcept?.coding?.[0]?.display ??
                          m.medicationCodeableConcept?.text ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.status === "active" ? "default" : "secondary"}
                          className="capitalize text-xs"
                        >
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {m.dosageInstruction?.[0]?.text ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(m.authoredOn)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <OrdersManager
          patientId={patientId}
          encounterId={encounterId}
          initialOrders={orders}
          patient={patientInfo}
        />

        <ProceduresManager
          patientId={patientId}
          encounterId={encounterId}
          initialOrders={procedureOrders}
          initialProcedures={procedures}
          patient={patientInfo}
        />
      </TabsContent>

      {/* ── Documents ───────────────────────────────────────────────────────── */}
      <TabsContent value="documents" className="space-y-4 pt-4">
        <EncounterReferralsCard
          patientId={patientId}
          encounterId={encounterId}
          initialReferrals={encounterReferrals}
          patient={patientInfo}
        />

        <EncounterReportsCard
          patientId={patientId}
          encounterId={encounterId}
          initialReports={encounterReports}
          patient={patientInfo}
        />

        <EncounterImmunizationsCard
          patientId={patientId}
          encounterId={encounterId}
          initialImmunizations={encounterImmunizations}
          patient={patientInfo}
        />

        <EncounterQuestionnairesCard
          patientId={patientId}
          encounterId={encounterId}
          initialResponses={encounterQRs}
          patient={patientInfo}
        />
      </TabsContent>

      {/* ── Discharge Rx ────────────────────────────────────────────────────── */}
      <TabsContent value="discharge" className="space-y-4 pt-4">
        <DischargeRxManager
          patientId={patientId}
          encounterId={encounterId}
          initialRx={dischargeRx}
          patient={patientInfo}
        />
      </TabsContent>

      {/* ── Details ─────────────────────────────────────────────────────────── */}
      <TabsContent value="details" className="pt-4">
        <EncounterDetailsCard encounter={encounter} />
      </TabsContent>
    </Tabs>
  )
}

// ─── Encounter Details Card ───────────────────────────────────────────────────

function EncounterDetailsCard({ encounter }: { encounter: Encounter }) {
  const typeLabel  = encounter.type?.[0]?.coding?.[0]?.display ?? encounter.type?.[0]?.text ?? null
  const classLabel = CLASS_LABELS[encounter.class?.code ?? ""] ?? encounter.class?.display ?? encounter.class?.code ?? null
  const hasStart   = !!encounter.period?.start
  const hasEnd     = !!encounter.period?.end

  const duration = hasStart && hasEnd
    ? (function durationLabel(start: string, end: string): string {
        const ms = new Date(end).getTime() - new Date(start).getTime()
        if (ms <= 0) return ""
        const minutes = Math.floor(ms / 60000)
        if (minutes < 60) return `${minutes} min`
        const hours = Math.floor(minutes / 60)
        const rem = minutes % 60
        if (hours < 24) return rem ? `${hours} hr ${rem} min` : `${hours} hr`
        const days = Math.floor(hours / 24)
        return `${days} day${days !== 1 ? "s" : ""}`
      })(encounter.period!.start!, encounter.period!.end!)
    : null

  const statusLabel = STATUS_LABEL[encounter.status ?? ""] ?? (encounter.status ?? "Unknown")

  return (
    <Card>
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="text-base">Encounter Details</CardTitle>
      </CardHeader>
      <CardContent className="pb-5 space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <DetailRow label="Status" value={statusLabel} />
          <DetailRow label="Class" value={classLabel ?? encounter.class?.code ?? "—"} />
          {typeLabel && <DetailRow label="Type" value={typeLabel} />}
          {encounter.serviceType && (
            <DetailRow
              label="Service"
              value={
                encounter.serviceType.coding?.[0]?.display ??
                encounter.serviceType.text ??
                "—"
              }
            />
          )}
          {encounter.priority && (() => {
            const code = getEncounterTriageAcuity(encounter);
            return (
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-1">Triage acuity</dt>
                <dd>
                  {code ? (
                    <StatusPill color={triageAcuityColor(code)} label={triageAcuityLabel(code)} />
                  ) : (
                    <span className="text-sm">
                      {encounter.priority.coding?.[0]?.display ?? encounter.priority.text ?? "—"}
                    </span>
                  )}
                </dd>
              </div>
            );
          })()}
          {hasStart && (
            <DetailRow label="Started" value={formatDateTime(encounter.period?.start)} />
          )}
          {hasEnd && (
            <DetailRow label="Ended" value={formatDateTime(encounter.period?.end)} />
          )}
          {duration && <DetailRow label="Duration" value={duration} />}
        </dl>

        {(encounter.participant?.length ?? 0) > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Participants
              </p>
              <ul className="space-y-1.5">
                {encounter.participant!.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                    <span className="flex-1">
                      {p.individual?.display ?? p.individual?.reference ?? "Unknown"}
                    </span>
                    {p.type?.[0]?.coding?.[0]?.display && (
                      <Badge variant="secondary" className="text-[10px]">
                        {p.type[0].coding[0].display}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {(encounter.location?.length ?? 0) > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Location
              </p>
              <ul className="space-y-1">
                {encounter.location!.map((l, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                    {l.location?.display ?? l.location?.reference ?? "—"}
                    {l.status && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {l.status}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {encounter.hospitalization && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Hospitalization
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {encounter.hospitalization.admitSource && (
                  <DetailRow
                    label="Admit source"
                    value={
                      encounter.hospitalization.admitSource.coding?.[0]?.display ??
                      encounter.hospitalization.admitSource.text ??
                      "—"
                    }
                  />
                )}
                {encounter.hospitalization.dischargeDisposition && (
                  <DetailRow
                    label="Discharge"
                    value={
                      encounter.hospitalization.dischargeDisposition.coding?.[0]?.display ??
                      encounter.hospitalization.dischargeDisposition.text ??
                      "—"
                    }
                  />
                )}
              </dl>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  )
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary leading-none">
      {n}
    </span>
  )
}

function EmptyTabState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-12 text-muted-foreground">
      {icon}
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}
