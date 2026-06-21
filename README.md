# Pyronis EMR

A FHIR-native Electronic Medical Records UI built with **Next.js 16** and **React 19**. It connects directly to a FHIR R4B server with no proprietary backend — all clinical operations go through standard FHIR REST APIs.

Pyronis is also a practical learning tool for anyone who wants to understand how FHIR works in a real application. Every resource the UI touches maps directly to a standard FHIR resource type. The built-in **Raw JSON viewer** (available on every detail page) lets you inspect the exact FHIR representation of what you are looking at, and the **Subscription + Notification** module gives you a hands-on way to see how FHIR event-driven workflows behave end to end.

> **Status:** Active development — core clinical workflows are implemented and usable. See the [feature gap analysis](MISSING_FEATURES.md) for what is planned next.

---

## Screenshots

### Login & Dashboard

<table>
<tr>
<td><img src="docs/screenshots/login.png" alt="Login" /></td>
<td><img src="docs/screenshots/dashboard.png" alt="Dashboard" /></td>
</tr>
<tr>
<td align="center"><em>JWT login — or continue without a token against an open server</em></td>
<td align="center"><em>Dashboard — stat cards, recent registrations and encounters</em></td>
</tr>
</table>

### Patient Record

<table>
<tr>
<td><img src="docs/screenshots/patient-general.png" alt="Patient detail — header and tabs" /></td>
<td><img src="docs/screenshots/patient-ganeral-2.png" alt="Patient detail — vitals tab" /></td>
</tr>
<tr>
<td align="center"><em>Patient header with clinical signal chips and tabbed clinical data</em></td>
<td align="center"><em>Vitals tab — latest readings for all 8 vital types</em></td>
</tr>
</table>

<table>
<tr>
<td><img src="docs/screenshots/patient-chart.png" alt="Patient chart summary" /></td>
<td><img src="docs/screenshots/merge-patient.png" alt="Patient merge" /></td>
</tr>
<tr>
<td align="center"><em>Chart summary — active problems, medications, allergies and encounter history</em></td>
<td align="center"><em>Patient merge — side-by-side field comparison, amber rows highlight differences</em></td>
</tr>
</table>

### Encounter

<img src="docs/screenshots/encounter.png" alt="Encounter detail" />

*Encounter detail — patient context bar, SOAP note (S/O/A/P), and tabbed clinical sections (Vitals, Clinical, Documents, Discharge Rx)*

### Clinical Tools

<table>
<tr>
<td><img src="docs/screenshots/vital-sign-critical.png" alt="Critical vital signs alert" /></td>
<td><img src="docs/screenshots/add-flags.png" alt="Add patient flag" /></td>
</tr>
<tr>
<td align="center"><em>Critical vital sign alert — critical values in red, abnormal in amber</em></td>
<td align="center"><em>Add patient flag — category, status and effective date</em></td>
</tr>
</table>

<table>
<tr>
<td><img src="docs/screenshots/discharge-prescription.png" alt="Discharge prescription builder" /></td>
<td><img src="docs/screenshots/gad-7-questionare.png" alt="GAD-7 questionnaire" /></td>
</tr>
<tr>
<td align="center"><em>Discharge prescription builder — dose, route, frequency, duration with live sig preview</em></td>
<td align="center"><em>GAD-7 questionnaire — button-group answers, auto-scored on submit</em></td>
</tr>
</table>

### Medication Administration Record (MAR)

<table>
<tr>
<td><img src="docs/screenshots/med-administration.png" alt="MAR — before administration" /></td>
<td><img src="docs/screenshots/medicaiton-administration.png" alt="MAR — after administration" /></td>
</tr>
<tr>
<td align="center"><em>MAR — order active, first dose refused by patient</em></td>
<td align="center"><em>MAR — second dose recorded as given, full administration history</em></td>
</tr>
</table>

### Worklist & Directory

<table>
<tr>
<td><img src="docs/screenshots/worklist.png" alt="Task worklist" /></td>
<td><img src="docs/screenshots/org-definitions.png" alt="Organisation detail" /></td>
</tr>
<tr>
<td align="center"><em>Global worklist — filter by status and priority across all patients</em></td>
<td align="center"><em>Organisation detail with linked practitioners</em></td>
</tr>
</table>

