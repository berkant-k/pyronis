@AGENTS.md

# Pyronis EMR — Project Guide

## What this is
A FHIR-native Electronic Medical Records UI built with Next.js 16 App Router. It talks directly to a FHIR R4B server (currently a local HAPI instance). There is no backend between the UI and the FHIR server — all data operations go through `src/lib/fhir-client.ts`.

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

## Critical gotchas — read before writing any code

### shadcn/ui v4 uses `@base-ui/react`, NOT Radix UI
The `Button` component does **not** support `asChild`. To render a button-styled link, use `buttonVariants()` directly on `<Link>`:
```tsx
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

<Link href="/path" className={cn(buttonVariants(), "gap-2")}>Label</Link>
<Link href="/path" className={cn(buttonVariants({ variant: "outline" }))}>Label</Link>
```

### `Select.onValueChange` returns `string | null`
Always coalesce to an empty string:
```tsx
onValueChange={(v) => set("field", v ?? "")}
```

### `@medplum/react` is NOT installed
Do not import from `@medplum/react`. Use `@medplum/fhirtypes` for TypeScript types and `@medplum/core` utilities only. All UI is custom shadcn/ui.

### Server vs Client components
- **Server components** (default): `page.tsx` files that fetch FHIR data — they call `fhir-client.ts` functions directly.
- **Client components** (`"use client"`): anything with state, forms, event handlers — all form components, `PatientSearch`, `Sidebar`, `Header`, `EmpiSettings`.
- The dashboard (`src/app/page.tsx`) is a server component with `export const dynamic = "force-dynamic"` to prevent caching.

---

## Environment variables

```
NEXT_PUBLIC_FHIR_BASE_URL=http://localhost:5826/fhir/r4b   # main FHIR server
NEXT_PUBLIC_EMPI_BASE_URL=http://localhost:5826/fhir/r4b   # eMPI server (default fallback)
```

The eMPI URL can also be overridden at runtime via `localStorage` key `pyronis_empi_base_url` (set from the Settings page).

---

## FHIR conventions

### Server & spec
- **FHIR version**: R4B (`fhir/r4b` path)
- **All operations**: `src/lib/fhir-client.ts` — do not scatter fetch calls elsewhere. Exception: `src/lib/empi-client.ts` is an intentional peer lib for the separate eMPI server and may contain its own fetch calls.

### Identifier systems
```
MRN:      https://pyronis.health/mrn       (6-digit nanoID numeric)
QID:      http://hl7.org/fhir/sid/nn       (11-digit Qatar National ID — HL7 National Number)
Passport: http://hl7.org/fhir/sid/ppn      (HL7 Passport Number)
```

### Extension URIs
```
Nationality:            https://fhir.pyronis.health/StructureDefinition/patient-nationality
Language:               http://hl7.org/fhir/StructureDefinition/language
VIP:                    http://pyronis.health/fhir/extension/vip                    (valueBoolean)
Insurance:              http://pyronis.health/fhir/extension/insurance-company       (valueString)
Admin Notes:            http://pyronis.health/fhir/extension/administrative-notes    (valueString)
Rx Structured:          http://pyronis.health/fhir/extension/rx-structured           (sub-extensions: dose, form, duration — free-text fields not in standard Dosage)
Inpatient Med:          http://pyronis.health/fhir/extension/inpatient-med           (sub-extensions: dose, frequency — free-text fields not in standard Dosage)
Practitioner Specialty: http://pyronis.health/fhir/extension/practitioner-specialty  (valueString — free-text; PractitionerRole.specialty is the structured alternative)
Directive Notes:        http://pyronis.health/fhir/extension/directive-notes         (valueString)
```

### Bilingual names
Arabic name is stored as a second `Patient.name` entry carrying the language extension with `valueCode: "ar"`. The English name has no language extension. `patientDisplayName()` finds the English name by the absence of that extension.

