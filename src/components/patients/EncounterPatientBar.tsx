import type { AllergyIntolerance, Consent, Encounter, Flag, Patient } from "@medplum/fhirtypes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  patientDisplayName,
  patientAge,
  getPatientMRN,
  flagCategoryColor,
  getDirectiveType,
  ADVANCE_DIRECTIVE_DISPLAY,
  CRITICAL_DIRECTIVE_CODES,
  patientPhotoDataUrl,
  getEncounterVisitId,
  formatDateTime,
  getEncounterTriageAcuity,
  EXT_VIP,
  EXT_CADAVERIC_DONOR,
} from "@/lib/fhir-client"
import { Ban, Clock, Flag as FlagIcon, Heart, ShieldAlert, Star } from "lucide-react"

// ─── Encounter display maps ───────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; dot: string; pill: string }> = {
  "in-progress":      { label: "In Progress", dot: "bg-green-500", pill: "bg-green-100 text-green-700 border-green-200"  },
  "finished":         { label: "Finished",    dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600 border-slate-200"  },
  "cancelled":        { label: "Cancelled",   dot: "bg-red-400",   pill: "bg-red-100 text-red-600 border-red-200"        },
  "planned":          { label: "Planned",     dot: "bg-blue-500",  pill: "bg-blue-100 text-blue-700 border-blue-200"     },
  "on-hold":          { label: "On Hold",     dot: "bg-amber-500", pill: "bg-amber-100 text-amber-700 border-amber-200"  },
  "entered-in-error": { label: "Error",       dot: "bg-red-300",   pill: "bg-red-50 text-red-400 border-red-100"         },
}

