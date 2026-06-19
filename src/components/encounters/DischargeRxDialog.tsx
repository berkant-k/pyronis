"use client"

import { useState, useLayoutEffect } from "react"
import { Pill, Loader2, Pencil } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  createDischargeRx,
  updateDischargeRx,
  buildDosageSig,
  type DischargeRxInput,
} from "@/lib/fhir-client"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUTES = [
  "Oral",
  "IV",
  "IM",
  "SC",
  "Topical",
  "Inhalation",
  "Sublingual",
  "Intranasal",
  "Rectal",
  "Ophthalmic",
  "Otic",
]

const FORMS = [
  "tablet",
  "capsule",
  "liquid / syrup",
  "injection",
  "cream",
  "ointment",
  "gel",
  "patch",
  "inhaler (MDI)",
  "drops",
  "suppository",
  "powder / sachet",
  "spray",
  "lozenge",
]

const FREQUENCIES = [
  { code: "OD",      label: "OD — Once daily"         },
  { code: "BD",      label: "BD — Twice daily"         },
  { code: "TDS",     label: "TDS — Three times daily"  },
  { code: "QID",     label: "QID — Four times daily"   },
  { code: "Q4H",     label: "Q4H — Every 4 hours"      },
  { code: "Q6H",     label: "Q6H — Every 6 hours"      },
  { code: "Q8H",     label: "Q8H — Every 8 hours"      },
  { code: "Q12H",    label: "Q12H — Every 12 hours"    },
  { code: "QHS",     label: "QHS — At bedtime"         },
  { code: "QAM",     label: "QAM — Every morning"      },
  { code: "QW",      label: "QW — Once weekly"         },
  { code: "BIW",     label: "BIW — Twice weekly"       },
  { code: "QOD",     label: "QOD — Every other day"    },
  { code: "Monthly", label: "Monthly"                  },
]

const DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "1 month",
  "2 months",
  "3 months",
  "6 months",
  "Ongoing",
]

