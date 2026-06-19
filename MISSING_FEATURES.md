# Pyronis EMR — Missing Fundamental Features

> Gap analysis against what a production EMR is expected to provide.  
> Last updated: June 2026. Full re-scan of all 25 routes and 60+ components. Sections 10, 19–24 added June 2026. Re-scanned and updated June 2026 — practitioners, organizations, sidebar, raw FHIR, questionnaires, tab clusters, and clinical signals all now implemented.

---

## What is already implemented

| Feature | FHIR Resource | Notes |
|---|---|---|
| Patient CRUD + photo + bilingual names | `Patient` | English + Arabic names, photo upload/webcam/removal |
| Rich patient demographics | `Patient` | Person type, ethnicity, nationality, birth place, insurance, VIP, cadaveric donor, deceased |
| Patient chart summary | — | `/patients/[id]/chart` — active problems, meds, allergies, vitals, encounter history |
| EMPI / QID deduplication | — | External EMPI query on patient create/edit |
| Appointments — full workflow | `Appointment` | Book, reschedule, cancel, check-in, fulfil; detail page |
| Appointment calendar view | — | Month/week/day calendar (`AppointmentCalendar.tsx`) wired to appointments page |
| Encounters — full workflow | `Encounter` | Start, close, detail page with all clinical sub-sections |
| Vitals / Observations | `Observation` | Batch entry; LOINC-coded; per-encounter and per-patient views |
| Problem List | `Condition` | Active / Resolved groups; promote encounter-diagnosis to problem list |
| Conditions (encounter-level) | `Condition` | ICD-10, clinical + verification status, severity, onset |
| Medications — discharge Rx | `MedicationRequest` | Full dosage builder, printable prescription |
| Medications — inpatient + MAR | `MedicationRequest` + `MedicationAdministration` | Administration recording, routes, sites |
| Orders — Lab, Radiology, Procedure | `ServiceRequest` | Priority, indication, cancel; per-encounter manager |
| Procedures (order + record) | `ServiceRequest` + `Procedure` | Order and record performed procedures |
| SOAP Notes | `Composition` | Per-encounter; four sections with rich-text editor; printable |
| Immunizations | `Immunization` | CVX codes, lot, site, route, dose number, series |
| Flags / Alerts | `Flag` | Categories, colour-coded, active flags on patient header |
| Diagnostic Reports | `DiagnosticReport` | LAB/RAD/PATH/REF/GEN; attachment support |
| Allergies & Intolerances | `AllergyIntolerance` | Substance, category, criticality, reaction severity; dedicated page |
| Family Member History | `FamilyMemberHistory` | Relationships, conditions with onset, deceased status |
| Related Persons / Contacts | `RelatedPerson` | Next of kin, emergency contacts, guarantors |
| Advance Directives / DNR | `Consent` (`scope=adr`) | Critical directives (DNR/DNI/POLST) on patient header |
| Task / Worklist | `Task` | 6 categories; priority/status/due date/assignee; patient tab + global `/tasks` page |
| Document Management | `DocumentReference` | File upload (base64), download, delete; 9 document types; per-patient Documents tab |
| Cross-patient search pages | — | Appointments, Encounters, Observations, Medications, Orders, Immunizations, Flags, Reports |
| Global patient search | — | Header search with live dropdown, "/" shortcut |
| Dashboard | — | Stats: patients, active encounters, medications, conditions; recent patients + encounters |
| Print — Patient Face Sheet | — | Demographics, contacts, problem list, allergies, medications, flags, directives |
| Print — SOAP Note | — | Four sections, patient/encounter info, signature block |
| Print — Discharge Summary | — | Diagnoses, procedures, vitals, discharge meds, follow-up plan, signature blocks |
| Print — Discharge Prescription | — | Medication table, patient instructions, signature blocks |
| Settings / eMPI config | — | FHIR server URL, EMPI URL |
| Authentication (JWT) | — | JWT token login, middleware-protected routes |
| Referrals | `ServiceRequest` | Global list + search (patient/status/priority), patient Referrals tab, encounter Referrals card; create, edit (full field update), inline status dropdown, sidebar nav item; category code `pyronis.health/fhir/service-category\|referral` (not `intent=referral` — not in R4B type set) |
| Loading skeletons + failed-fetch notices | — | `loading.tsx` for all 12 major routes using shared skeleton components (`ListPageSkeleton`, `DashboardSkeleton`, etc.); amber warning banner when any FHIR fetch fails |
| Practitioner directory + roles | `Practitioner`, `PractitionerRole` | CRUD (`/practitioners`, `/practitioners/new`, `/practitioners/[id]`, `/practitioners/[id]/edit`); name, gender, DOB, specialty, qualification, licence, contact; `PractitionerRolesCard` for role-to-organization linking |
| Organization registry | `Organization` | CRUD (`/organizations`, `/organizations/new`, `/organizations/[id]`, `/organizations/[id]/edit`); name, type, identifier, contact, `partOf` hierarchy; `OrgPractitionersCard` for linked practitioners |
| Collapsible sidebar | — | Toggle icon-only (w-16) / full (w-64) mode; state persisted to `localStorage` (`pyronis_sidebar_collapsed`); `PanelLeftClose`/`PanelLeftOpen` toggle; `transition-[width]` animation |
| Raw FHIR JSON viewer | — | `RawFhirDialog` — Braces-icon trigger on each detail page; full JSON in dark `<pre>` block; one-click copy to clipboard |
| Patient detail tab clustering | — | 16 tabs grouped into Clinical / Administrative / Documents & Reports via group selector; `PatientTabsSection.tsx` |
| Clinical signals in patient header | — | High-signal `SignalChip` row: active encounter, active problems, active medications, open tasks, high-criticality allergies; replaces previous stat badge grid |
| Questionnaire / QuestionnaireResponse | `Questionnaire`, `QuestionnaireResponse` | Built-in library: PHQ-9, GAD-7, AUDIT-C, Patient Intake; dynamic form renderer; auto-scoring with severity labels; patient Questionnaires tab; `/questionnaires` library page |

---

## 1. Medication Reconciliation

Medications are captured for three distinct contexts (inpatient orders, discharge Rx, general) but there is no reconciliation step that compares the pre-admission medication list against what is being prescribed at discharge.

| Feature | FHIR Resource | Notes |
|---|---|---|
| Pre-admission medication list | `MedicationRequest` (context=pre-admission) | Capture what the patient was taking before admission |
| Reconciliation review | `MedicationRequest.status` | Side-by-side: home meds vs. discharge meds — continue / stop / change |
| Reconciliation sign-off | `Task` or `Composition` | Clinician attestation that reconciliation was performed |

---

## 2. Clinical Decision Support

All the underlying data exists; none of it is cross-checked at entry time.