### MRN generation
`generateNextMRN()` in `fhir-client.ts` — uses `customAlphabet("0123456789", 10)` from `nanoid` (CSPRNG, 10-digit numeric, ~0.005% collision at 10k patients). No FHIR round-trip. Existing 6-digit sequential MRNs remain valid.

---

## Key files

```
src/lib/fhir-client.ts      All FHIR fetch/mutate operations, types, display helpers
src/lib/empi-client.ts      eMPI query helpers (URL storage, QID lookup, connection test)
src/lib/auth.ts             Auth token storage (localStorage + cookie; server-side cookie read)
src/lib/questionnaires.ts   Built-in questionnaire definitions (PHQ-9, GAD-7, AUDIT-C, patient intake)
src/lib/countries.ts        Country list — Qatar/GCC/common expat first, then alphabetical

src/components/patients/
  PatientForm.tsx            Shared create/edit form (mode: "create" | "edit")
  PatientSearch.tsx          Debounced multi-strategy search (name + identifier + phone)

src/components/settings/
  EmpiSettings.tsx           eMPI URL config (localStorage + env var)

src/components/layout/
  Sidebar.tsx                Dark-navy sidebar with nav + Settings + user footer
  Header.tsx                 Top bar with search, notifications, user

src/app/
  page.tsx                   Dashboard (server, force-dynamic)
  patients/page.tsx          Patient list + search
  patients/new/page.tsx      New patient (uses PatientForm mode="create")
  patients/[id]/page.tsx     Patient detail card + clinical tabs
  patients/[id]/edit/page.tsx Edit patient (fetches patient, passes defaultValues)
  settings/page.tsx          Settings (eMPI config + FHIR server info)
```

---

## Design tokens

Primary blue: `oklch(0.546 0.245 262.881)`  
Background: `oklch(0.975 0.005 264)` (light blue-grey)  
Sidebar: `oklch(0.175 0.022 263)` (dark navy) via `bg-sidebar`  
Sidebar text/borders: `text-sidebar-foreground`, `border-sidebar-border`

Active nav item: `bg-white/12 text-white` + primary-coloured dot indicator.

Stat card colours (dashboard): `bg-{blue|green|purple|amber}-50` / `text-{colour}-600`.

---

## PatientFormState fields

`mrn`, `active` (bool), `vip` (bool), `givenEn`, `middleEn`, `familyEn`, `givenAr`, `middleAr`, `familyAr`, `qid`, `passport`, `birthDate`, `nationality` (ISO-3166 code), `gender`, `insuranceCompany`, `addressCountry`, `addressCity`, `addressText`, `phone`, `email`, `adminNotes`

---

## Component patterns

### PatientBanner in data-entry dialogs
Every dialog that creates or edits patient-related data **must** show a `PatientBanner` at the top so the user always knows which patient is selected.
- Import: `import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"`
- Add `patient?: PatientInfo` to the dialog's Props (optional so standalone usages compile).
- Render `{patient && <PatientBanner {...patient} />}` immediately after `</DialogHeader>`.
- Thread patient info from the page → card/manager/tab → dialog. Pages that already have a `Patient` object build: `{ name: patientDisplayName(p), gender: p.gender, birthDate: p.birthDate }`.

### Configurable parameters belong in `config.json`
Any value that might reasonably change per deployment (identifier systems, extension URIs, code lists, server URLs, display labels) must be defined in `src/lib/config.json` and imported from there — never hard-coded inline.
- Read with `import config from "@/lib/config.json"` (Next.js resolves JSON imports without extra config).
- Add new categories to the existing structure; do not create separate config files.

### Raw JSON button on every FHIR resource detail view
Every page or card that displays a single FHIR resource **must** include a `RawFhirDialog` button so developers and power users can inspect the raw resource.
- Import: `import { RawFhirDialog } from "@/components/ui/RawFhirDialog"`
- Place it in the top-right action bar alongside Edit/Back buttons.
- Cast the resource: `resource={encounter as unknown as Record<string, unknown>}`
- The component is a self-contained `DialogTrigger` — no open/close state needed.
- Applies to detail pages for: Patient, Encounter, Appointment, Practitioner, Organization, and any future resource detail view.