const COMMON_DRUGS = [
  "Amoxicillin 500mg",
  "Amoxicillin 250mg/5ml (syrup)",
  "Amoxicillin-Clavulanate 625mg",
  "Azithromycin 500mg",
  "Ciprofloxacin 500mg",
  "Clarithromycin 500mg",
  "Metronidazole 400mg",
  "Doxycycline 100mg",
  "Cephalexin 500mg",
  "Trimethoprim-Sulfamethoxazole 960mg",
  "Ibuprofen 400mg",
  "Ibuprofen 600mg",
  "Paracetamol (Acetaminophen) 500mg",
  "Paracetamol (Acetaminophen) 1g",
  "Naproxen 250mg",
  "Naproxen 500mg",
  "Diclofenac 50mg",
  "Tramadol 50mg",
  "Codeine 30mg",
  "Omeprazole 20mg",
  "Omeprazole 40mg",
  "Pantoprazole 40mg",
  "Ranitidine 150mg",
  "Metformin 500mg",
  "Metformin 1000mg",
  "Amlodipine 5mg",
  "Amlodipine 10mg",
  "Atorvastatin 20mg",
  "Atorvastatin 40mg",
  "Atorvastatin 80mg",
  "Metoprolol 25mg",
  "Metoprolol 50mg",
  "Lisinopril 5mg",
  "Lisinopril 10mg",
  "Losartan 50mg",
  "Furosemide 40mg",
  "Spironolactone 25mg",
  "Aspirin 81mg",
  "Aspirin 100mg",
  "Aspirin 300mg",
  "Clopidogrel 75mg",
  "Prednisone 10mg",
  "Prednisone 20mg",
  "Prednisolone 5mg",
  "Methylprednisolone 4mg",
  "Cetirizine 10mg",
  "Loratadine 10mg",
  "Montelukast 10mg",
  "Salbutamol Inhaler (MDI)",
  "Budesonide/Formoterol Inhaler",
  "Fluticasone Inhaler",
  "Betamethasone 0.1% cream",
  "Hydrocortisone 1% cream",
  "Clotrimazole 1% cream",
  "Levothyroxine 50mcg",
  "Levothyroxine 100mcg",
  "Sertraline 50mg",
  "Escitalopram 10mg",
  "Amitriptyline 25mg",
  "Pregabalin 75mg",
  "Gabapentin 300mg",
  "Warfarin 5mg",
  "Enoxaparin 40mg injection",
  "Insulin Glargine",
  "Insulin Regular",
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface DischargeRxDialogProps {
  patientId:    string
  encounterId:  string
  mode:         "create"
  onSaved:      () => void
  patient?:     PatientInfo
}

interface DischargeRxEditDialogProps {
  patientId:    string
  encounterId:  string
  mode:         "edit"
  rxId:         string
  initialData:  DischargeRxInput
  onSaved:      () => void
  patient?:     PatientInfo
}

type Props = DischargeRxDialogProps | DischargeRxEditDialogProps

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function DischargeRxDialog(props: Props) {
  const isEdit = props.mode === "edit"

  const blank: Omit<DischargeRxInput, "patientId" | "encounterId"> = {
    drugName: "", dose: "", form: "", route: "", frequency: "",
    duration: "", quantity: "", refills: undefined,
    prn: false, prnReason: "", indication: "", instructions: "",
  }

  const [open, setOpen]           = useState(false)
  const [drugName, setDrugName]   = useState("")
  const [dose, setDose]           = useState("")
  const [form, setForm]           = useState("")
  const [route, setRoute]         = useState("")
  const [frequency, setFrequency] = useState("")
  const [duration, setDuration]   = useState("")
  const [quantity, setQuantity]   = useState("")
  const [refills, setRefills]     = useState("")
  const [prn, setPrn]             = useState(false)
  const [prnReason, setPrnReason] = useState("")
  const [indication, setIndication] = useState("")
  const [instructions, setInstructions] = useState("")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Live SIG preview
  const currentInput: DischargeRxInput = {
    patientId:    props.patientId,
    encounterId:  props.encounterId,
    drugName, dose, form,
    route:        route || undefined,
    frequency:    frequency || undefined,
    duration:     duration || undefined,
    quantity:     quantity || undefined,
    refills:      refills !== "" ? Number(refills) : undefined,
    prn, prnReason: prnReason || undefined,
    indication:   indication || undefined,
    instructions: instructions || undefined,
  }
  const sigPreview = drugName ? buildDosageSig(currentInput) : ""

  function loadData(data: DischargeRxInput) {
    setDrugName(data.drugName ?? "")
    setDose(data.dose ?? "")
    setForm(data.form ?? "")
    setRoute(data.route ?? "")
    setFrequency(data.frequency ?? "")
    setDuration(data.duration ?? "")
    setQuantity(data.quantity ?? "")
    setRefills(data.refills !== undefined ? String(data.refills) : "")
    setPrn(data.prn ?? false)
    setPrnReason(data.prnReason ?? "")
    setIndication(data.indication ?? "")
    setInstructions(data.instructions ?? "")
  }

  function reset() {
    Object.assign(blank, {})
    setDrugName(""); setDose(""); setForm(""); setRoute("")
    setFrequency(""); setDuration(""); setQuantity(""); setRefills("")
    setPrn(false); setPrnReason(""); setIndication(""); setInstructions(""); setError(null)
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (open && isEdit) {
      loadData((props as DischargeRxEditDialogProps).initialData)
    }
  }, [open, isEdit, props])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!drugName.trim()) { setError("Drug name is required."); return }
    setLoading(true); setError(null)
    try {
      if (isEdit) {
        await updateDischargeRx((props as DischargeRxEditDialogProps).rxId, currentInput)
      } else {
        await createDischargeRx(currentInput)
      }
      setOpen(false); reset(); props.onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prescription")
      setLoading(false)
    }
  }

  const trigger = isEdit ? (
    <button
      onClick={() => setOpen(true)}
      title="Edit prescription"
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  ) : (
    <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "gap-2")}>
      <Pill className="h-3.5 w-3.5" />
      Add Prescription
    </DialogTrigger>
  )

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      {trigger}

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Prescription" : "Add Discharge Prescription"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the prescription details below."
              : "Add a medication to the discharge prescription list."}
          </DialogDescription>
        </DialogHeader>
        {props.patient && <PatientBanner {...props.patient} />}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Drug name */}
            <div className="space-y-1.5">
              <Label htmlFor="rx-drug">
                Drug name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rx-drug"
                list="rx-drug-list"
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                placeholder="e.g. Amoxicillin 500mg"
                autoComplete="off"
              />
              <datalist id="rx-drug-list">
                {COMMON_DRUGS.map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>

            {/* Dose + Form row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rx-dose">Dose</Label>
                <Input
                  id="rx-dose"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="e.g. 500mg, 1 tablet"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Form</Label>
                <Select value={form} onValueChange={(v) => setForm(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Form (optional)…" /></SelectTrigger>
                  <SelectContent>
                    {FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Route + Frequency row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Route</Label>
                <Select value={route} onValueChange={(v) => setRoute(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Route…" /></SelectTrigger>
                  <SelectContent>
                    {ROUTES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Frequency…" /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.code} value={f.code}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration + Quantity row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={(v) => setDuration(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Duration…" /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rx-qty">Quantity (units)</Label>
                <Input
                  id="rx-qty"
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 14"
                />
              </div>
            </div>

            {/* Refills */}
            <div className="space-y-1.5">
              <Label htmlFor="rx-refills">Refills allowed</Label>
              <Select value={refills} onValueChange={(v) => setRefills(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="No refills (default)" /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n === 0 ? "0 — No refills" : `${n}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PRN toggle */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={prn}
                onClick={() => setPrn((p) => !p)}
                className={cn(
                  "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                  prn ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "absolute h-4 w-4 rounded-full bg-white shadow transition-transform",
                  prn ? "translate-x-4" : "translate-x-0.5"
                )} />
              </button>
              <div>
                <p className="text-sm font-medium">PRN (as needed)</p>
                <p className="text-xs text-muted-foreground">Prescribe only when required</p>
              </div>
            </div>

            {prn && (
              <div className="space-y-1.5">
                <Label htmlFor="rx-prn-reason">PRN Reason</Label>
                <Input
                  id="rx-prn-reason"
                  value={prnReason}
                  onChange={(e) => setPrnReason(e.target.value)}
                  placeholder="e.g. pain, fever, nausea…"
                />
              </div>
            )}

            {/* Indication */}
            <div className="space-y-1.5">
              <Label htmlFor="rx-indication">Indication / Reason</Label>
              <Input
                id="rx-indication"
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                placeholder="e.g. hypertension, post-op pain, UTI…"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <Label htmlFor="rx-instructions">Special Instructions</Label>
              <Textarea
                id="rx-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Take with food, avoid alcohol, store in refrigerator…"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* SIG preview */}
            {sigPreview && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/60 mb-1">
                  Prescription SIG preview
                </p>
                <p className="text-sm font-medium">{sigPreview}</p>
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={loading}>
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</>
                : isEdit ? "Update Prescription" : "Add Prescription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