| Feature | Notes |
|---|---|
| Allergy–drug conflict alert | At prescribing time, cross-check `MedicationRequest` substance against `AllergyIntolerance` — both resources already exist |
| Drug–drug interaction checking | Requires an interaction database (e.g., RxNorm API, DrugBank); alert at order entry |
| Duplicate order detection | Warn when the same lab test or medication is ordered within a configurable window |
| Dosing range checks | Flag doses outside age/weight-adjusted safe range |
| Critical vital sign alerts | ✅ **Implemented** — `checkVitalAlerts()` in `fhir-client.ts`; alert panel in `RecordVitalsButton` after save (critical = red, abnormal = amber) |

---

## 3. Referrals

✅ Core referral workflow is implemented. Remaining gaps are noted below.

`ServiceRequest` with category `pyronis.health/fhir/service-category|referral` is used (not `intent=referral`, which is absent from the medplum R4B type set). Orders are filtered to exclude referral resources via `isReferralResource()`.

| Feature | FHIR Resource | Notes |
|---|---|---|
| ✅ Referral creation | `ServiceRequest` | `CreateReferralDialog` — specialty (17 options + free-text Other), priority, reason, notes, optional encounter link; `defaultEncounterId` prop locks to encounter when opened from encounter page |
| ✅ Referral editing | `ServiceRequest` | `EditReferralDialog` — pencil trigger per row, pre-populates all fields, calls `updateReferral()` which preserves status |
| ✅ Referral workflow tracking | `ServiceRequest.status` | Inline status Select in `PatientReferralsTab` and `EncounterReferralsCard`; draft → active → on-hold → completed → revoked |
| ✅ Patient Referrals tab | — | `PatientReferralsTab` in patient chart; fed from `getPatientReferrals()` |
| ✅ Encounter Referrals card | — | `EncounterReferralsCard` in encounter detail; fed from `getEncounterReferrals()`; new referral auto-linked to encounter |
| ✅ Global referrals page | — | `/referrals` — search by patient name, status, priority; links to patient record |
| Attached referral letter / report | `DocumentReference` linked to `ServiceRequest` | Not implemented — no way to attach a file or generate a letter from a referral |
| External provider directory | — | Specialty is free-text; no provider lookup, NPI search, or receiving-provider assignment |
| Accept / reject acknowledgement | `ServiceRequest.status` | No structured accept/reject flow from the receiving party — status is set manually |

---

## 4. Consent & Legal

Advance directives are implemented. Standard informed consent and data-sharing authorisations are not.

| Feature | FHIR Resource | Notes |
|---|---|---|
| Procedure-level informed consent | `Consent` (`scope=treatment`) | Capture patient consent before procedures |
| HIPAA / data-sharing authorisations | `Consent` (`scope=patient-privacy`) | Required for regulatory compliance in most jurisdictions |

---

## 5. Care Plans & Goals

| Feature | FHIR Resource | Notes |
|---|---|---|
| Care plans | `CarePlan` | Activities, responsible team, review dates, linked to conditions |
| Patient goals | `Goal` | Target values, due dates, achievement status |
| Order sets / clinical pathways | `PlanDefinition` | Pre-built sets of orders for common presentations |

---

## 6. Results Management Workflow

DiagnosticReports are recorded and displayed but there is no acknowledgment or routing step.

| Feature | FHIR Resource | Notes |
|---|---|---|
| Result acknowledgment | `DiagnosticReport.status` + `Task` | Ordering provider must actively sign off on results |
| Critical value flagging | `Observation.interpretation` (AA / LL / HH codes) | Immediate alert for panic values |
| Result routing queue | `Task` → assigned practitioner | Unreviewed-results worklist so nothing is missed |

---

## 7. Billing & Coding

Insurance is stored as a plain-text extension. There is no structured billing resource.

| Feature | FHIR Resource | Notes |
|---|---|---|
| Coverage / insurance plans | `Coverage` | Structured payer, policy number, group, member ID, period |
| Charge capture | `ChargeItem` | Links clinical events (procedures, meds, labs) to billable items |
| Insurance claim generation | `Claim` + `ClaimResponse` | Full billing cycle |

---

## 8. Bed Management (Inpatient)

| Feature | FHIR Resource | Notes |
|---|---|---|
| Bed census / room assignment | `Location` | Wards, rooms, beds as FHIR Locations |
| ADT workflow | `Encounter.hospitalization` | Admit, discharge, transfer tracking |
| Bed availability view | `Location.status` | Real-time occupancy dashboard |

---

## 9. Document Management (Partial)

Basic upload/download/delete of arbitrary files is implemented via `DocumentReference`. Remaining gaps:

| Feature | FHIR Resource | Notes |
|---|---|---|
| Discharge summary document | `Composition` (type: discharge-summary) | Structured FHIR document distinct from the print page currently generated |
| Document versioning | `DocumentReference.relatesTo` | Superseded / amended document chains |
| Inbound referral documents | `DocumentReference` | Linking received documents to referral `ServiceRequest` |

---

## 10. Patient Merge & Duplicate Management

EMPI/QID deduplication runs at patient creation time but does not cover records that already exist as separate entries (created before EMPI was active, created via different channels, or mismatched on QID). No UI exists to identify, review, or merge duplicate patients.

| Feature | FHIR Resource | Notes |
|---|---|---|
| Duplicate detection list | `Patient.link` | Surface patients whose name+DOB or QID overlap; show a "Possible Duplicates" review queue |
| Side-by-side merge review | — | Compare two patient records across demographics, identifiers, clinical data before committing a merge |
| Merge operation | `Patient.link` (`type=replaced-by`) | Mark the losing record as inactive (`active=false`) and link it to the surviving record; surviving record absorbs all identifiers |
| Clinical data re-link | `Encounter`, `Observation`, `MedicationRequest`, etc. | All clinical resources referencing the merged-away patient ID must be re-pointed to the surviving patient |
| Merge audit trail | `AuditEvent` | Record who merged what and when; reversibility note if the server does not support `$merge` |
| Unmerge / split | `Patient.link` (remove) | Allow a merge to be undone if performed in error — remove the `replaced-by` link and restore `active=true` |

**FHIR mechanism:** HAPI FHIR exposes a custom `Patient/$merge` operation; as a fallback the UI can write `Patient.link` entries manually and rely on the server to handle referencing. R4B type set does not require a dedicated server-side merge operation — client-side re-linking is sufficient.

---

## 11. Vitals Flowsheet & Trending

Vitals are displayed as a flat list / grid of the latest value per type. There is no time-series view or graphing library installed.

| Feature | Notes |
|---|---|
| Multi-encounter flowsheet table | Horizontal date columns, vertical vital parameters — spot trends at a glance |
| Trend charts | Line charts for BP, HR, SpO₂, temperature, weight (no charting library is currently installed) |
| Normal range bands | Visual highlight when a value falls outside the expected range |
| Unit conversion | e.g., °C ↔ °F, kg ↔ lb |

---

## 12. Immunization Schedule & Recommendations

Immunizations are recorded in full detail but there is no schedule enforcement.

| Feature | Notes |
|---|---|
| Age-based immunization schedule | Flag which vaccines are due / overdue based on patient age and recorded history |
| Catch-up schedule guidance | When doses are missed, suggest the appropriate catch-up regimen |
| Contraindication checking | Warn against administering a vaccine when a contraindication is present |
| Adverse event reporting | VAERS or local adverse event capture form |