<table>
<tr>
<td><img src="docs/screenshots/practitioner_definition.png" alt="Practitioner detail" /></td>
<td><img src="docs/screenshots/fhir-json-button.png" alt="Raw FHIR JSON viewer" /></td>
</tr>
<tr>
<td align="center"><em>Practitioner detail — qualifications and organisation roles</em></td>
<td align="center"><em>Raw FHIR JSON viewer — available on every resource detail page</em></td>
</tr>
</table>

### Print

<img src="docs/screenshots/print-face-sheet.png" alt="Patient face sheet print preview" />

*Patient face sheet — print-ready layout with demographics, problem list, allergies, medications and active alerts*

---

## Features

### Patient Management
- Full demographic CRUD — English + Arabic bilingual names, photo (webcam or upload), MRN, QID, passport
- Rich demographics — nationality, ethnicity, person type, birth place, insurance, VIP flag, cadaveric donor, deceased status
- EMPI / QID deduplication on registration
- Patient chart summary — active problems, medications, allergies, vitals, encounter history
- Print-ready face sheet

### Clinical Workflows
- **Appointments** — book, reschedule, cancel, check-in, fulfil; month/week/day calendar view
- **Encounters** — start, close, SOAP notes (rich text, printable), discharge summary
- **Vitals / Observations** — batch entry, LOINC-coded, per-encounter and per-patient views
- **Problem List** — active / resolved conditions, ICD-10, promote encounter-diagnosis to problem list
- **Medications** — discharge Rx with dosage builder (printable); inpatient MAR with administration recording
- **Orders** — lab, radiology, procedure; priority, indication, cancel
- **Procedures** — order and record performed procedures
- **Immunizations** — CVX codes, lot, site, route, dose number, series
- **Allergies & Intolerances** — substance, criticality, reaction severity
- **Flags / Alerts** — categories, colour-coded, displayed on patient header
- **Diagnostic Reports** — LAB/RAD/PATH/REF/GEN with file attachments
- **Referrals** — create, edit, status tracking, per-encounter card, global list
- **Family History** — relationships, conditions, deceased status
- **Related Persons** — next of kin, emergency contacts, guarantors
- **Advance Directives** — DNR/DNI/POLST displayed on patient header
- **Questionnaires** — PHQ-9, GAD-7, AUDIT-C, Patient Intake; auto-scoring with severity labels
- **Tasks / Worklist** — 6 categories, priority, due date, assignee; global and per-patient views
- **Document Management** — file upload, download, delete; 9 document types

### Directory & Infrastructure
- **Practitioner directory** — CRUD, specialties, qualifications, role-to-organisation links
- **Organisation registry** — CRUD, hierarchy (`partOf`), linked practitioners
- **Locations** — CRUD for physical sites; status, mode, type, address, managing organisation, part-of hierarchy
- **Healthcare Services** — CRUD; specialty, availability hours and exceptions, linked location and organisation
- **Devices** — CRUD; 11 device types, UDI, serial number, manufacturer, model, asset code, linked organisation and location
- **Settings** — FHIR server URL, eMPI URL configurable at runtime

