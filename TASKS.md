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
| 100a | Test infrastructure — Jest 29, next/jest, msw v2, Playwright; `jest.config.ts`, `jest.setup.ts`, `playwright.config.ts`, smoke test | Jun 2026 |
| 100b | Unit tests — `display.ts` helpers (patientDisplayName, patientAge, formatDate, formatDateTime, formatRelativeTime) + `searchPatients()` query routing; 45 passing tests | Jun 2026 |

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
| 108 | LLM assistant — natural-language appointment management and clinical-document generation from conversation transcripts | High | — | — |
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

#96 → #107 are all unblocked and can be started independently, except:

#100a  Test infrastructure
 ├── blocks #100b  Unit tests (display helpers + searchPatients)
 ├── blocks #100c  Component tests (PatientForm + PatientSearch)
 └── blocks #100d  E2E tests (encounter lifecycle)

---

---

## Front-End Architecture Review — Task Details (added Jun 2026)

### #96 · Split `fhir-client.ts` into domain modules ✅ Done
**Priority:** 🔴 High · **Effort:** Medium · **File:** `src/lib/fhir-client.ts` (5,341 lines)

Refactor into a domain-scoped module tree. Add a barrel `index.ts` that re-exports everything so no call sites need to change on day one.

**Completed Jun 2026.** `src/lib/fhir-client.ts` is now a 3-line barrel (`export * from "./fhir"`). All implementation lives in:

```
src/lib/fhir/
  client.ts        # fhirRequest(), fhirFetch(), URL resolution, shared constants
  patients.ts      # patient CRUD, search, photo, merge, vitals, observations
  encounters.ts    # encounter lifecycle, SOAP notes, encounter search
  medications.ts   # MedicationRequest, MAR, discharge Rx, inpatient Rx
  orders.ts        # lab, radiology, procedures, diagnostics, tasks, documents, referrals
  appointments.ts  # appointment CRUD and status transitions
  clinical.ts      # allergies, conditions, immunizations, flags, family history, directives, QRs
  admin.ts         # practitioners, organizations, roles, locations, healthcare services, devices
  subscriptions.ts # subscriptions and notification bundles
  display.ts       # patientDisplayName(), status colors, date formatters, dashboard
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

Zero test files exist in the repository. Split into four sequential subtasks — complete `#100a` first, then `#100b`–`#100d` can proceed independently.

| Subtask | Layer | Tool | Target |
|---|---|---|---|
| #100a | Infrastructure | — | Install all test packages; configure Jest, Playwright, and msw |
| #100b | Unit | Jest + msw | `display.ts` helpers + `searchPatients()` query routing |
| #100c | Component | RTL + msw | `PatientForm` field validation, EMPI lookup, submit; `PatientSearch` debounce + results |
| #100d | E2E | Playwright | Encounter lifecycle: start → SOAP note → close |

---

### #100a · Test infrastructure setup
**Priority:** 🔴 High · **Effort:** Low · **Blocks:** #100b, #100c, #100d

Install and configure all test tooling. No test files are written in this step.

**Packages to install (devDependencies):**

| Package | Purpose |
|---|---|
| `jest`, `jest-environment-jsdom` | Test runner + browser-like DOM |
| `@swc/jest`, `@swc/core` | Fast TypeScript transform (replaces ts-jest) |
| `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` | RTL + custom matchers + user interaction |
| `msw` | Mock Service Worker — stubs `fetch` at the network layer |
| `@playwright/test` | E2E test runner |
| `@types/jest` | TypeScript types for Jest |

**Files to create:**
- `jest.config.ts` — module name mapper for `@/` alias, `jsdom` environment, `jest.setup.ts` setup file
- `jest.setup.ts` — imports `@testing-library/jest-dom`; starts the msw server
- `src/__tests__/mocks/handlers.ts` — shared msw request handlers for FHIR Bundle stubs
- `playwright.config.ts` — base URL `http://localhost:3000`, one project (chromium), screenshot on failure
- Add `"test": "jest"` and `"test:e2e": "playwright test"` to `package.json` scripts

---

### #100b · Unit tests — display helpers + searchPatients routing
**Priority:** 🔴 High · **Effort:** Low · **Blocked by:** #100a

Target files: `src/lib/fhir/display.ts`, `src/lib/fhir/patients.ts`

Test file: `src/__tests__/unit/display.test.ts`
- `patientDisplayName` — English name selected over Arabic (language extension), prefix + given + family joined, fallback `"Unknown Patient"`
- `patientAge` — birthday today, month boundary, missing `birthDate` returns `"—"`
- `formatDate` / `formatDateTime` — known date string → expected locale string
- `formatRelativeTime` — use fake timers to freeze `Date.now()` and assert each time band (min, hr, day, month, yr)