---

## 13. Terminology Integration

All clinical codes are entered manually or chosen from small hardcoded suggestion lists. No external terminology service is connected.

| Feature | Notes |
|---|---|
| ICD-10 code search / autocomplete | Currently free-text with no real-time lookup; users must know codes |
| SNOMED CT lookup | Condition and procedure codes use SNOMED URIs but are not validated or suggested |
| LOINC code search | LOINC codes for vitals are hardcoded; adding new observation types requires code changes |
| RxNorm / drug database | Medication names come from a hardcoded list (~60 drugs per dialog); no drug database |
| Terminology server integration | `ValueSet/$expand` against an open server (Snowstorm, `tx.fhir.org`) for live code suggestions |

---

## 14. Print & Export (Remaining Gaps)

The four main print pages are implemented. Remaining gaps:

| Feature | Notes |
|---|---|
| Lab / radiology order print | Printable order form to accompany a specimen or send to radiology |
| Printable medication reconciliation form | Structured side-by-side home vs. discharge medication list |
| PDF generation | Browser print dialog is used; no server-side PDF (Puppeteer/pdfkit) for consistent formatting |
| FHIR Bundle export | Patient data export in FHIR Bundle format for portability / data exchange |

---

## 15. SSO & Authentication

Current authentication is a manual JWT paste — acceptable for a development environment, not for production.

| Feature | Notes |
|---|---|
| OAuth 2.0 / OIDC login | SSO via identity provider (Keycloak, Azure AD, Okta) — replaces paste-token flow |
| SAML 2.0 | Required by many hospital identity systems (ADFS, Shibboleth) |
| MFA / 2FA | TOTP or WebAuthn second factor at login |
| Session refresh & timeout | JWT access tokens expire; no silent refresh or timeout warning |
| SMART on FHIR | Standard launch-from-EHR context and OAuth scopes; required for app-store compliance |
| Logout endpoint | Currently requires manual cookie deletion |

---

## 16. Role-Based Access Control & Audit

| Feature | Notes |
|---|---|
| RBAC | Physician, nurse, admin, receptionist — different actions and data visibility per role |
| Audit log | Who viewed or modified each record, with timestamp — FHIR `AuditEvent` |
| Break-glass access | Emergency override with mandatory justification and automatic notification |

---

## 17. Patient Communication

| Feature | FHIR Resource | Notes |
|---|---|
| Appointment reminders | `Communication` | SMS/email trigger on booking or change |
| Secure provider ↔ patient messaging | `Communication` | Threaded in-app messages |
| Patient portal | — | Self-service: view results, appointments, medications, request refills |

---

## 18. UI/UX Improvements

Identified through expert review of all major pages and interaction flows.

### ✅ 18.1 Patient Detail Page — Tab Clustering — Implemented

Tabs are grouped into 3 clusters (Clinical / Administrative / Documents & Reports) via a group selector in `PatientTabsSection.tsx`. Each cluster shows ~5–9 tabs. Questionnaires tab added to Clinical cluster.

### ✅ 18.2 Patient Header — Clinical Signals — Implemented

`SignalChip` row replaces the old stat badge grid. Shows: active encounter (pulsing green), active problems (purple), active medications (purple), open tasks (amber), high-criticality allergies (red). Item counts are now only inside tab labels.

### 18.3 Patient Header — 10+ Action Buttons Overflow

Ten buttons in the top-right row (Book Appointment, Start Encounter, Record Vitals, Chart, Allergies, Face Sheet, Edit, Raw FHIR + more) wrap to two lines on 1024–1280 px screens (the most common laptop resolution). Primary and secondary actions have equal visual weight.

| Fix | Notes |
|---|---|
| Promote 2 primary actions (Start Encounter, Book Appointment), collapse the rest into a "··· More ▾" dropdown | Standard pattern for action toolbars |

### 18.4 ✅ Skeleton Loading Screens + Failed-fetch Notices — Implemented

`loading.tsx` files exist for all 12 major routes, backed by shared skeleton components in `src/components/ui/skeletons.tsx` (`ListPageSkeleton`, `DashboardSkeleton`, `PatientListSkeleton`, `PatientChartSkeleton`). Failed FHIR fetches surface an amber alert banner rather than silently showing an empty state.

Remaining gap:

| Fix | Notes |
|---|---|
| `Suspense` boundaries for individual sections within a page | Currently the whole page waits for all 14–15 fetches; streaming each card independently would improve perceived performance further |

### 18.5 ✅ Unified `StatusPill` Component — Implemented

`src/components/ui/StatusPill.tsx` — single `<StatusPill color={StatusColor} label="..." />` with 14 semantic color tokens. All `*StatusColor()` functions in `fhir-client.ts` now return `StatusColor` instead of raw CSS class strings. Replaced all inline color maps across 24 components (Encounters, Appointments, Orders, Tasks, Flags, DiagnosticReports, Referrals, Medications, Immunizations, Procedures, Conditions, FamilyHistory, AdvanceDirectives).

### 18.6 Bare Empty States — No Icon or CTA

All empty states use the same one-liner:
```
No {label} found
```
No icon, no contextual guidance, no call-to-action. A clinician cannot tell whether data is absent or failed to load.

| Fix | Notes |
|---|---|
| Add a faint icon + descriptive subtitle + optional CTA button to each empty state | e.g. "No medications recorded · + Add Medication" |
| Use different copy for "never had any" vs. "filter returned nothing" | Filter empty states need a "Clear filters" link |

### 18.7 Global Header Underused

The header contains a patient search bar and a notification bell with no count and no panel — it is decorative. On patient-specific pages there is no breadcrumb context, so the user cannot tell at a glance where in the hierarchy they are.

| Fix | Notes |
|---|---|
| Add breadcrumb to header on sub-pages: `Patients / John Smith / Encounters` | Passive context with no click required |
| Implement the notification center or remove the bell | A non-functional UI element erodes trust |
| Move global search to the sidebar (under the logo) so navigation and search are co-located | The current top-left placement is the opposite corner from the data being searched |

### 18.8 ✅ Encounter Page SOAP-First Layout — Implemented

SOAP Note editor is pinned as the primary surface at the top. Supporting data is organized into a five-tab section (`EncounterTabsSection`) below: **Vitals** (vital signs + non-vital observations), **Clinical** (conditions, MAR, meds, orders, procedures), **Documents** (referrals, reports, immunizations, questionnaires), **Discharge Rx**, and **Details** (encounter metadata). Each tab label shows an item-count badge. `page.tsx` is now 271 lines, down from 619.

### 18.9 Form Arabic Name Section Has No Visual Divider

The English name grid and Arabic name grid sit one above the other separated only by a `<Separator />`. The sudden `dir="rtl"` flip can disorient users not expecting it.

| Fix | Notes |
|---|---|
| Add section header labels ("English Name" / "اسم عربي") using the same `text-[11px] uppercase tracking-widest text-muted-foreground` style used by sidebar section labels | Low effort, clear visual separation |