### Subscriptions & Notifications
- **Subscriptions** — create and manage FHIR R4 subscriptions using the [R4B Subscriptions Backport IG](http://hl7.org/fhir/uv/subscriptions-backport). Supports topic URL, filter criteria, channel type (rest-hook, websocket, email, SMS, message), payload content level, heartbeat period, and custom HTTP headers.
- **Webhook endpoint** — `POST /api/fhir/notify` receives incoming notification bundles from the FHIR server, tags them, and re-stores them as `Bundle` resources directly on the FHIR server — no separate database needed.
- **Live notification panel** — bell icon in the header fetches the latest notification bundles on load. Each notification links directly to the triggering resource. Dismiss removes the bundle from the FHIR server.
- **Notification inbox** (`/notifications`) — full table of all received notifications with resource type badge, resource link, subscription reference, received timestamp, raw JSON viewer, and individual dismiss.

### UI
- Dark-navy sidebar with collapsible icon-only mode (state persisted)
- Patient tab clustering — 16+ tabs grouped into Clinical / Administrative / Documents & Reports
- Clinical signal chips on patient header — active encounter, problems, medications, tasks, critical allergies
- Skeleton loading screens and failed-fetch banners for every route
- Raw FHIR JSON viewer on every resource detail page
- Unified `StatusPill` component across all resource types
- JWT token login with middleware-protected routes

---

## Learning FHIR with Pyronis

Pyronis is built on vanilla FHIR — every button in the UI maps to a documented FHIR operation. This makes it a useful sandbox for exploring the spec hands-on.

### How each UI action maps to FHIR

| What you do in the UI | What happens on the FHIR server |
|---|---|
| Register a patient | `POST /Patient` with MRN identifier, extensions, bilingual names |
| Open a patient record | `GET /Patient/{id}` |
| Start an encounter | `POST /Encounter` with `subject` reference to the patient |
| Record a vital sign | `POST /Observation` with LOINC `code`, `valueQuantity`, linked `encounter` |
| Add a diagnosis | `POST /Condition` with `clinicalStatus`, `code` (ICD-10), `encounter` context |
| Prescribe a medication | `POST /MedicationRequest` with structured dosage |
| Record administration | `POST /MedicationAdministration` referencing the order |
| Upload a document | `POST /DocumentReference` with `content[0].attachment.data` (base64) |
| Create a location | `POST /Location` with address, type, status, managing organisation |
| Create a device | `POST /Device` with UDI carrier, device name, manufacturer, linked location |
| Create a subscription | `POST /Subscription` with backport IG extensions for topic and filter |
| Receive a notification | FHIR server `POST`s a `Bundle` to `/api/fhir/notify`; re-stored with a tag |

### Exploring raw FHIR resources

Every detail page has a **"{ } JSON"** button that opens the raw FHIR resource exactly as it is stored on the server. This is the fastest way to see how a UI concept translates into FHIR JSON without calling the API directly. Try it on a Patient after adding an Arabic name, or on a Subscription to see the backport IG extensions in place.

### Subscriptions walkthrough

The Subscriptions module gives a hands-on view of FHIR event-driven workflows:

1. **Create a subscription** at `/subscriptions/new`. Set the topic to a SubscriptionTopic canonical URL your server supports. Set the endpoint to `<your-app-url>/api/fhir/notify` — the "Use this app's webhook" button fills this in automatically.
2. **Trigger an event** — create or update the resource type the subscription watches.
3. **Check the inbox** at `/notifications`. The notification bundle the FHIR server delivered will appear there, showing the resource type, ID, and a direct link to the resource's detail page.
4. **Inspect the raw bundle** using the JSON viewer to see the `SubscriptionStatus` entry, `notificationEvent[].focus` reference, and the tagged `meta`.

### Recommended companion tools

- **[fhir-candle](https://github.com/FHIR/fhir-candle)** — lightweight .NET FHIR server with a built-in web UI for browsing stored resources. Tested and recommended for local development.
- **[FHIR R4B specification](https://hl7.org/fhir/R4B/)** — the reference for every resource type Pyronis uses.
- **[Subscriptions Backport IG](http://hl7.org/fhir/uv/subscriptions-backport)** — describes the extension pattern Pyronis uses for topic-based subscriptions on R4/R4B servers.

---

## Stack

| Concern | Package | Version |
|---|---|---|
| Framework | `next` | 16.2.7 |
| React | `react` | 19.2.4 |
| UI components | `shadcn` (v4) | ^4.10.0 |
| UI primitives | `@base-ui/react` | ^1.5.0 |
| FHIR types | `@medplum/fhirtypes` | ^4.5.2 |
| FHIR utilities | `@medplum/core` | ^4.5.2 |
| Icons | `lucide-react` | ^1.17.0 |
| CSS | Tailwind v4 + `tw-animate-css` | ^4 |

---

## Prerequisites

- **Node.js** 20+ and npm
- A running **FHIR server** — [fhir-candle](https://github.com/FHIR/fhir-candle) is the tested and recommended option for local development.

Start a local fhir-candle as a .NET tool:

```bash
fhir-candle -o
```

If you don't have the tool installed:

```bash
dotnet tool install --global fhir-candle
```

The FHIR R4B base URL will be `http://localhost:5826/fhir/r4b`.

fhir-candle also exposes R4 at `/r4` and R5 at `/r5` on the same port. The web UI (useful for inspecting stored resources) is available at `http://localhost:5826`.

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/berkant-k/pyronis.git
cd pyronis

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — at minimum set NEXT_PUBLIC_FHIR_BASE_URL

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_FHIR_BASE_URL=http://localhost:5826/fhir/r4b
NEXT_PUBLIC_EMPI_BASE_URL=http://localhost:5826/fhir/r4b
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FHIR_BASE_URL` | FHIR R4B server base URL |
| `NEXT_PUBLIC_EMPI_BASE_URL` | eMPI server base URL (can also be overridden at runtime from the Settings page) |

Both variables are public (browser-read) because Pyronis talks to FHIR directly with no intermediary backend.

---

## Scripts

```bash
npm run dev        # development server with hot reload
npm run build      # production build
npm run start      # serve production build
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript type check (no output = clean)
```

---

## Project Structure

```
src/
  app/                   Next.js App Router pages
    patients/            Patient list, detail, new, edit
    encounters/          Encounter detail with clinical tab sections
    appointments/        Appointment list + calendar
    practitioners/       Practitioner directory
    organizations/       Organisation registry
    locations/           Location CRUD
    healthcare-services/ Healthcare Service CRUD
    devices/             Device CRUD
    subscriptions/       Subscription CRUD
    notifications/       Notification inbox
    questionnaires/      Questionnaire library
    tasks/               Global task worklist
    reports/ orders/ medications/ flags/ ...
    api/fhir/notify/     POST endpoint — receives and stores FHIR notification bundles
  components/
    patients/            PatientForm, PatientSearch
    notifications/       DismissNotificationButton
    layout/              Sidebar, Header (with live NotificationPanel)
    ui/                  Shared primitives (PatientBanner, StatusPill, RawFhirDialog, …)
    reports/ orders/ ... Feature-specific cards and dialogs
  lib/
    fhir-client.ts       All FHIR fetch/mutate operations and display helpers
    empi-client.ts       eMPI query helpers
    auth.ts              JWT token storage (localStorage + cookie)
    questionnaires.ts    Built-in questionnaire definitions
    config.json          Deployment-configurable values (identifier systems, extension URIs, code lists)
```

---

## Architecture Notes

- **No backend** — the UI calls the FHIR server directly via `fetch`. All operations go through `src/lib/fhir-client.ts`.
- **Server components** fetch data at request time (`page.tsx`). **Client components** (`"use client"`) handle state, forms, and event handlers.
- Patient photos are stored as `Patient.photo[0]` base64 data URIs on the FHIR resource.
- Bilingual names — Arabic name is a second `Patient.name` entry carrying the HL7 language extension (`valueCode: "ar"`).
- MRN generation uses `nanoid` `customAlphabet("0123456789", 10)` — CSPRNG, no server round-trip, collision-safe.
- All deployment-configurable values (identifier systems, extension URIs, code lists) live in `src/lib/config.json`.

### Subscription & notification flow

```
FHIR server                          Pyronis
────────────────────────────────     ────────────────────────────────────────
Subscription resource created   ←    POST /Subscription (via subscriptions UI)
Resource event fires            →    FHIR server POSTs to /api/fhir/notify
                                     Route tags bundle, re-POSTs to FHIR server
                                     as Bundle with tag=notification
Notification inbox loads        ←    GET /Bundle?_tag=notification&_sort=-_lastUpdated
Resource link clicked           ←    Parsed from SubscriptionStatus.notificationEvent[].focus
```

Notification bundles are stored directly on the FHIR server — no additional database is needed.

### R4B Subscriptions Backport IG

`@medplum/fhirtypes` ships R4 `Subscription` types which do not include the R4B `topic` or `filterBy` fields. Pyronis uses the [Subscriptions Backport IG](http://hl7.org/fhir/uv/subscriptions-backport) extension pattern to attach these on the R4 shadow elements (`_criteria`, `channel._payload`, `channel.extension`). Three accessor helpers in `fhir-client.ts` parse the extensions back out:

```typescript
subscriptionFilterCriteria(sub)  // → backport-filter-criteria extension value
subscriptionHeartbeat(sub)        // → backport-heartbeat-period extension value
subscriptionPayloadContent(sub)   // → backport-payload-content extension value
```

---

## Qatar & GCC Regional Context

Pyronis was originally designed for the Gulf healthcare environment and aligns with Qatar Ministry of Public Health (MoPH) FHIR profiles. These customisations are active by default but all identifiers and extension URIs are declared in `src/lib/config.json` and can be overridden for other regions.

### Patient Identifiers

| Identifier | System | Notes |
|---|---|---|
| MRN | `https://pyronis.health/mrn` | 10-digit numeric, CSPRNG-generated |
| QID | `http://hl7.org/fhir/sid/nn` | Qatar National ID — 11-digit national number |
| Passport | `http://hl7.org/fhir/sid/ppn` | HL7 passport number |

QID lookup against an external eMPI server is built into the patient registration flow to detect existing records before a new patient is created.

### MoPH FHIR Profile Alignment

Extensions used on `Patient` resources use Pyronis StructureDefinition URIs (`https://fhir.pyronis.health/StructureDefinition/…`):
The config file should be updated according to MoPH's documents.

| Field | Extension |
|---|---|
| Nationality | `patient-nationality` |
| Person type | `PersonType` |
| Ethnicity | `Ethnicity` |
| Birth place country | `patient-birthPlace` |
| Cadaveric donor | `patient-cadavericDonor` |
| Bilingual name language | `NameLanguage` |
| Address zone / street / building / unit | `AddressZone`, `AddressStreetNumber`, `AddressBuildingNumber`, `AddressUnit` |

Country codes use the **Pyronis Nationality CodeSystem** (`https://fhir.pyronis.health/CodeSystem/Nationality`) — ISO 3166-1 numeric codes (e.g., `634` = Qatar, `682` = Saudi Arabia).

### Person Types

Patient residency status is captured using Qatar-aligned codes:

| Code | Display |
|---|---|
| `QAT` | Qatari Citizen |
| `GCC` | GCC National |
| `RES` | Resident |
| `VIS` | Visitor |
| `DIP` | Diplomat |
| `STD` | Student |

### Bilingual Arabic / English Support

- Each patient record stores two `Patient.name` entries: English (default) and Arabic.
- The Arabic name entry carries the `NameLanguage` extension (`valueCode: "ar"`) and renders right-to-left.
- All name input fields in the patient form have a dedicated RTL Arabic section.
- The patient header, banner, and print pages display both names when available.

### Country & Nationality Lists

Country dropdowns show Qatar first, then the five other GCC states, then the major expat nationalities present in Qatar (India, Pakistan, Nepal, Bangladesh, Philippines, Egypt, Jordan, Lebanon, …), then the rest of the world alphabetically.

### Adapting for Other Regions

To deploy outside the GCC, update `src/lib/config.json`:
- Replace `fhir.pyronis.health` extension and code system URIs with your jurisdiction's equivalents (or keep them as-is — they are Pyronis-owned URIs with no external dependency).
- Swap out the `personType` options list for locally meaningful residency/patient-class categories.
- Replace the `countryCode` code system with ISO 3166-1 alpha-2 if preferred.
- The country list order in `src/lib/countries.ts` can be reordered to put your local countries first.

---

## Contributing

Contributions are welcome. Please open an issue before starting a large feature so the approach can be discussed.

1. Fork the repository and create a branch (`feature/my-feature` or `fix/my-fix`).
2. Run `npx tsc --noEmit` and `npm run lint` before submitting — PRs will not be merged with type errors or ESLint warnings.
3. Keep commits focused. Reference the relevant section of [MISSING_FEATURES.md](MISSING_FEATURES.md) if you are implementing a gap item.
4. Open a pull request against `main`.

---

## License

MIT — see [LICENSE](LICENSE) for details.
