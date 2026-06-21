# Pyronis EMR — Implementation Task Register

> Derived from `MISSING_FEATURES.md`. Each task has an ID that matches the Claude Code task tracker.  
> Last updated: June 2026. Re-synced after full validation pass — 46 features verified, 3 new gaps surfaced (#73–#75), 3 small fixes completed (#70–#72).

---

## How to read this document

| Column | Meaning |
|---|---|
| **#** | Task ID in the Claude Code task tracker |
| **Priority** | 🔴 High · 🟡 Medium · 🟠 Lower |
| **Effort** | Low (days) · Medium (1–2 weeks) · High (weeks+) |
| **Blocks / Blocked by** | Task IDs of direct dependencies |
| **Ref** | Section in `MISSING_FEATURES.md` |

---

## ✅ Completed

| # | Task | Completed |
|---|---|---|
| 6 | Patient detail page — group 16 tabs into 3 clusters (Clinical / Admin / Documents) | Jun 2026 |
| 7 | Patient header — replace stat badge grid with clinical signal chips | Jun 2026 |
| 8 | Questionnaire / QuestionnaireResponse — PHQ-9, GAD-7, AUDIT-C, intake; dynamic renderer; auto-scoring | Jun 2026 |
| 18 | Unified `StatusPill` component — replaced all inline color maps across 24 components | Jun 2026 |
| 21 | Encounter page — SOAP-first layout with tabbed supporting data (Vitals / Clinical / Documents / Discharge Rx / Details) | Jun 2026 |
| 66 | MRN generation — replaced sequential max-query with `nanoid` `customAlphabet("0123456789", 10)` | Jun 2026 |
| 67 | VisitId generation — replaced sequential max-query with `nanoid` `customAlphabet("0123456789", 10)` | Jun 2026 |
| 69 | Add nanoid-generated identifiers to all 20 FHIR resource create functions (17 resource types) | Jun 2026 |
| 71 | DiagnosticReport categories — add REF (Referral) and GEN (Genetics) to `REPORT_CATEGORY_DISPLAY` | Jun 2026 |
| 72 | Loading skeleton consistency — replace inline skeletons in `practitioners/loading.tsx` and `organizations/loading.tsx` with `ListPageSkeleton` | Jun 2026 |
| 49 | Sidebar active state — consistent `pathname.startsWith()` for nav items, exact match for system items | Jun 2026 |
| 73 | Patient photo upload — `Patient.photo[0]` with file picker, drag-and-drop, webcam capture, resize preview (`PatientPhotoDialog.tsx`) | Jun 2026 |
| 74 | Immunization form — CVX code selector with auto-populate from vaccine name + `series` field (`protocolApplied.series`) | Jun 2026 |
| 75 | DiagnosticReport attachment support — `presentedForm` multi-file upload (PDF/image) in `DiagnosticReportFormDialog` | Jun 2026 |
| 36 | Encounter service type — added `serviceType` to `NewEncounterInput`, `createEncounter`, and `StartEncounterButton` dialog | Jun 2026 |
| 20 | Header breadcrumbs + notification center — path-aware breadcrumbs with home icon; bell dropdown with unread badge, mark-all-read, dismiss | Jun 2026 |
| 33 | Emergency contact quick access — RelatedPerson contacts (codes C/EP/N) shown as a strip in the patient header card with name, relationship, tel: link | Jun 2026 |
| 38 | Encounter search by practitioner — `practitionerQuery` added to `EncounterSearchParams` and `searchEncounters`; practitioner name input in `EncounterSearch` filter bar | Jun 2026 |
| 76 | Auto-assign MRN on edit — `updatePatient` generates a new MRN when the existing resource has none and the form field is empty | Jun 2026 |
| 85 | Triage acuity capture — 5-level ESI selector and chief complaint on encounter start; `Encounter.priority` coded with `https://pyronis.health/fhir/triage-acuity`; acuity pill in `EncounterPatientBar` (Row 2), encounter list table, patient header active-encounter chip, and encounter Details tab | Jun 2026 |
| 77 | Location definitions — CRUD for `Location` resources (hospital, department, ward, room, bed hierarchy); `locationPhysicalType` and `locationType` in `config.json`; list + search page, detail page with hierarchy links, create / edit / delete; `Locations` added to sidebar nav | Jun 2026 |
| 78 | HealthcareService definitions — CRUD for `HealthcareService` resources; category/specialty selectors, day-of-week availability toggles, opening/closing times, linked location and organization; `Services` added to sidebar nav | Jun 2026 |
| 79 | Device definitions — CRUD for `Device` resources; 11 device type options; asset code, UDI, manufacturer, model, serial number fields; linked owner org and location; `Devices` added to sidebar nav | Jun 2026 |
| 80 | Subscription definitions — R4-style FHIR `Subscription` CRUD; criteria string, channel type, endpoint, payload MIME type, HTTP headers, expiry; "Use this app's webhook" shortcut; `Subscriptions` added to sidebar nav | Jun 2026 |
| 80a | Notification receiver — `POST /api/fhir/notify` API route; stores incoming bundles back to the FHIR server with a `notification` tag; serverless-safe (reads auth token from cookie, not localStorage); returns 200 immediately | Jun 2026 |

> Tasks not listed here (practitioners, organizations, sidebar, raw FHIR, referrals, etc.) were completed in earlier sessions before the task register was created. See the **"What is already implemented"** table in `MISSING_FEATURES.md` for the full list.

---

## 🔴 High Priority

| # | Task | Effort | Blocked by | Ref |
|---|---|---|---|---|
| 1 | Allergy–drug conflict alert at prescribing time | Low | — | §2 |
| 2 | Result acknowledgment workflow for DiagnosticReports | Medium | — | §6 |
| 3 | Coverage / insurance plans (`Coverage` FHIR resource) | Medium | — | §7 |
| 4 | ICD-10 code search / autocomplete (+ RxNorm) | Medium | — | §13 |
| 5 | OAuth 2.0 / OIDC SSO — replace JWT paste login | High | — | §15 |
| 9 | CareTeam management — team roster, patient assignment, team-scoped worklist | Medium | — | §24.3 |
| 22 | UI language switching — English / Arabic via `next-intl` (MoPH regulatory requirement) | High | — | §20.1 |
| 53 | Billing — `Coverage`, `ChargeItem`, and `Claim` resources | High | #83 | §7 |
| 83 | Insurance pre-authorization — PA request/response tied to `ServiceRequest` / `MedicationRequest`; approval reference number, payer, status (pending / approved / denied / expired), expiry tracking; PA status badge visible at order entry | Medium | #3 | — |
| 84 | Medical fitness certificate — pre-employment exam template (TB/chest X-ray, HIV, hepatitis B/C, syphilis, general fitness); MoPH-format certificate print/PDF; batch processing support for occupational health clinics | Medium | — | — |
| 88 | HL7 v2 LIS/RIS bridge — ORM message export for lab/rad `ServiceRequest`; ORU inbound parser to auto-create `DiagnosticReport` + `Observation` from lab result messages; implemented as a Next.js API route or sidecar service | High | — | — |
| 89 | Pharmacist verification — verification status on `MedicationRequest` (pending-pharmacist / pharmacist-verified / dispensed); pharmacist role action to verify; block MAR administration recording on unverified orders | Low | — | — |
| 91 | Discharge Against Medical Advice (DAMA) — DAMA flag on encounter discharge (`Encounter.hospitalization.dischargeDisposition` code `aadvice`); required clinician and witness attestation fields; printable MoPH-format DAMA form | Low | — | — |
| 93 | Asia/Qatar timezone handling — all date/time display conversions use `Asia/Qatar` (UTC+3, no DST); fix `toLocaleDateString` and administration-time display across appointments, encounters, and MAR | Low | — | — |

---

## 🟡 Medium Priority

| #  | Task                                                                                   | Effort | Blocked by | Ref          |
|----|----------------------------------------------------------------------------------------|--------|------------|--------------|
| 10 | Collapse 10+ patient header action buttons into "More ▾" menu                          | Low    | —          | §18.3        |
| 11 | Drug–drug interaction checking at order entry                                          | Medium | —          | §2           |
| 12 | Duplicate order detection                                                              | Low    | —          | §2           |
| 13 | Medication reconciliation workflow                                                     | Medium | —          | §1           |
| 14 | Vitals flowsheet and trend charts                                                      | Medium | —          | §11          |
| 15 | Lab / radiology order print form                                                       | Low    | —          | §14          |
| 16 | MFA / 2FA — TOTP or WebAuthn second factor                                             | Medium | #5         | §15          |
| 17 | Immunization schedule recommendations and contraindication checking                    | Medium | —          | §12          |
| 19 | Empty states — add icon, descriptive subtitle, and CTA button                          | Low    | —          | §18.6        |
| 23 | Full RTL layout — sidebar flip, logical CSS properties                                 | Medium | #22        | §20.2        |
| 24 | `Patient/$everything` — one-call export and chart page performance                     | Medium | —          | §23.3        |
| 25 | Resource `_history` — demographics audit timeline                                      | Low    | —          | §23.1        |
| 26 | Patient lists and care team cohorts (`List` / `Group` resource)                        | Low    | —          | §19.2        |
| 27 | Appointment waitlist (`Appointment.status=waitlist`)                                   | Low    | —          | §19.3        |
| 28 | Patient-level procedure history tab                                                    | Low    | —          | §24.16       |
| 29 | Allergy reconciliation at encounter open                                               | Low    | —          | §24.1        |
| 30 | Order → `DiagnosticReport` result linking                                              | Low    | —          | §24.13       |
| 31 | Non-vital Observations — physical exam, social history, smoking status                 | Medium | —          | §24.17       |
| 32 | Additional `Composition` note types — progress note, H&P, nursing note, procedure note | Medium | —          | §24.11       |
| 34 | In-browser preview for PDF / image attachments                                         | Low    | —          | §24.5, §24.6 |
| 35 | Serial diagnostic result comparison and trend table                                    | Medium | —          | §24.5        |
| 37 | Multi-provider encounter participation                                                 | Low    | —          | §24.7        |
| 80b | ↳ Notification inbox UI — browse, filter by resource type / date, and acknowledge received notifications | Low | #80a | — |
| 80c | ↳ Notification routing — navigate to the triggering patient or encounter directly from a notification entry | Low | #80a | — |
| 80d | ↳ Subscription status panel — per-subscription health badge, error count, and last-delivery timestamp | Low | #80 | — |
| 81 | Customizable lab order form — `ServiceRequest` for laboratory tests with configurable test panels (driven by `config.json`), specimen type, priority, clinical indication (ICD-10), ordering provider, and free-text notes | Medium | — | §2 |
| 82 | Customizable radiology order form — `ServiceRequest` for imaging with configurable modality/body-site lists (driven by `config.json`), contrast flag, priority, clinical indication (ICD-10), ordering provider, and clinical notes | Medium | — | §2 |
| 86 | Chronic disease management — `EpisodeOfCare` enrollment for DM / HTN / CKD programs; disease-specific monitoring dashboard (HbA1c trend, BP, eGFR, urine ACR); overdue-screening alert at encounter open | Medium | — | — |
| 87 | Maternal & child health — `EpisodeOfCare` (pregnancy), EDD calculator, antenatal visit schedule with overdue alerts, delivery record (`Procedure` + `Encounter`), postnatal follow-up | High | — | — |
| 90 | Occupational health module — pre-placement exam, periodic health surveillance, return-to-work clearance, exposure incident report; `EpisodeOfCare` + occupation coding | High | — | — |
| 92 | Bilingual informed consent — EN/AR `Consent` form generation (`scope=treatment`), translator attestation field, digital or wet-signature capture; required before procedures are performed | Low | — | §4 |
| 94 | Qatar National Health Number (NHN) — NHN as a second patient identifier alongside QID/MRN; QID format validation (11-digit rule); NHDRP / HIE patient lookup via NHN | Low | — | — |
| 95 | Topic-based subscriptions (R4B) — upgrade Subscription CRUD to R4B topic-based model; define own `R4BSubscription` / `R4BSubscriptionTopic` interfaces (not in `@medplum/fhirtypes` v4.5.x); `SubscriptionTopic` browser + picker in the form; `filterBy[]` criteria builder; `content` / `contentType` / `heartbeatPeriod` fields; note: blocked until `@medplum/fhirtypes` ships R4B Subscription types or we vendor the interfaces | Medium | — | — |

---

## 🟠 Lower Priority

| # | Task | Effort | Blocked by | Ref |
|---|---|---|---|---|
| 39 | Patient transfer workflow and transfer summary print | Medium | — | §19.1 |
| 40 | Patient deceased / death recording dialog | Low | — | §19.4 |
| 41 | `vread` — version-specific resource snapshot viewer | Low | — | §23.2 |
| 42 | Locale-aware dates — Hijri calendar and Arabic-Indic numerals | Low | — | §20.3 |
| 43 | Optimistic locking (`If-Match`) and idempotent patient create (`If-None-Exist`) | Low | — | §23.4 |
| 44 | Practitioner schedule / slot-based availability (`Schedule` + `Slot`) | High | — | §21 |
| 45 | Arabic clinical terminology display (ICD-10 AR, SNOMED AR) | Medium | #22 | §20.4 |
| 46 | Referral receiving organization — replace free-text specialty | Low | #9 | §22 |
| 47 | Icon-only buttons — `aria-label` and `Tooltip` | Low | — | §18.10 |
| 48 | Form Arabic name section divider labels | Low | — | §18.9 |
| 50 | Document versioning and referral document linking | Low | — | §9 |
| 51 | Care plans and patient goals (`CarePlan` + `Goal` resources) | High | #9 | §5 |
| 52 | Bed management and ADT workflow (`Location` + `Encounter.hospitalization`) | High | #77 | §8 |
| 54 | Role-based access control (RBAC) and `AuditEvent` log | High | — | §16 |
| 55 | Terminology server integration — `ValueSet/$expand` for live code suggestions | Medium | — | §13 |
| 56 | SMART on FHIR — standard launch context and OAuth scopes | High | #5 | §15 |
| 57 | Patient portal — self-service access to results, appointments, and medications | High | — | §17 |
| 58 | Server-side PDF generation for print pages | Medium | — | §14 |
| 59 | Paediatric growth charts (weight/height/BMI centiles) | Medium | — | §24.17 |
| 60 | International Vaccination Certificate print | Low | — | §24.14 |
| 61 | Recurring appointments | Medium | — | §24.19 |
| 62 | Telehealth / virtual encounter flag and video link | Low | — | §24.19 |
| 63 | Multi-generation family tree pedigree diagram | High | — | §24.8 |
| 64 | Electronic document signature | High | — | §24.6 |
| 65 | Surgical case management — anaesthetic, laterality, duration, surgical team | Medium | — | §24.16 |

---

## Dependency graph

```
#5  OAuth / OIDC SSO
 ├── blocks #16  MFA / 2FA
 └── blocks #56  SMART on FHIR

#9  CareTeam management
 ├── blocks #46  Referral receiving organization
 └── blocks #51  Care plans & goals (CarePlan + Goal)

#77  Location definitions
 └── blocks #52  Bed management and ADT workflow

#22  UI language switching (next-intl)
 ├── blocks #23  Full RTL layout
 └── blocks #45  Arabic clinical terminology display

#3  Coverage / insurance plans
 └── blocks #83  Insurance pre-authorization

#83  Insurance pre-authorization
 └── blocks #53  Billing (Coverage → PA → ChargeItem/Claim)
```

All other tasks are unblocked and can be started independently.

#96 → #107 are all unblocked and can be started independently.

---

---

## Front-End Architecture Review — Task Details (added Jun 2026)

### #96 · Split `fhir-client.ts` into domain modules
**Priority:** 🔴 High · **Effort:** Medium · **File:** `src/lib/fhir-client.ts` (5,341 lines)

Refactor into a domain-scoped module tree. Add a barrel `index.ts` that re-exports everything so no call sites need to change on day one.

```
src/lib/fhir/
  client.ts        # base fhirRequest(), fhirFetch(), error extraction
  patients.ts      # patient CRUD, search, photo, merge
  encounters.ts    # encounter lifecycle, SOAP notes
  medications.ts   # MedicationRequest, MAR, discharge Rx
  orders.ts        # lab, radiology
  appointments.ts
  subscriptions.ts
  display.ts       # patientDisplayName(), status colors, date formatters
  index.ts         # re-exports for backward compatibility
```

---

### #97 · Add TanStack Query caching layer
**Priority:** 🔴 High · **Effort:** High

Every page navigation triggers fresh FHIR fetches. The dashboard uses `force-dynamic` which disables all Next.js caching. Install `@tanstack/react-query`, wrap the app in `QueryClientProvider`, and migrate page-level fetches to `useQuery` / `useMutation`.

```ts
const { data: patient, isLoading } = useQuery({
  queryKey: ['patient', id],
  queryFn: () => getPatient(id),
  staleTime: 30_000,
})
```

Benefits: background refetch, deduplication of concurrent calls, optimistic updates, built-in devtools.

---

### #98 · Fix silent error swallowing — error boundaries + explicit error states
**Priority:** 🔴 High · **Effort:** High

Multiple components suppress errors with `.catch(() => [])`. In a healthcare context an empty list looks identical to "no data recorded" — a failed medication fetch is invisible to the user.

- Add a React Error Boundary at each major route (`patients/[id]`, `encounters/[id]`)
- Replace silent catches with explicit error state: "Failed to load medications. Retry?"
- Integrate Sentry (or equivalent) for production error visibility

---

### #99 · Move JWT from `localStorage` to `HttpOnly` cookie
**Priority:** 🔴 High · **Effort:** High · **File:** `src/lib/auth.ts`

`localStorage` is readable by any XSS payload. The token should only live in an `HttpOnly; SameSite=Strict; Secure` cookie set server-side.

1. Add `POST /api/auth/login` — forwards credentials to FHIR auth, sets HttpOnly cookie on response
2. Add `POST /api/auth/logout` — clears the cookie
3. Remove all `localStorage.setItem('auth_token', ...)` calls
4. `src/app/layout.tsx` already reads the cookie server-side — keep that path, remove the localStorage fallback

---

### #100 · Add test coverage — Jest + RTL + Playwright + msw
**Priority:** 🔴 High · **Effort:** High

Zero test files exist in the repository.

| Layer | Tool | Target |
|---|---|---|
| Unit | Jest | `display.ts` helpers (`patientDisplayName`, age calc, status colors) |
| Unit | Jest | `searchPatients()` query-routing logic |
| Component | React Testing Library | `PatientForm` — field validation, EMPI lookup, submit |
| Component | React Testing Library | `PatientSearch` — debounce, result rendering |
| E2E | Playwright | Encounter lifecycle: start → SOAP note → close |

Use **msw** (Mock Service Worker) to stub FHIR Bundle responses in unit and component tests.

---

### #101 · Add pagination to all list views
**Priority:** 🟡 Medium · **Effort:** Medium

All queries use a hardcoded `_count` (20–50) with no "Next / Load more" control. FHIR bundles expose a `next` link for cursor-based pagination.

- Implement `fetchNextPage(bundle)` helper in `fhir-client.ts`
- Add pagination controls to: patient search, encounter search, and encounter tab cards (conditions, orders, medications)

---

### #102 · Migrate forms to react-hook-form + Zod
**Priority:** 🟡 Medium · **Effort:** Medium · **File:** `src/components/patients/PatientForm.tsx` and all dialog forms

Manual `useState` across 20+ fields has no per-field dirty/touched tracking and grows fragile. `react-hook-form` gives uncontrolled inputs, built-in dirty tracking, and composable validation. Pair with Zod for both form validation and runtime type-safety on FHIR API responses.

```ts
const patientSchema = z.object({
  givenEn: z.string().min(1, "Required"),
  qid: z.string().regex(/^\d{11}$/, "Must be 11 digits").optional(),
})
```

---

### #103 · Replace base64 photo storage with URL/Binary reference
**Priority:** 🟡 Medium · **Effort:** Low · **File:** `src/lib/fhir-client.ts` — `updatePatientPhoto()`

Storing photos as inline base64 in `Patient.photo[0].data` inflates every `getPatient()` response by hundreds of KB. Upload photos to a CDN or FHIR `Binary` resource and store only the `url` in `Patient.photo[0]`. Fetch lazily in `PatientPhotoAvatar.tsx`.

---

### #104 · Audit and memoize layout component re-renders
**Priority:** 🟠 Lower · **Effort:** Low · **Files:** `src/components/layout/Header.tsx`, `src/components/layout/Sidebar.tsx`

These components mount on every page. Profile with React DevTools Profiler to find re-renders triggered by unrelated parent state. Apply `React.memo` to stable sub-components and `useCallback` for handlers passed as props.

---

### #105 · Move hardcoded `inquiryusername` header to config/env
**Priority:** 🟠 Lower · **Effort:** Low · **File:** `src/lib/fhir-client.ts` — base fetch wrapper

The `inquiryusername: pyronis` header is hardcoded. If this is a tenant identifier or credential, move it to `src/lib/config.json` (under a `server` key) or `NEXT_PUBLIC_FHIR_TENANT` environment variable.

---

### #106 · Close notification real-time gap
**Priority:** 🟠 Lower · **Effort:** Low · **File:** `src/components/layout/Header.tsx` — notification panel

The panel loads notifications once on mount; the badge count goes stale if a webhook fires while the user is on the page. Options (pick one):

- **Short polling:** `setInterval(() => fetchNotifications(), 30_000)` inside a `useEffect` with cleanup
- **SSE:** Stream events from `src/app/api/fhir/notify/route.ts` via `ReadableStream`
- **WebSocket:** Connect directly if the FHIR server supports `$websocket-notify`

---

### #107 · Verify `Select.onValueChange` `v ?? ""` coalescing is consistent
**Priority:** 🟠 Lower · **Effort:** Low

CLAUDE.md documents that `onValueChange` must coerce `null` to `""`. A missed coerce silently stores `null` in state where a string is expected. Audit all usages:

```
grep -rn "onValueChange" src/ --include="*.tsx"
```

Fix any handler that does not apply `v ?? ""`.

---

## Effort summary

| Effort | Count | Task IDs |
|---|---|---|
| Low | 34 | 1, 10, 12, 15, 19, 25, 26, 27, 28, 29, 30, 34, 37, 40, 41, 43, 47, 48, 50, 60, 62, 66, 80b, 80c, 80d, 89, 91, 92, 93, 94, 105, 106, 107, 103 |
| Medium | 32 | 2, 3, 4, 11, 13, 14, 16, 17, 23, 24, 31, 32, 35, 39, 42, 45, 55, 58, 59, 61, 65, 79, 80, 80a, 81, 82, 83, 84, 86, 96, 101, 102 |
| High | 19 | 5, 9, 22, 44, 51, 52, 53, 54, 56, 57, 63, 64, 87, 88, 90, 97, 98, 99, 100 |

---

## Quick-start: highest-value low-effort tasks

Unblocked, Low effort, High or Medium priority — best starting points:

| # | Task | Priority |
|---|---|---|
| 1 | Allergy–drug conflict alert at prescribing time | 🔴 High |
| 89 | Pharmacist verification on MedicationRequest | 🔴 High |
| 91 | Discharge Against Medical Advice (DAMA) flag + form | 🔴 High |
| 93 | Asia/Qatar timezone fix across all date/time display | 🔴 High |
| 10 | Collapse 10+ patient header action buttons into "More ▾" menu | 🟡 Medium |
| 12 | Duplicate order detection | 🟡 Medium |
| 15 | Lab / radiology order print form | 🟡 Medium |
| 19 | Empty states — icon, subtitle, CTA | 🟡 Medium |
| 25 | Resource `_history` audit timeline | 🟡 Medium |
| 26 | Patient lists and care team cohorts | 🟡 Medium |
| 27 | Appointment waitlist | 🟡 Medium |
| 28 | Patient-level procedure history tab | 🟡 Medium |
| 29 | Allergy reconciliation at encounter open | 🟡 Medium |
| 30 | Order → DiagnosticReport result linking | 🟡 Medium |
| 34 | In-browser preview for PDF / image attachments | 🟡 Medium |
| 37 | Multi-provider encounter participation | 🟡 Medium |
| 92 | Bilingual informed consent (EN/AR) with translator attestation | 🟡 Medium |
| 94 | Qatar National Health Number (NHN) identifier + QID validation | 🟡 Medium |
| 96 | Split `fhir-client.ts` into domain modules | 🔴 High |
| 97 | Add TanStack Query caching layer | 🔴 High |
| 98 | Fix silent error swallowing — error boundaries + explicit states | 🔴 High |
| 99 | Move JWT from `localStorage` to `HttpOnly` cookie | 🔴 High |
| 100 | Add test coverage — Jest + RTL + Playwright + msw | 🔴 High |
| 101 | Add pagination to all list views | 🟡 Medium |
| 102 | Migrate forms to react-hook-form + Zod | 🟡 Medium |
| 103 | Replace base64 photo storage with URL/Binary reference | 🟡 Medium |
| 104 | Audit and memoize layout component re-renders | 🟠 Lower |
| 105 | Move hardcoded `inquiryusername` header to config/env | 🟠 Lower |
| 106 | Close notification real-time gap (polling or SSE) | 🟠 Lower |
| 107 | Verify `Select.onValueChange` `v ?? ""` coalescing is consistent | 🟠 Lower |