### 18.10 Icon-Only Buttons Lack Accessible Labels

Row action buttons (Mark Complete, Edit, Download, Delete) use only a `title` attribute. `title` tooltips appear after a 500 ms delay and are unreliable with screen readers.

| Fix | Notes |
|---|---|
| Add `aria-label` to every icon-only button | Required for screen reader accessibility |
| Wrap icon buttons in shadcn `<Tooltip>` for visible hover labels | Replaces the native `title` with a consistent, styled tooltip |

### 18.11 Sidebar Active State Ambiguity

The active nav item is computed as `pathname.startsWith(href)`. The "Encounters" sidebar item only highlights when the URL begins with `/encounters` — not when the user is on `/patients/123/encounters/456`. The mental model is inconsistent between the global resource pages and the patient-scoped sub-pages.

| Fix | Notes |
|---|---|
| Define an explicit active-page rule: patient-scoped sub-pages always highlight "Patients" only | Pick one model and apply it consistently |

---

## 19. Patient Administration Gaps

Several routine hospital administration workflows around patient lifecycle are missing, beyond the core CRUD and clinical encounter flow already implemented.

### 19.1 Patient Transfer

No workflow exists to move a patient between departments, wards, or facilities during an active encounter.

| Feature | FHIR Resource | Notes |
|---|---|---|
| Inter-ward / inter-department transfer | `Encounter.location` history | Record each location segment (ward, room, bed) with start/end timestamps within the same encounter |
| Facility-to-facility transfer | `Encounter` + `Organization` | External transfer with receiving facility, transport method, responsible provider handoff |
| Transfer summary printout | `Composition` | Document for the receiving team: active meds, conditions, outstanding orders, advance directives |

### 19.2 Patient Lists & Cohorts

Clinicians currently have no way to define and manage their own patient panel.

| Feature | FHIR Resource | Notes |
|---|---|---|
| My patients list | `List` (`code=patients`) | Physician-scoped list of assigned patients; quick access without a global search |
| Ward / care team list | `List` | All patients currently admitted to a given ward or assigned to a care team |
| Custom cohorts | `Group` | Ad-hoc groupings for quality reviews, research, or follow-up campaigns |
| List notifications | `Subscription` | Alert when any patient on a list has a new critical result or status change |

### 19.3 Appointment Waitlist

When all appointment slots are full, there is no mechanism to queue a patient for the next available opening.

| Feature | FHIR Resource | Notes |
|---|---|---|
| Add to waitlist | `Appointment` (`status=waitlist`) | Record desired appointment type and earliest/latest acceptable dates |
| Waitlist queue view | — | Ordered queue per service/specialty; surface who has been waiting longest |
| Auto-offer on cancellation | — | When a booked appointment is cancelled, notify the top-of-list patient |

### 19.4 Patient Deceased / Death Recording Workflow

`Patient.deceased[x]` is stored but there is no dedicated workflow for recording an in-hospital death.

| Feature | FHIR Resource | Notes |
|---|---|---|
| Death recording dialog | `Patient.deceasedDateTime` | Capture date/time of death, cause, certifying physician; auto-close any open encounter |
| Death certificate data | `Observation` or custom extension | Cause of death (ICD-10 codes), manner, contributing conditions |
| Downstream notifications | `Task` | Auto-create tasks for billing hold, bed release, family notification |

---

## 20. Localization & Internationalization

The clinical data layer already has solid bilingual foundations (English + Arabic patient names, RTL input fields, Unwani-style Arabic address extensions). The UI shell — all labels, error messages, navigation, dialogs, and system text — is hardcoded in English. No i18n library is installed.

### 20.1 UI Language Switching (Arabic / English)

Qatar is a bilingual environment; clinical and administrative staff may prefer Arabic as the primary UI language.

| Feature | Notes |
|---|---|
| i18n library integration | `next-intl` is the idiomatic choice for Next.js 16 App Router (uses React Server Components natively); `i18next` + `react-i18next` is the alternative for client-heavy translation |
| Message catalogue | Extract all UI strings to `messages/en.json` and `messages/ar.json`; 400–600 unique strings estimated across 60+ components |
| Language selector | Persistent preference stored in `localStorage` (`pyronis_ui_lang`); same pattern as `pyronis_empi_base_url` already used for the EMPI URL |
| Fallback to English | If a string is missing from the Arabic catalogue it should fall back gracefully rather than showing a key |

### 20.2 Full RTL (Right-to-Left) Layout

Arabic text direction affects the entire layout, not just the patient name input fields.

| Feature | Notes |
|---|---|
| Tailwind RTL variant activation | Tailwind v4 supports `rtl:` prefix natively; add `dir="rtl"` to `<html>` when Arabic is active and audit each component for `rtl:` overrides |
| Sidebar flip | When RTL, the dark-navy sidebar should dock on the right; all padding and margin directional pairs (`pl-`/`pr-`, `ml-`/`mr-`) must use logical properties (`ps-`/`pe-`, `ms-`/`me-`) |
| Icon mirroring | Directional icons (arrows, chevrons, navigation) must be flipped in RTL; Lucide icons require `scale-x-[-1]` or `rtl:scale-x-[-1]` |
| Print pages | Face sheet, SOAP note, discharge summary all print in English only; RTL print layout required for Arabic |

### 20.3 Locale-Aware Date & Number Formatting

| Feature | Notes |
|---|---|
| Date display locale | All `toLocaleDateString()` calls should receive the active locale (`en-QA` or `ar-QA`) so month names and day-of-week labels follow the correct locale |
| Hijri calendar option | Qatar official calendars mix Gregorian and Hijri; an opt-in Hijri display (via `Intl.DateTimeFormat` with `calendar: 'islamic'`) for encounter and appointment dates would be valuable |
| Arabic-Indic numerals | Arabic locale displays `١٢٣` not `123`; decide whether to use `latn` numbering system explicitly (`nu=latn`) to keep numerals consistent, or allow locale default |
| Timezone handling | Qatar is Asia/Qatar (UTC+3, no DST); FHIR timestamps are UTC — ensure all display conversions use `Asia/Qatar` consistently rather than the browser's local timezone |

### 20.4 Bilingual Clinical Terminology Display

Beyond patient names, clinical codes can carry bilingual displays.

| Feature | Notes |
|---|---|
| Arabic ICD-10 display names | ICD-10 Arabic translations exist (WHO Arabic release); when UI is Arabic, show the Arabic code description alongside or instead of the English |
| Arabic SNOMED CT descriptions | SNOMED International maintains an Arabic translation module; condition and procedure names can be displayed in Arabic when available |
| Bilingual medication names | Store Arabic brand/generic name alongside the English name in the medication list; display per active locale |
| FHIR `Coding.display` in locale | `ServiceRequest`, `Observation`, `Condition`, etc. can carry a `_display` extension with a translation; the FHIR client could populate this at save time |

---

## 21. Practitioner Management