Test file: `src/__tests__/unit/searchPatients.test.ts`
- Pure letter input → only `?name=` query fires
- All-digit ≥ 7 chars → `?identifier=` AND `?phone=` both fire
- `MRN-001234` → prefix stripped → `?identifier=001234`
- Short alphanumeric → `?identifier=` only
- Empty string → returns `[]` immediately, no fetch

Use msw handlers from `src/__tests__/mocks/handlers.ts` to return fixture `Bundle` responses.

---

### #100c · Component tests — PatientForm + PatientSearch
**Priority:** 🔴 High · **Effort:** Medium · **Blocked by:** #100a

Test file: `src/__tests__/components/PatientSearch.test.tsx`
- Type a name → debounce triggers → msw returns a `Bundle` with one patient → patient row renders
- Clearing input → results list disappears
- msw returns empty `Bundle` → "No results" empty state renders

Test file: `src/__tests__/components/PatientForm.test.tsx`
- Submit with empty `givenEn` → required validation error shown, no FHIR call made
- Enter an 11-digit QID → no error; enter 10 digits → QID format error shown
- Fill minimum required fields + submit → `createPatient` fetch intercepted by msw → success toast fires
- Edit mode: form pre-populates with `defaultValues` from the passed `Patient` fixture

---

### #100d · E2E tests — Encounter lifecycle
**Priority:** 🔴 High · **Effort:** Medium · **Blocked by:** #100a

Runs against the real local HAPI instance (no msw). Requires `npm run dev` or `npm start` running on port 3000.

Test file: `e2e/encounter.spec.ts`

1. **Start encounter** — navigate to a known test patient → click "Start Encounter" → fill service type + chief complaint → confirm → encounter page opens with status `in-progress`
2. **Add SOAP note** — on the encounter page, open the SOAP note form → fill Subjective + Objective + Assessment + Plan → save → note appears in the Notes tab
3. **Close encounter** — click "Close Encounter" → select discharge disposition → confirm → encounter status shows `finished`

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

### #108 · LLM assistant — natural-language appointment management and clinical-document generation
**Priority:** 🔴 High · **Effort:** High

Add an LLM-powered assistant that handles two distinct interaction modes, both surfaced through a single chat-style prompt bar in the UI.

---

#### Use case 1 — Natural-language appointment commands

The user types a free-text instruction such as:
- *"List tomorrow's appointments after 10 AM"*
- *"Cancel my appointments for today after 1 PM"*

The LLM interprets intent, extracts structured parameters (date, time range, action), and the app executes the corresponding FHIR operations — then renders results inline.

**Implementation outline:**

