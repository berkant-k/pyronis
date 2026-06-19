"use client"

import { useState } from "react"
import Link from "next/link"
import type {
  Patient, Encounter, Observation, Condition, MedicationRequest,
  AllergyIntolerance, Appointment, ServiceRequest, Immunization,
  Flag, DiagnosticReport, FamilyMemberHistory, RelatedPerson,
  Consent, Task, DocumentReference, QuestionnaireResponse,
} from "@medplum/fhirtypes"
import {
  formatDate, formatDateTime,
  appointmentStatusColor, getEncounterVisitId,
  getOrderCategory, orderStatusColor, orderPriorityColor,
} from "@/lib/fhir-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ChevronRight, ShieldAlert, FlaskConical, Scan, AlertTriangle,
} from "lucide-react"
import { VitalsDisplay } from "@/components/patients/VitalsDisplay"
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog"
import { LabOrderDialog } from "@/components/orders/LabOrderDialog"
import { RadOrderDialog } from "@/components/orders/RadOrderDialog"
import { PatientImmunizationsTab } from "@/components/immunizations/PatientImmunizationsTab"
import { PatientFlagsTab } from "@/components/flags/PatientFlagsTab"
import { PatientReportsTab } from "@/components/reports/PatientReportsTab"
import { PatientFamilyHistoryTab } from "@/components/family-history/PatientFamilyHistoryTab"
import { PatientRelatedPersonsTab } from "@/components/related-persons/PatientRelatedPersonsTab"
import { PatientAdvanceDirectivesTab } from "@/components/advance-directives/PatientAdvanceDirectivesTab"
import { PatientProblemListTab } from "@/components/conditions/PatientProblemListTab"
import { PatientTasksTab } from "@/components/tasks/PatientTasksTab"
import { PatientDocumentsTab } from "@/components/documents/PatientDocumentsTab"
import { PatientReferralsTab } from "@/components/referrals/PatientReferralsTab"
import { PatientQuestionnairesTab } from "@/components/questionnaires/PatientQuestionnairesTab"
import { type PatientInfo } from "@/components/ui/PatientBanner"

// ─── types ────────────────────────────────────────────────────────────────────

export interface PatientTabsSectionProps {
  patientId:      string
  patient:        Patient
  patientName:    string
  appts:          Appointment[]
  enc:            Encounter[]
  obs:            Observation[]
  cond:           Condition[]
  meds:           MedicationRequest[]
  orders:         ServiceRequest[]
  allg:           AllergyIntolerance[]
  imms:           Immunization[]
  flags:          Flag[]
  reports:        DiagnosticReport[]
  familyHistory:  FamilyMemberHistory[]
  relatedPersons: RelatedPerson[]
  directives:     Consent[]
  tasks:          Task[]
  documents:      DocumentReference[]
  referrals:      ServiceRequest[]
  responses:      QuestionnaireResponse[]
  failedSections: string[]
}

// ─── tab groups ───────────────────────────────────────────────────────────────

type Group = "clinical" | "admin" | "documents"

const GROUPS: Record<Group, string[]> = {
  clinical:  ["encounters", "vitals", "conditions", "medications", "orders", "referrals", "allergies", "immunizations", "questionnaires"],
  admin:     ["appointments", "tasks", "contacts", "directives", "family-history"],
  documents: ["reports", "flags", "documents"],
}

const GROUP_LABELS: Record<Group, string> = {
  clinical:  "Clinical",
  admin:     "Administrative",
  documents: "Documents & Reports",
}

// ─── main component ───────────────────────────────────────────────────────────