✅ **Core CRUD implemented** (`/practitioners`, `/practitioners/new`, `/practitioners/[id]`, `/practitioners/[id]/edit`). Name, specialty, qualification, licence, gender, DOB, contact; `PractitionerRolesCard` for role-to-organization links. Remaining gaps:

| Feature | FHIR Resource | Notes |
|---|---|---|
| Replace free-text dropdowns | `Practitioner` references | Encounter participant, appointment practitioner, order requester, and task assignee dropdowns still use hardcoded strings; should do live `?name=` search against `Practitioner` resource |
| Practitioner availability / schedule | `Schedule` + `Slot` | Define blocks of availability per practitioner; appointment booking only offers time slots that have a free `Slot`; required for a real book-by-provider flow |
| On-call / coverage assignments | `PractitionerRole.period` | Mark covering practitioner for a period; surfaced in the task worklist and encounter assignments |
| Practitioner print header | — | Auto-populate the "Ordered by / Signed by" fields on printed forms from the logged-in practitioner's `Practitioner` record rather than requiring manual entry |

---

## 22. Organization Management

✅ **Core CRUD implemented** (`/organizations`, `/organizations/new`, `/organizations/[id]`, `/organizations/[id]/edit`). Name, type, identifier, contact, address, `partOf` hierarchy; `OrgPractitionersCard` for linked practitioners. Remaining gaps:

| Feature | FHIR Resource | Notes |
|---|---|---|
| External facility directory | `Organization` (`type=prov`) | Receiving organizations for referrals and transfers — replaces free-text "specialty" input with a structured provider/facility lookup |
| Encounter service type from org | `Encounter.serviceProvider` | Link each encounter to the responsible department `Organization`; enables department-level reporting |
| Referral receiving organization | `ServiceRequest.performer` → `Organization` | Attach the receiving facility to a referral record; currently specialty is free-text only |
| Organization contact card | — | Display organization details (address, phone, hours) on the referral and transfer summary print pages |

---

## 23. FHIR Interaction Gaps

The app uses a subset of FHIR interactions: `read`, `search`, `create`, `update`, and `delete`. Several standard interactions supported by HAPI FHIR are unused but would add meaningful clinical and operational capabilities.

### 23.1 Resource History (`_history`)

HAPI FHIR versions every write automatically. The UI exposes no way to read this history.

| Feature | FHIR Interaction | Notes |
|---|---|---|
| Patient demographics audit timeline | `GET /Patient/{id}/_history` | Show each version with a diff of changed fields (name, DOB, address, insurance); answers "who changed this and when?" |
| Clinical resource change log | `GET /{ResourceType}/{id}/_history` | Useful for `MedicationRequest`, `Condition`, and `AllergyIntolerance` — see when a medication was changed and what it looked like before |
| Version-aware display | `resource.meta.versionId` + `meta.lastUpdated` | Surface the version number and last-updated timestamp on detail views (currently ignored) |
| System-level history feed | `GET /_history` | Power a global "recent changes" audit feed for break-glass and RBAC scenarios (see §16) |

### 23.2 Version-Specific Read (`vread`)

The `vread` interaction (`GET /{ResourceType}/{id}/_history/{vid}`) retrieves the state of a resource as of a specific version. No UI currently uses it.

| Feature | FHIR Interaction | Notes |
|---|---|---|
| "View as of version" | `GET /Patient/{id}/_history/{vid}` | Render a read-only snapshot of a patient or clinical record at any historical version — useful for legal/audit purposes |
| Merge conflict resolution | `vread` on both records | During a patient merge review, surface the exact state of each record at the time of last edit to choose the winning values field-by-field |
| Document integrity | `vread` on `DocumentReference` | Prove that a document's content has not changed since a specific version was signed |

### 23.3 Patient Everything (`$everything`)

`GET /Patient/{id}/$everything` returns a FHIR Bundle containing all resources for that patient in a single call. Currently the app fires 14–15 individual FHIR requests to populate the patient chart page.

| Feature | FHIR Operation | Notes |
|---|---|---|
| Patient data export | `Patient/$everything` | One-button export of the complete patient record as a FHIR Bundle (JSON or NDJSON); satisfies the FHIR Bundle export gap in §14 |
| Chart page performance | `Patient/$everything` | Replace the 14-parallel-fetch pattern with a single `$everything` call; reduces round-trips and avoids partial-load states; the returned Bundle can be decomposed by `resourceType` on the client |
| Continuity of Care Document (CCD) | `Patient/$everything` + `$document` | Compose a structured CCD or C-CDA from the `$everything` Bundle for inter-facility data exchange |
| Date-range scoping | `$everything?start=&end=` | For a discharge summary export, scope the Bundle to the encounter period rather than the full patient history |

### 23.4 Conditional Interactions

FHIR conditional `create` and `update` use `If-None-Exist` and `If-Match` headers to prevent duplicate writes and race conditions. The current FHIR client does not use these.

| Feature | FHIR Interaction | Notes |
|---|---|---|
| Idempotent patient create | `POST /Patient` with `If-None-Exist: identifier=...` | If a patient with the same MRN already exists the server returns the existing record instead of creating a duplicate; prevents double-create on network retry |
| Optimistic locking on edit | `PUT /Patient/{id}` with `If-Match: W/"{versionId}"` | Edit form submits the version it loaded; server rejects with `409 Conflict` if another user saved in the meantime; currently last-write-wins |
| Conditional delete | `DELETE /{type}?identifier=...` | Useful for cleanup utilities and merge workflows; not directly user-facing |

---

## 24. Per-Resource Gap Evaluation

Systematic review of all 20 requested FHIR resources against the current implementation. Gaps already covered in §1–§23 are cross-referenced rather than repeated.

### 24.1 AllergyIntolerance

Implemented: substance, category, criticality, reaction severity, per-patient CRUD.

| Gap | Notes |
|---|---|
| Allergy–drug conflict at prescribing | Cross-check `MedicationRequest` substance against active allergies — see §2 |
| Admission reconciliation | No "allergy reconciliation" step on encounter open: confirm the allergy list is current before ordering meds |
| Duplicate allergy detection | No warning when the same substance is added twice with different category or criticality; can result in contradictory records |
| Delete / retract | No way to fully remove an allergy that was entered in error (only status update to "entered-in-error") |

### 24.2 CarePlan

Not implemented. See §5 for full gap detail.

| Gap | Notes |
|---|---|
| CarePlan CRUD | Create, view, update, close care plans linked to a patient and their conditions |
| Activity tracking | Individual activities (medication, appointment, observation) with `CarePlan.activity.status` |
| Care team linkage | Associate a `CareTeam` with the plan; see §24.3 |
| Timeline / progress view | Gantt-style or milestone view of plan activities over time |

### 24.3 CareTeam

Not implemented. Not covered in §5 (which covers CarePlan and Goal but not CareTeam as a standalone resource).