1. **Prompt bar UI** — a floating or sidebar input accepting free text; visible from the appointments page and the dashboard. Place in `src/components/llm/LlmAssistant.tsx` (`"use client"`).
2. **API route** — `POST /api/llm/appointment-command` receives `{ prompt, context }` (context = today's date, current practitioner ID, timezone `Asia/Qatar`). Never send PHI beyond what is needed to resolve the command.
3. **LLM call** — send a system prompt describing available actions and expected JSON output schema; ask the model to return a structured intent object:
   ```json
   { "action": "list" | "cancel" | "reschedule",
     "dateRange": { "start": "ISO-8601", "end": "ISO-8601" },
     "filters": { "afterTime": "HH:MM", "practitionerId": "..." } }
   ```
4. **FHIR execution** — map the intent to `searchAppointments()` or `cancelAppointment()` in `src/lib/fhir/appointments.ts`; stream results back to the UI.
5. **Review step for mutations** — for `cancel` and `reschedule`, show a confirmation list of affected appointments before executing; never auto-cancel without user approval.

---

#### Use case 2 — Clinical-document generation from conversation transcript

The user pastes or dictates a clinician–patient conversation and prompts:
- *"Here is our conversation with my patient, prepare vital records, other types of observations, SOAP notes and let me review them"*

The LLM extracts structured clinical data and pre-fills the relevant forms for the user to review and confirm before any FHIR write.

**Implementation outline:**

1. **Transcript input dialog** — `src/components/llm/TranscriptDialog.tsx`; large textarea for pasting text, or a record-then-transcribe path (Web Speech API or a free STT service). Accessible from the encounter page action bar.
2. **API route** — `POST /api/llm/extract-clinical` receives `{ transcript, patientId, encounterId }`. The route strips identifying text before sending to the external LLM.
3. **LLM extraction prompt** — instruct the model to return a structured payload:
   ```json
   {
     "vitals": [{ "code": "8867-4", "display": "Heart rate", "value": 78, "unit": "bpm" }],
     "observations": [{ "category": "exam", "code": "...", "display": "...", "value": "..." }],
     "soap": { "subjective": "...", "objective": "...", "assessment": "...", "plan": "..." },
     "conditions": [{ "icd10": "J06.9", "display": "Upper respiratory infection" }],
     "medications": [{ "name": "Amoxicillin", "dose": "500 mg", "frequency": "TID", "duration": "7 days" }]
   }
   ```
4. **Review UI** — `src/components/llm/ExtractedClinicalReview.tsx`; tabbed view (Vitals · Observations · SOAP · Conditions · Medications) with edit-in-place for each field. A "Save all" button or per-section save buttons call the corresponding `create*` functions in `fhir-client.ts`.
5. **FHIR write** — only on explicit user confirmation; use existing domain functions (`createVitalSigns`, `createSOAPNote`, `createCondition`, etc.).

---

#### Recommended free LLM API

| Option | Notes |
|---|---|
| **Google Gemini 1.5 Flash** (`gemini-1.5-flash-8b` free tier) | 1 500 requests/day free; JSON mode (`responseMimeType: "application/json"`) ensures structured output; good multilingual support for AR/EN |
| **Groq** (Llama 3.1 8B / Mixtral free tier) | Very fast inference; generous free limits; good function-calling support |
| **Ollama** (local, self-hosted) | Zero cost, no PHI leaves the network; requires the clinic to run a local GPU/CPU server; ideal for production when PHI privacy is critical |

Store the API key in `.env.local` as `LLM_API_KEY` and the chosen provider as `LLM_PROVIDER=gemini | groq | ollama`. Abstract the call behind `src/lib/llm-client.ts` so the provider can be swapped without touching the API routes.

**PHI handling:** never log raw transcripts. Strip or pseudonymize patient name and ID before sending to any external API. Document the chosen model and data-processing agreement in the deployment runbook.

---

#### Files to create / modify

| File | Change |
|---|---|
| `src/lib/llm-client.ts` | Provider-agnostic `callLlm(systemPrompt, userPrompt)` wrapper |
| `src/lib/config.json` | Add `llm.provider`, `llm.storageKey` entries |
| `src/app/api/llm/appointment-command/route.ts` | Intent extraction + FHIR action dispatch |
| `src/app/api/llm/extract-clinical/route.ts` | Transcript → structured clinical data |
| `src/components/llm/LlmAssistant.tsx` | Prompt bar + intent result display |
| `src/components/llm/TranscriptDialog.tsx` | Transcript input + extraction trigger |
| `src/components/llm/ExtractedClinicalReview.tsx` | Tabbed review + per-section save |
| `src/app/appointments/page.tsx` | Mount `<LlmAssistant>` |
| `src/app/encounters/[id]/page.tsx` | Add "Summarise from transcript" action button |

---

## Effort summary

| Effort | Count | Task IDs |
|---|---|---|
| Low | 36 | 1, 10, 12, 15, 19, 25, 26, 27, 28, 29, 30, 34, 37, 40, 41, 43, 47, 48, 50, 60, 62, 66, 80b, 80c, 80d, 89, 91, 92, 93, 94, 105, 106, 107, 103, 100a, 100b |
| Medium | 34 | 2, 3, 4, 11, 13, 14, 16, 17, 23, 24, 31, 32, 35, 39, 42, 45, 55, 58, 59, 61, 65, 79, 80, 80a, 81, 82, 83, 84, 86, 96, 101, 102, 100c, 100d |
| High | 19 | 5, 9, 22, 44, 51, 52, 53, 54, 56, 57, 63, 64, 87, 88, 90, 97, 98, 99, 108 |

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
| 96 | Split `fhir-client.ts` into domain modules | ✅ Done |
| 97 | Add TanStack Query caching layer | 🔴 High |
| 98 | Fix silent error swallowing — error boundaries + explicit states | 🔴 High |
| 99 | Move JWT from `localStorage` to `HttpOnly` cookie | 🔴 High |
| 100a | Test infrastructure — Jest + @swc/jest + RTL + msw + Playwright config | 🔴 High |
| 100b | Unit tests — `display.ts` helpers + `searchPatients()` routing | 🔴 High |
| 100c | Component tests — `PatientForm` + `PatientSearch` (RTL + msw) | 🔴 High |
| 100d | E2E tests — Playwright encounter lifecycle (start → SOAP → close) | 🔴 High |
| 101 | Add pagination to all list views | 🟡 Medium |
| 102 | Migrate forms to react-hook-form + Zod | 🟡 Medium |
| 103 | Replace base64 photo storage with URL/Binary reference | 🟡 Medium |
| 104 | Audit and memoize layout component re-renders | 🟠 Lower |
| 105 | Move hardcoded `inquiryusername` header to config/env | 🟠 Lower |
| 106 | Close notification real-time gap (polling or SSE) | 🟠 Lower |
| 107 | Verify `Select.onValueChange` `v ?? ""` coalescing is consistent | 🟠 Lower |
| 108 | LLM assistant — natural-language appointment management + clinical-document generation from transcripts | 🔴 High |
