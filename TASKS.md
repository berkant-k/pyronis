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

---

## 🟡 Medium Priority

| #  | Task                                                                                   | Effort | Blocked by | Ref |
|----|----------------------------------------------------------------------------------------|---|---|---|
| 10 | Collapse 10+ patient header action buttons into "More ▾" menu                          | Low | — | §18.3 |
| 11 | Drug–drug interaction checking at order entry                                          | Medium | — | §2 |
| 12 | Duplicate order detection                                                              | Low | — | §2 |
| 13 | Medication reconciliation workflow                                                     | Medium | — | §1 |
| 14 | Vitals flowsheet and trend charts                                                      | Medium | — | §11 |
| 15 | Lab / radiology order print form                                                       | Low | — | §14 |
| 16 | MFA / 2FA — TOTP or WebAuthn second factor                                             | Medium | #5 | §15 |
| 17 | Immunization schedule recommendations and contraindication checking                    | Medium | — | §12 |
| ~~18~~ | ~~Unified `StatusPill` component~~ | ~~Low~~ | — | ✅ Done |
| 19 | Empty states — add icon, descriptive subtitle, and CTA button                          | Low | — | §18.6 |
| ~~20~~ | ~~Header breadcrumbs and notification center~~ | ~~Low~~ | — | ✅ Done |
| ~~21~~ | ~~Encounter page — SOAP-first layout with accordion or tabs below~~ | ~~Medium~~ | — | ✅ Done |
| 22 | UI language switching — English / Arabic via `next-intl`                               | High | — | §20.1 |
| 23 | Full RTL layout — sidebar flip, logical CSS properties                                 | Medium | #22 | §20.2 |
| 24 | `Patient/$everything` — one-call export and chart page performance                     | Medium | — | §23.3 |
| 25 | Resource `_history` — demographics audit timeline                                      | Low | — | §23.1 |
| 26 | Patient lists and care team cohorts (`List` / `Group` resource)                        | Low | — | §19.2 |
| 27 | Appointment waitlist (`Appointment.status=waitlist`)                                   | Low | — | §19.3 |
| 28 | Patient-level procedure history tab                                                    | Low | — | §24.16 |
| 29 | Allergy reconciliation at encounter open                                               | Low | — | §24.1 |
| 30 | Order → `DiagnosticReport` result linking                                              | Low | — | §24.13 |
| 31 | Non-vital Observations — physical exam, social history, smoking status                 | Medium | — | §24.17 |
| 32 | Additional `Composition` note types — progress note, H&P, nursing note, procedure note | Medium | — | §24.11 |
| 33 | Emergency contact quick access on patient header                                       | Low | — | §24.18 |
| 34 | In-browser preview for PDF / image attachments                                         | Low | — | §24.5, §24.6 |
| 35 | Serial diagnostic result comparison and trend table                                    | Medium | — | §24.5 |
| ~~36~~ | ~~Encounter type and service type capture~~ | ~~Low~~ | — | ✅ Done |
| 37 | Multi-provider encounter participation                                                 | Low | — | §24.7 |
| 38 | Encounter search by practitioner                                                       | Low | — | §24.7 |
| ~~73~~ | ~~Patient photo upload — `Patient.photo[0]` field with file picker and webcam capture~~ | ~~Low~~ | — | ✅ Done |
| ~~74~~ | ~~Immunization form — add CVX code selector and `series` name field (`protocolApplied.series`)~~ | ~~Low~~ | — | ✅ Done |
| ~~75~~ | ~~DiagnosticReport attachment support — `presentedForm` field with file upload in `DiagnosticReportFormDialog`~~ | ~~Low~~ | — | ✅ Done |

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
| ~~49~~ | ~~Sidebar active state — consistent active-page rule~~ | ~~Low~~ | — | ✅ Done |
| 50 | Document versioning and referral document linking | Low | — | §9 |
| 51 | Care plans and patient goals (`CarePlan` + `Goal` resources) | High | #9 | §5 |
| 52 | Bed management and ADT workflow (`Location` + `Encounter.hospitalization`) | High | — | §8 |
| 53 | Billing — `Coverage`, `ChargeItem`, and `Claim` resources | High | — | §7 |
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

#22  UI language switching (next-intl)
 ├── blocks #23  Full RTL layout
 └── blocks #45  Arabic clinical terminology display
```

All other tasks are unblocked and can be started independently.

---

## Effort summary

| Effort | Count | Task IDs |
|---|---|---|
| Low | 26 | 1, 10, 12, 15, 19, 20, 25, 26, 27, 28, 29, 30, 33, 34, 36, 37, 38, 40, 41, 43, 47, 48, 50, 60, 62, 66 |
| Medium | 20 | 2, 3, 4, 11, 13, 14, 16, 17, 23, 24, 31, 32, 35, 39, 42, 45, 55, 58, 59, 61, 65 |
| High | 10 | 5, 9, 22, 44, 51, 52, 53, 54, 56, 57, 63, 64 |

---

## Quick-start: highest-value low-effort tasks

Unblocked, Low effort, High or Medium priority — best starting points:

| # | Task | Priority |
|---|---|---|
| 1 | Allergy–drug conflict alert at prescribing time | 🔴 High |
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
| 33 | Emergency contact quick access on patient header | 🟡 Medium |
| 34 | In-browser preview for PDF / image attachments | 🟡 Medium |
| 37 | Multi-provider encounter participation | 🟡 Medium |
| 38 | Encounter search by practitioner | 🟡 Medium |