| Gap | Notes |
|---|---|
| CareTeam CRUD | Create and manage care teams per patient; list members with roles (`participant.role`), on/off period |
| Patient header display | Show the responsible care team (team name + lead clinician) on the patient header and chart |
| CareTeam-scoped worklist | Filter the `/tasks` worklist by care team to show only tasks owned by or relevant to a given team |
| Cross-patient care team view | A single view listing all patients assigned to a given team — equivalent to a ward list |

### 24.4 Condition

Implemented: problem list (active/resolved), encounter-level ICD-10 conditions, promote to problem list.

| Gap | Notes |
|---|---|
| Condition history timeline | Chronological view of status changes (active → remission → resolved) with dates |
| Evidence linking | Attach a `DiagnosticReport` or `Observation` as supporting evidence for a condition |
| Duplicate condition detection | Warn when a condition with the same ICD-10 code is added while a matching active condition already exists |
| Condition merge | When the same condition is recorded multiple times, merge them into a single canonical entry |

### 24.5 DiagnosticReport

Implemented: create, search, LAB/RAD/PATH/REF/GEN categories, attachments, per-patient and per-encounter views.

| Gap | Notes |
|---|---|
| In-browser preview | Attached PDFs and images open as a download only; an inline preview (`<iframe>` or `<img>`) would eliminate the extra step |
| Result acknowledgment workflow | Ordering provider must sign off on results — see §6 |
| Critical value flagging | `Observation.interpretation` AA/LL/HH codes drive immediate alert — see §6 |
| Serial result comparison | No side-by-side or trend view for the same test over multiple encounters (e.g., Hb 10.2 → 9.8 → 11.1) |
| Observation-level results | Individual result values inside a report are stored only as a free-text string; structured `Observation` items within a `DiagnosticReport.result` are not recorded |

### 24.6 DocumentReference

Implemented: file upload (base64), download, delete, 9 document types, per-patient Documents tab.

| Gap | Notes |
|---|---|
| In-browser PDF / image preview | Same as DiagnosticReport — currently download only |
| Document versioning | `DocumentReference.relatesTo` to track amended/superseded chains — see §9 |
| Encounter-scoped documents | Documents are stored per patient; there is no way to tag a document to a specific encounter so it appears in that encounter's view |
| Bulk upload | Only single-file upload; no multi-file selection |
| Electronic signature | Signed documents (consent forms, discharge summaries) carry no cryptographic attestation |

### 24.7 Encounter

Implemented: start, close, SOAP notes, vitals, conditions, MAR, orders, procedures, reports, immunizations, discharge Rx, referrals, print pages.

| Gap | Notes |
|---|---|
| Encounter type / service type | `Encounter.type` and `Encounter.serviceType` are not captured or displayed; affects reporting and scheduling |
| Virtual / telemedicine encounter | No flag or video-link field for telehealth visits |
| Multi-provider participation | `Encounter.participant` supports multiple practitioners with roles (admitting, consulting, attending); currently only one participant is recorded |
| Encounter search by practitioner | Global `/encounters` search filters by patient name only; there is no filter by attending practitioner |
| Inter-ward transfer tracking | Multiple `Encounter.location` segments for transfer — see §19.1 |
| Hospital service / department | `Encounter.serviceProvider` (`Organization`) links the encounter to a department — see §22 |

### 24.8 FamilyMemberHistory

Implemented: create, update, relationships, conditions, deceased status, per-patient tab.

| Gap | Notes |
|---|---|
| Multi-generation visualization | A pedigree / family tree diagram; currently just a flat list |
| Genetic risk calculation | Derive population-risk flags (e.g., familial hypercholesterolaemia, BRCA risk) from recorded conditions |
| Condition-to-prevention linkage | When a first-degree relative has condition X, suggest preventive screening orders |

### 24.9 Goal

Not implemented. See §5 for full gap detail.

| Gap | Notes |
|---|---|
| Goal CRUD | Create goals linked to a patient and optionally a `Condition`; target value, due date, responsible practitioner |
| Progress tracking | `Goal.achievementStatus` with progress notes over time |
| Goal-to-care-plan linkage | Link goals to `CarePlan.goal` references |

### 24.10 Communication

Not implemented. See §17 for full gap detail.

| Gap | Notes |
|---|---|
| Provider-to-provider messaging | Internal structured messages (`Communication`) tied to a patient or encounter |
| Patient notification log | Track SMS/email appointment reminders sent and their delivery status |
| Communication audit | Surface sent/received communications in the patient chart so the full interaction history is visible |

### 24.11 Composition (SOAP / Clinical Notes)

Partially implemented: SOAP notes use `Composition` under the hood.

| Gap | Notes |
|---|---|
| Additional note types | Progress notes, nursing notes, H&P (History & Physical), procedure notes — all use `Composition` with different `type` codes; currently only SOAP is supported |
| Note signing / co-signing | Attestation that a note was reviewed and approved by an attending; links to `Practitioner` |
| Discharge summary as `Composition` | The printable discharge summary is HTML-only; a structured `Composition` resource for data exchange is not written — see §9 |
| Amendment / addendum workflow | After a note is finalized, append an addendum rather than overwriting |
| Note templates | Specialty-specific templates (cardiology, orthopaedics) pre-populate the SOAP sections |

### 24.12 Questionnaire & QuestionnaireResponse

✅ **Core workflow implemented.** Built-in library: PHQ-9 (0–27, Minimal/Mild/Moderate/Moderately Severe/Severe), GAD-7 (0–21), AUDIT-C (0–12, positive/negative screen), Patient Intake Form. Dynamic form renderer handles `choice`, `boolean`, `integer`, `text`, `string`, `group`, `display` item types. `QuestionnaireResponse` stored on FHIR server. Patient Questionnaires tab in Clinical group. Auto-scoring with colour-coded severity badges. `/questionnaires` library page.

Remaining gaps:

| Gap | Notes |
|---|---|
| Pre-visit intake link | Send a questionnaire link to a patient before an appointment; populate the encounter automatically on arrival |
| Response → Condition linkage | PHQ-9 score ≥ 10 should suggest creating a `Condition` for depression screening |
| Custom questionnaires | No way to define a new questionnaire in the UI; only the 4 built-in definitions are available |
| ✅ Encounter-linked responses | `EncounterQuestionnairesCard` added to encounter detail page; fetches via `encounter=Encounter/{id}` search param; "Start" opens the full questionnaire picker with responses linked to the encounter |
| Server-stored Questionnaires | Definitions are TypeScript constants only; they are not written to the FHIR server as `Questionnaire` resources |

### 24.13 ServiceRequest (Orders & Referrals)

Implemented: lab orders, radiology orders, procedure orders, referrals (all as `ServiceRequest`).

| Gap | Notes |
|---|---|
| Order → result linking | No programmatic link from a lab `ServiceRequest` to the `DiagnosticReport` that fulfils it; result routing must be done manually |
| Order acknowledgment | No confirmation that the receiving lab/radiology department received and accepted the order |
| Prior authorisation tracking | Insurance pre-auth for high-cost orders; not captured anywhere |
| Order set / pathway | Pre-built sets of orders for common clinical scenarios — see §5 |
| External routing | Orders are recorded in FHIR only; there is no HL7 v2 ORM/ORU or FHIR `$submit` integration to route orders to a real LIS/RIS |
| Order print form | Printable requisition for specimen labels and radiology request forms — see §14 |