export function PatientTabsSection({
  patientId, patient, patientName,
  appts, enc, obs, cond, meds, orders, allg, imms,
  flags, reports, familyHistory, relatedPersons, directives, tasks, documents,
  referrals, responses,
  failedSections,
}: PatientTabsSectionProps) {
  const [group, setGroup]       = useState<Group>("clinical")
  const [activeTab, setActiveTab] = useState<string>("encounters")

  const patientInfo: PatientInfo = { name: patientName, gender: patient.gender, birthDate: patient.birthDate }

  const openTasks = tasks.filter(
    (t) => t.status === "requested" || t.status === "in-progress" || t.status === "on-hold"
  )

  function handleGroupChange(newGroup: Group) {
    setGroup(newGroup)
    if (!(GROUPS[newGroup] as string[]).includes(activeTab)) {
      setActiveTab(GROUPS[newGroup][0])
    }
  }

  const TAB_LABELS: Record<string, string> = {
    encounters:      `Encounters (${enc.length})`,
    vitals:          `Vitals (${obs.length})`,
    conditions:      `Conditions (${cond.length})`,
    medications:     `Medications (${meds.length})`,
    orders:          `Orders (${orders.length})`,
    referrals:       `Referrals (${referrals.length})`,
    allergies:       `Allergies (${allg.length})`,
    immunizations:   `Immunizations (${imms.length})`,
    appointments:    `Appointments (${appts.length})`,
    tasks:           `Tasks (${openTasks.length})`,
    contacts:        `Contacts (${relatedPersons.length})`,
    directives:      `Directives (${directives.length})`,
    "family-history":`Family History (${familyHistory.length})`,
    questionnaires:  `Questionnaires (${responses.length})`,
    reports:         `Reports (${reports.length})`,
    flags:           `Flags (${flags.length})`,
    documents:       `Documents (${documents.length})`,
  }

  return (
    <div className="space-y-3">
      {/* Failed-fetch notice */}
      {failedSections.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Could not load: <strong>{failedSections.join(", ")}</strong>. Some data may be missing.
          </span>
        </div>
      )}

      {/* Group selector */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
        {(Object.keys(GROUPS) as Group[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => handleGroupChange(g)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150",
              g === group
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Tabs — controlled so group switch can reset active tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="!h-auto flex-wrap w-full justify-start gap-y-1 py-1 [&_[data-slot='tabs-trigger']]:h-8">
          {GROUPS[group].map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Clinical */}
        <TabsContent value="encounters">
          <EncountersTab encounters={enc} />
        </TabsContent>
        <TabsContent value="vitals">
          <VitalsDisplay observations={obs} />
        </TabsContent>
        <TabsContent value="conditions">
          <PatientProblemListTab initialConditions={cond} patientId={patientId} patient={patientInfo} />
        </TabsContent>
        <TabsContent value="medications">
          <MedicationsTab medications={meds} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab orders={orders} patientId={patientId} patientInfo={patientInfo} />
        </TabsContent>
        <TabsContent value="referrals">
          <PatientReferralsTab initialReferrals={referrals} patientId={patientId} encounters={enc} patient={patientInfo} />
        </TabsContent>
        <TabsContent value="allergies">
          <AllergiesTab allergies={allg} patientId={patientId} />
        </TabsContent>
        <TabsContent value="immunizations">
          <PatientImmunizationsTab initialImmunizations={imms} patientId={patientId} patient={patientInfo} />
        </TabsContent>
        <TabsContent value="questionnaires">
          <PatientQuestionnairesTab initialResponses={responses} patientId={patientId} />
        </TabsContent>

        {/* Administrative */}
        <TabsContent value="appointments">
          <AppointmentsTab appointments={appts} patientId={patientId} patient={patient} />
        </TabsContent>
        <TabsContent value="tasks">
          <PatientTasksTab initialTasks={tasks} patientId={patientId} patientName={patientName} patient={patientInfo} />
        </TabsContent>
        <TabsContent value="contacts">
          <PatientRelatedPersonsTab initialPersons={relatedPersons} patientId={patientId} patient={patientInfo} />
        </TabsContent>
        <TabsContent value="directives">
          <PatientAdvanceDirectivesTab initialDirectives={directives} patientId={patientId} patient={patientInfo} />
        </TabsContent>
        <TabsContent value="family-history">
          <PatientFamilyHistoryTab initialHistory={familyHistory} patientId={patientId} patient={patientInfo} />
        </TabsContent>

        {/* Documents & Reports */}
        <TabsContent value="reports">
          <PatientReportsTab initialReports={reports} patientId={patientId} patient={patientInfo} />
        </TabsContent>
        <TabsContent value="flags">
          <PatientFlagsTab initialFlags={flags} patientId={patientId} patient={patientInfo} />
        </TabsContent>
        <TabsContent value="documents">
          <PatientDocumentsTab initialDocuments={documents} patientId={patientId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── inline tab sub-components ────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      No {label} found
    </div>
  )
}

function AppointmentsTab({
  appointments, patientId, patient,
}: { appointments: Appointment[]; patientId: string; patient: Patient }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <BookAppointmentDialog patientId={patientId} patient={patient} />
      </div>
      {!appointments.length ? (
        <EmptyState label="appointments" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a) => {
                const apptType = a.appointmentType?.text ?? a.appointmentType?.coding?.[0]?.display
                const service = a.serviceType?.[0]?.text
                const statusClass = appointmentStatusColor(a.status ?? "")
                return (
                  <TableRow key={a.id} className="group">
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDateTime(a.start)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {apptType ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {service ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass}`}>
                        {(a.status ?? "unknown").replace(/-/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.id && (
                        <Link href={`/appointments/${a.id}`} className="text-muted-foreground/40 group-hover:text-primary transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function EncountersTab({ encounters }: { encounters: Encounter[] }) {
  if (!encounters.length) return <EmptyState label="encounters" />
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Visit ID</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {encounters.map((e) => {
            const visitId = getEncounterVisitId(e)
            return (
              <TableRow key={e.id} className="group">
                <TableCell className="font-medium">
                  {e.id ? (
                    <Link href={`/encounters/${e.id}`} className="hover:underline hover:text-primary transition-colors">
                      {e.type?.[0]?.coding?.[0]?.display ?? e.type?.[0]?.text ?? "—"}
                    </Link>
                  ) : (
                    e.type?.[0]?.coding?.[0]?.display ?? e.type?.[0]?.text ?? "—"
                  )}
                </TableCell>
                <TableCell>
                  {visitId
                    ? <span className="font-mono text-xs font-semibold text-primary">VID-{visitId}</span>
                    : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground capitalize">
                  {e.class?.display ?? e.class?.code ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={e.status === "finished" ? "secondary" : "outline"} className="capitalize">
                    {e.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(e.period?.start ?? e.period?.end)}
                </TableCell>
                <TableCell>
                  {e.id && (
                    <Link href={`/encounters/${e.id}`} className="text-muted-foreground/40 group-hover:text-primary transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

function MedicationsTab({ medications }: { medications: MedicationRequest[] }) {
  if (!medications.length) return <EmptyState label="medications" />
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medication</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dosage</TableHead>
            <TableHead>Authored</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {medications.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">
                {m.medicationCodeableConcept?.coding?.[0]?.display ?? m.medicationCodeableConcept?.text ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={m.status === "active" ? "default" : "secondary"} className="capitalize">
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
    </Card>
  )
}

function OrdersTab({ orders, patientId, patientInfo }: { orders: ServiceRequest[]; patientId: string; patientInfo?: PatientInfo }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <LabOrderDialog patientId={patientId} patient={patientInfo} />
        <RadOrderDialog patientId={patientId} patient={patientInfo} />
      </div>
      {!orders.length ? (
        <EmptyState label="orders" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Test / Study</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Ordered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const cat      = getOrderCategory(order)
                const status   = order.status ?? "unknown"
                const priority = order.priority ?? "routine"
                const encRef   = order.encounter?.reference
                const encId    = encRef?.startsWith("Encounter/") ? encRef.slice(10) : undefined
                return (
                  <TableRow key={order.id} className="group">
                    <TableCell>
                      {cat === "lab"
                        ? <FlaskConical className="h-4 w-4 text-purple-500" />
                        : cat === "rad"
                        ? <Scan className="h-4 w-4 text-blue-500" />
                        : null}
                    </TableCell>
                    <TableCell className="font-medium">
                      {encId ? (
                        <Link href={`/encounters/${encId}`} className="hover:underline hover:text-primary transition-colors">
                          {order.code?.text ?? "—"}
                        </Link>
                      ) : (order.code?.text ?? "—")}
                      {order.orderDetail && order.orderDetail.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {order.orderDetail.map((d) => d.text).filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {order.reasonCode?.[0]?.text && (
                        <p className="text-xs text-muted-foreground mt-0.5">{order.reasonCode[0].text}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${orderPriorityColor(priority)}`}>
                        {priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${orderStatusColor(status)}`}>
                        {status === "revoked" ? "cancelled" : status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.authoredOn)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function AllergiesTab({ allergies, patientId }: { allergies: AllergyIntolerance[]; patientId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Link
          href={`/patients/${patientId}/allergies`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Manage Allergies
        </Link>
      </div>
      {!allergies.length ? (
        <EmptyState label="allergies" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Substance</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allergies.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.code?.coding?.[0]?.display ?? a.code?.text ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {a.type ?? "—"}
                  </TableCell>
                  <TableCell>
                    {a.criticality && (
                      <Badge variant={a.criticality === "high" ? "destructive" : "secondary"} className="capitalize">
                        {a.criticality}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {a.clinicalStatus?.coding?.[0]?.code ?? "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