### Prefer standard FHIR fields over custom extensions
Before adding a custom extension (`http://pyronis.health/fhir/extension/...`), check whether the standard FHIR R4B resource already carries that concept (e.g. `Patient.communication`, `Patient.contact`, `Observation.component`, `Condition.evidence`). Only reach for a custom extension when no standard element or standard HL7 extension (`http://hl7.org/fhir/StructureDefinition/...`) covers the need. Document any new extension URI in the **Extension URIs** table above.

### Encounter-scoped cards
All encounter cards follow: `{ patientId, encounterId, initial[Resources] }` props → `"use client"` → `useState(initial*)` → Card with count `<Badge>` + action button in `<CardHeader>` → table or empty-state `<p>` in `<CardContent>`. See `EncounterReferralsCard` as the canonical reference.

When adding a new card to the encounter page (`src/app/encounters/[id]/page.tsx`):
1. Add a `getEncounter*` function to `fhir-client.ts` using `encounter: \`Encounter/${encounterId}\`` as the search param.
2. Add the fetch to the `Promise.allSettled([...])` array (destructure the new result at the end of the array).
3. Import and render the card component after the existing cards.

### setState in useEffect — never call synchronously at the top level

The ESLint rule `react-hooks/set-state-in-effect` bans synchronous `setState` calls at the top level of a `useEffect` body because they always trigger a second render cycle, can cascade, and are almost always avoidable.

**Prefer these patterns instead:**

| Situation | Correct pattern |
|---|---|
| Initial value from a pure expression (no side-effects) | Lazy `useState` initialiser: `useState(() => computeValue())` |
| Initial value from `localStorage` / `window` (client-only) | `useState(false)` + read inside the existing `useEffect`, **or** `useLayoutEffect` for values needed before paint |
| Value derivable from props or other state | Compute inline in the render body — no `useEffect` at all |
| Value available from an `async` call | Call inside the async callback, after the `await` |
| SSR-safe `localStorage` read | **Never** put `localStorage` in a lazy `useState` initialiser — it runs on the server. Use `useState(defaultValue)` + `useEffect` |
| Dialog reset on open/close | `useLayoutEffect(() => { reset(defaultValues) }, [open])` — runs synchronously before paint, avoiding the visible flash |

**`eslint-disable` is a last resort**, only acceptable when:
- Multiple state setters must fire together from the same effect and cannot be merged into a single state object (e.g. `setDisplayName` + `setDisplayRole` derived from the same JWT parse).
- Always scope it tightly: `/* eslint-disable react-hooks/set-state-in-effect */` … `/* eslint-enable */` around only the affected `useEffect`, never at file level.

**`fhir-client.ts` and shared server/client modules — never import client-only libraries statically.**
Shared modules (no `"use client"` directive) are bundled for both server and client. A static `import { x } from "some-browser-lib"` at the top of such a file will break server rendering or corrupt the module for all consumers. Use a dynamic `import("lib").then(...)` gated behind `typeof window !== "undefined"`.

### Row action buttons (edit / delete)
- Wrap the row in `className="... group"` and action buttons in `className="opacity-0 group-hover:opacity-100 transition-opacity"`.
- Use `Pencil` (edit) and `Trash2` (delete) from `lucide-react`; show `Loader2 animate-spin` while in-flight.
- **No confirmation dialogs** — direct delete is the convention throughout the codebase.
- Track in-flight deletes with `const [deleting, setDeleting] = useState<string | null>(null)` keyed by resource ID.

---

## Search strategy (`searchPatients`)

Input is classified and fanned out to parallel FHIR queries:
- Has letters or spaces → `?name=`
- All-digits or short alphanumeric, no spaces → `?identifier=` (covers MRN, QID, passport)
- Digit-only, ≥ 7 digits → `?phone=`
- `MR-` / `MRN-` prefix is stripped before querying
- Results merged and deduplicated by patient ID