### 24.14 Immunization

Implemented: CVX codes, lot, site, route, dose, series, per-encounter and per-patient views.

| Gap | Notes |
|---|---|
| Schedule enforcement / forecast | Age-based schedule; overdue / due / upcoming indicators — see §12 |
| Contraindication checking | Warn against administering when a contraindication exists — see §12 |
| VFC / funding eligibility | Vaccines For Children eligibility flag is a required field in many public health submissions |
| VFEND / VAERS adverse event capture | Structured adverse event form linked to the administered `Immunization` |
| International Certificate of Vaccination | Print/export a WHO-compliant Yellow Card or equivalent for travel medicine |

### 24.15 Patient

Implemented: full demographics CRUD, photo, bilingual names, merge, chart, face sheet, EMPI/QID.

| Gap | Notes |
|---|---|
| EMPI duplicate detection queue | Existing patients that share name+DOB or QID surface only on create/edit; no background scan or review queue for records created before EMPI was active |
| $everything export | Single-call patient data export — see §23.3 |
| Demographics history (_history) | Who changed which field and when — see §23.1 |
| Death recording dialog | Structured capture of time/cause of death — see §19.4 |
| Patient transfer | Inter-ward/facility move during active encounter — see §19.1 |
| Patient lists / cohort | Physician-scoped panel, ward list — see §19.2 |
| Minor / guardian linkage | Flag patients under 18 and surface the legal guardian (`RelatedPerson.relationship=GUARD`) more prominently |

### 24.16 Procedure

Partially implemented: `ServiceRequest` (procedure order) and `Procedure` (recorded result) within the encounter page.

| Gap | Notes |
|---|---|
| Patient-level procedure history | No `/patients/[id]/procedures` tab or view; a patient's full surgical and procedure history is not visible without scrolling through each individual encounter |
| Standalone procedure page | Cross-patient `/procedures` search page (analogous to `/orders`) does not exist |
| Procedure scheduling | Pre-booking a procedure before the encounter exists; today procedures are always recorded after the fact |
| Surgical case management | Anaesthetic type, laterality, duration, blood loss, surgical team — extended `Procedure` fields not captured |
| Procedure note template | Post-operative or procedure note as a `Composition` linked to the `Procedure` resource |

### 24.17 Observation

Implemented: vitals (LOINC-coded), batch entry, per-encounter and cross-patient view.

| Gap | Notes |
|---|---|
| Non-vital observations | Physical exam findings, social history (smoking status, alcohol use, exercise), functional status — all map to `Observation` but have no entry form |
| Trend charts | Line charts for serial values — see §11 |
| Reference range indicators | Normal range bands per LOINC code; highlight out-of-range values inline |
| Growth charts | Paediatric weight-for-age, height-for-age, BMI-for-age plotted against WHO / CDC centile curves |
| Laboratory result Observations | Individual result items inside a `DiagnosticReport` are stored as free text; structured `Observation` items with `valueQuantity` + LOINC code are not recorded — prevents machine-readable result trending |
| LOINC code search | Adding new vital types requires a code change; a live LOINC autocomplete would allow custom observation types — see §13 |

### 24.18 RelatedPerson

Implemented: create, update, relationship, per-patient tab.

| Gap | Notes |
|---|---|
| Emergency contact quick access | No highlighted emergency contact on the patient header or face sheet; it is buried inside the Contacts tab |
| Guardian / authorised representative | Minors or incapacitated patients require a legal guardian flag; the relationship type is stored but not surfaced as a permission-relevant indicator |
| Encounter companion recording | Who accompanied the patient to this encounter; link a `RelatedPerson` to an `Encounter.participant` |
| Patient portal access grant | A `RelatedPerson` (e.g., parent, spouse) granted access to view the patient's data; no portal access management UI |

### 24.19 Appointment

Implemented: book, reschedule, cancel, check-in, fulfil, calendar, detail page.

| Gap | Notes |
|---|---|
| Appointment waitlist | `Appointment.status=waitlist` — see §19.3 |
| Slot-based availability | Schedule / Slot resources; book only into free slots — see §21 |
| Recurring appointments | Series booking (weekly physiotherapy, monthly chronic disease review); not supported |
| Pre-appointment instructions | Attach preparation instructions (nil-by-mouth, bring medications) to the appointment booking confirmation |
| Telehealth / video link | A video URL in `Appointment.virtualService`; virtual encounter flag |
| Group / class appointments | Multiple patients in one appointment (e.g., diabetes education group) |

---

## 25. MRN Generation — Race Condition & Collision Risk ✅ Implemented

The current `generateNextMRN()` function in `src/lib/fhir-client.ts` (line 112) is fragile in concurrent environments. It queries all patients with an MRN identifier (capped at `_count: "1000"`), finds the numeric maximum, and returns `(max + 1).padStart(6, "0")`. The fallback on error is `Date.now().slice(-6)`.

### Problems with the current approach

| Problem | Description |
|---|---|
| **Race condition** | Two simultaneous patient registrations both read the same max and generate the same MRN — a silent duplicate identifier |
| **1000-patient cap** | `_count: "1000"` means once the register exceeds 1000 patients the max is wrong; MRNs silently collide with existing ones |
| **Broken fallback** | `Date.now().slice(-6)` is a 6-digit timestamp fragment; two registrations within the same millisecond produce identical fallback MRNs |
| **Predictable / enumerable** | Sequential MRNs (000123, 000124 …) reveal registration volume and allow patient record enumeration |

### Option evaluation

#### UUID v4 (`crypto.randomUUID()`)
Zero-dependency (built into browsers and Node.js). Collision probability is negligible (2¹²² namespace).

**Not suitable as a clinical MRN.** The output (`3f2504e0-4f89-11d3-9a0c-0305e82c3301`, 36 chars) cannot be dictated over the phone, written on a specimen tube label, or remembered by a patient. Not a viable format for a human-facing identifier.

#### UUID v7 (time-ordered)
Adds a timestamp prefix for sortability. Same usability problem — still 36 characters and not human-readable for clinical staff.

#### nanoID — numeric alphabet, 10 digits ✅ Recommended

```ts
import { customAlphabet } from "nanoid";
const generateMRN = customAlphabet("0123456789", 10);
// → "4782913650"
```

| Property | Value |
|---|---|
| Package | `nanoid` (~140 B gzipped) |
| Alphabet | digits `0–9` only |
| Length | 10 digits |
| Namespace | 10¹⁰ = 10 billion combinations |
| Collision at 10 000 patients | < 0.005% (birthday paradox) |
| Collision at 100 000 patients | ~0.05% |
| Source of entropy | `crypto.getRandomValues` (CSPRNG) |
| Human usability | Fully numeric, dictatable, fits on labels |
| FHIR server round-trip | None — generated entirely client-side |
| Race condition | Eliminated — each call is independent |