const TRIAGE_MAP: Record<string, { label: string; pill: string }> = {
  "1": { label: "ESI 1 — Immediate",   pill: "bg-red-100    text-red-700    border-red-200"    },
  "2": { label: "ESI 2 — Emergent",    pill: "bg-orange-100 text-orange-700 border-orange-200" },
  "3": { label: "ESI 3 — Urgent",      pill: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "4": { label: "ESI 4 — Less Urgent", pill: "bg-green-100  text-green-700  border-green-200"  },
  "5": { label: "ESI 5 — Non-Urgent",  pill: "bg-blue-100   text-blue-700   border-blue-200"   },
}

const CLASS_LABELS: Record<string, string> = {
  AMB:  "Ambulatory",
  IMP:  "Inpatient",
  EMER: "Emergency",
  VR:   "Virtual",
  HH:   "Home Health",
}

function durationLabel(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return ""
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (hours < 24) return rem ? `${hours} hr ${rem} min` : `${hours} hr`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? "s" : ""}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  patient:     Patient
  patientId:   string
  encounter:   Encounter
  activeFlags: Flag[]
  directives:  Consent[]
  allergies:   AllergyIntolerance[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EncounterPatientBar({ patient, patientId, encounter, activeFlags, directives, allergies }: Props) {
  // ── Patient ─────────────────────────────────────────────────────────────────
  const name       = patientDisplayName(patient)
  const mrn        = getPatientMRN(patient)
  const age        = patientAge(patient)
  const photoUrl   = patientPhotoDataUrl(patient)
  const initials   = ((patient.name?.[0]?.given?.[0]?.[0] ?? "") + (patient.name?.[0]?.family?.[0] ?? "")).toUpperCase() || "?"
  const isActive   = patient.active !== false
  const isDeceased = patient.deceasedBoolean ?? false
  const isVip      = patient.extension?.some((x) => x.url === EXT_VIP && x.valueBoolean === true) ?? false
  const isDonor    = patient.extension?.some((x) => x.url === EXT_CADAVERIC_DONOR && x.valueBoolean === true) ?? false

  const criticalDirectives = directives.filter(
    (d) => d.status === "active" && CRITICAL_DIRECTIVE_CODES.has(getDirectiveType(d))
  )
  const highAllergies  = allergies.filter((a) => a.criticality === "high").length
  const totalAllergies = allergies.length

  // ── Encounter ───────────────────────────────────────────────────────────────
  const s          = STATUS_MAP[encounter.status ?? ""] ?? { label: encounter.status ?? "Unknown", dot: "bg-muted-foreground/40", pill: "bg-muted text-muted-foreground border-border" }
  const typeLabel  = encounter.type?.[0]?.coding?.[0]?.display ?? encounter.type?.[0]?.text ?? null
  const classLabel = CLASS_LABELS[encounter.class?.code ?? ""] ?? encounter.class?.display ?? encounter.class?.code ?? null
  const visitId    = getEncounterVisitId(encounter)
  const triageCode = getEncounterTriageAcuity(encounter)
  const triage     = triageCode ? TRIAGE_MAP[triageCode] : null
  const start      = encounter.period?.start
  const end        = encounter.period?.end
  const duration   = start && end ? durationLabel(start, end) : null

  return (
    <div className="mx-auto max-w-4xl h-full flex flex-col justify-center gap-0.5 px-6 py-2">

      {/* ── Row 1: Patient ── */}
      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
        {/* Avatar with status dot */}
        <div className="relative shrink-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-primary/20" />
          ) : (
            <Avatar className="h-7 w-7 ring-2 ring-primary/20">
              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
          )}
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background",
            isActive && !isDeceased ? "bg-green-500" : "bg-muted-foreground/40"
          )} />
        </div>

        {/* Identity */}
        <Link
          href={`/patients/${patientId}`}
          className="font-semibold text-sm hover:text-primary transition-colors shrink-0 max-w-[180px] truncate"
        >
          {name}
        </Link>
        {mrn && (
          <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 shrink-0">
            MR-{mrn}
          </span>
        )}
        {age !== "—" && (
          <span className="text-xs text-muted-foreground shrink-0">{age} yrs</span>
        )}
        {patient.gender && (
          <span className="text-xs text-muted-foreground capitalize shrink-0">{patient.gender}</span>
        )}

        {/* Separator before clinical chips */}
        {(isDeceased || isVip || isDonor || criticalDirectives.length > 0 || totalAllergies > 0 || activeFlags.length > 0) && (
          <span className="h-3.5 w-px bg-border shrink-0" aria-hidden />
        )}

        {/* Clinical chips */}
        {isDeceased && (
          <span className="inline-flex items-center text-[10px] font-bold text-white bg-neutral-700 rounded-full px-2 py-0.5 shrink-0">Deceased</span>
        )}
        {isVip && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> VIP
          </span>
        )}
        {isDonor && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 shrink-0">
            <Heart className="h-2.5 w-2.5 fill-rose-500 text-rose-500" /> Donor
          </span>
        )}
        {criticalDirectives.map((d) => {
          const code  = getDirectiveType(d)
          const label = ADVANCE_DIRECTIVE_DISPLAY[code] ?? code
          return (
            <span key={d.id} className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-600 border border-red-700 rounded-full px-2 py-0.5 shrink-0">
              <Ban className="h-2.5 w-2.5" /> {label}
            </span>
          )
        })}
        {activeFlags.map((f) => {
          const cat    = f.category?.[0]?.coding?.[0]?.code ?? ""
          const catCls = flagCategoryColor(cat)
          return (
            <span key={f.id} className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium rounded-full border px-2 py-0.5 shrink-0",
              catCls
            )}>
              <FlagIcon className="h-2.5 w-2.5" />
              {f.code?.text ?? f.code?.coding?.[0]?.display ?? "Flag"}
            </span>
          )
        })}
        {totalAllergies > 0 ? (
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium rounded-full border px-2 py-0.5 shrink-0",
            highAllergies > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
          )}>
            <ShieldAlert className="h-2.5 w-2.5" />
            {totalAllergies} allerg{totalAllergies !== 1 ? "ies" : "y"}
            {highAllergies > 0 && <span className="font-bold"> · {highAllergies} high</span>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <ShieldAlert className="h-2.5 w-2.5" /> No known allergies
          </span>
        )}
      </div>

      {/* ── Row 2: Encounter ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type + class label */}
        {(typeLabel ?? classLabel) && (
          <span className="text-xs font-semibold text-foreground shrink-0">
            {typeLabel ?? classLabel}
          </span>
        )}
        {typeLabel && classLabel && (
          <span className="text-xs text-muted-foreground/70 shrink-0">· {classLabel}</span>
        )}

        {/* Status pill */}
        <span className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
          s.pill
        )}>
          <span className={cn("mr-1 h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
          {s.label}
        </span>

        {/* Triage acuity */}
        {triage && (
          <span className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
            triage.pill
          )}>
            {triage.label}
          </span>
        )}

        {/* Visit ID */}
        {visitId && (
          <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 shrink-0">
            VID-{visitId}
          </span>
        )}

        {/* Period */}
        {start && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {formatDateTime(start)}
          </span>
        )}
        {end ? (
          duration && (
            <span className="text-[10px] text-muted-foreground shrink-0">· {duration}</span>
          )
        ) : (
          encounter.status === "in-progress" && (
            <span className="text-[10px] font-medium text-green-600 shrink-0">· Ongoing</span>
          )
        )}
      </div>
    </div>
  )
}