10-digit all-numeric MRNs are the standard format in large EMR systems (Epic, Cerner). They are short enough for staff to work with and long enough to be unique for any realistic patient volume.

#### nanoID — alphanumeric, 8 chars (alternative)

Using `customAlphabet("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8)` (34 chars, O/0 and I/1/L excluded) gives 34⁸ ≈ 1.78 trillion combinations in 8 characters. More compact but introduces non-numeric characters that may break downstream label printers or legacy integrations expecting an all-digit MRN. **Not recommended over the 10-digit numeric option.**

### Migration notes

- Existing 6-digit padded MRNs (`000123`) remain valid — they will still be found by identifier search since the system URI (`https://pyronis.health/mrn`) does not change
- `getPatientMRN()`, `patientDisplayName()`, and all search paths are format-agnostic
- The `CLAUDE.md` description ("6-digit zero-padded, sequential") should be updated to reflect the new format
- New patients receive a 10-digit random MRN; old patients keep their 6-digit sequential MRN — no back-fill required

---

## Priority Matrix

| Priority | Feature | Effort |
|---|---|---|
| 🔴 High | Allergy–drug conflict alert at prescribing time | Low — data already exists |
| ✅ Done | Critical vital sign alert at entry time | Implemented |
| 🔴 High | Result acknowledgment workflow | Medium |
| 🔴 High | Coverage / insurance plans (`Coverage` resource) | Medium |
| 🔴 High | ICD-10 / RxNorm terminology autocomplete | Medium |
| 🔴 High | OAuth 2.0 / OIDC SSO (replace JWT paste) | High |
| ✅ Done | Patient detail tab grouping (15 tabs → clusters) | — |
| ✅ Done | Replace 15 stat badges with clinical signals | — |
| ✅ Done | Practitioner directory + `PractitionerRole` (core CRUD) | — |
| 🔴 High | Patient merge / duplicate management | Medium — HAPI `$merge` or client-side `Patient.link` |
| ✅ Done | Skeleton loading screens + failed-fetch notices | — |
| 🟡 Medium | Collapse 7 action buttons into "More" menu | Low |
| 🟡 Medium | Drug–drug interaction checking | Medium — needs external database |
| 🟡 Medium | Duplicate order detection | Low |
| 🟡 Medium | Medication reconciliation workflow | Medium |
| 🟡 Medium | Vitals flowsheet / trend charts | Medium — needs charting library |
| ✅ Done | Referral management (create, edit, status, patient tab, encounter card, global page) | — |
| 🟡 Medium | Lab / radiology order print | Low |
| 🟡 Medium | MFA / 2FA | Medium |
| 🟡 Medium | Immunization schedule recommendations | Medium |
| 🟡 Medium | Unified StatusPill component | Low |
| 🟡 Medium | Empty states with icon + CTA | Low |
| 🟡 Medium | Header breadcrumbs + implement/remove notification bell | Low |
| 🟡 Medium | Encounter page SOAP-first layout (accordion or tabs) | Medium |
| 🟡 Medium | UI language switching (English ↔ Arabic) via `next-intl` | High — ~500 strings to extract |
| 🟡 Medium | Full RTL layout (sidebar flip, logical CSS properties) | Medium — Tailwind `rtl:` variants |
| 🟡 Medium | `Patient/$everything` — one-call export + chart performance | Medium |
| 🟡 Medium | Resource `_history` audit timeline (demographics changelog) | Low — HAPI already versions writes |
| ✅ Done | Organization registry (core CRUD) | — |
| 🟡 Medium | Patient lists / care team cohorts (`List` resource) | Low |
| 🟡 Medium | Appointment waitlist (`Appointment.status=waitlist`) | Low |
| 🟠 Lower | Patient transfer workflow + transfer summary print | Medium |
| 🟠 Lower | Deceased recording dialog + downstream task creation | Low |
| 🟠 Lower | `vread` — version-specific resource snapshot viewer | Low |
| 🟠 Lower | Locale-aware dates (Hijri calendar, Arabic-Indic numerals) | Low |
| 🟠 Lower | Optimistic locking (`If-Match`) + idempotent create (`If-None-Exist`) | Low |
| 🟠 Lower | Practitioner schedule / slot-based availability | High |
| 🟠 Lower | Arabic clinical terminology display (ICD-10 AR, SNOMED AR) | Medium |
| 🟠 Lower | Referral receiving organization (replace free-text specialty) | Low — needs org registry first |
| 🟠 Lower | Icon-only button aria-label + Tooltip | Low |
| 🟠 Lower | Form Arabic section divider labels | Low |
| 🟠 Lower | Sidebar active state rule | Low |
| 🟠 Lower | Document versioning + referral linking | Low |
| 🟠 Lower | Care plans & goals | High |
| 🟠 Lower | Bed management / ADT | High |
| 🟠 Lower | Billing & charge capture | High |
| 🟠 Lower | Full RBAC + audit log | High |
| 🟠 Lower | Terminology server integration | Medium |
| 🟠 Lower | SMART on FHIR | High |
| 🟠 Lower | Patient portal | High |
| 🟠 Lower | PDF generation (server-side) | Medium |
| ✅ Done | Questionnaire / QuestionnaireResponse — PHQ-9, GAD-7, AUDIT-C, intake; auto-scoring | — |
| 🔴 High | CareTeam management — team roster, patient assignment, team-scoped worklist | Medium |
| 🟡 Medium | Patient-level procedure history tab (`/patients/[id]/procedures`) | Low |
| 🟡 Medium | Allergy reconciliation at encounter open | Low |
| 🟡 Medium | Order → DiagnosticReport result linking | Low |
| 🟡 Medium | Non-vital Observations (physical exam, smoking status, social history) | Medium |
| 🟡 Medium | Additional Composition note types (progress note, H&P, nursing note, procedure note) | Medium |
| 🟡 Medium | Emergency contact quick access on patient header | Low |
| 🟡 Medium | In-browser preview for PDF / image attachments (DocumentReference, DiagnosticReport) | Low |
| 🟡 Medium | Serial diagnostic result comparison / trend table | Medium |
| 🟡 Medium | Encounter type / service type capture (`Encounter.type`, `.serviceType`) | Low |
| 🟡 Medium | Multi-provider encounter participation | Low |
| 🟡 Medium | Encounter search by practitioner | Low |
| 🟠 Lower | Growth charts (paediatric weight/height/BMI centiles) | Medium |
| 🟠 Lower | International Vaccination Certificate print | Low |
| 🟠 Lower | Recurring appointments | Medium |
| 🟠 Lower | Telehealth / virtual encounter flag and video link | Low |
| 🟠 Lower | Multi-generation family tree pedigree diagram | High |
| 🟠 Lower | Genetic risk flags from family history | High |
| 🟠 Lower | Electronic document signature | High |
| 🟠 Lower | Surgical case management (anaesthetic, laterality, duration) | Medium |
| ✅ Done | MRN generation — replaced sequential max-query with `nanoid` `customAlphabet("0123456789", 10)` | — |
