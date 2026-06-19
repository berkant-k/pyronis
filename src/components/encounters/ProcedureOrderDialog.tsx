"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createProcedureOrder, type ProcedureOrderInput } from "@/lib/fhir-client"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

interface Props {
  patientId:   string
  encounterId: string
  onSaved:     () => void
  patient?:    PatientInfo
}

const COMMON_PROCEDURES = [
  // Wound/Skin
  "Wound dressing change", "Wound debridement", "Wound irrigation",
  "Wound closure (sutures)", "Wound closure (staples)", "Wound closure (glue)",
  "Skin biopsy", "Excision of skin lesion", "Incision and drainage (I&D)",
  "Laceration repair",
  // IV / Lines
  "Peripheral IV insertion", "Peripheral IV removal",
  "Central venous catheter (CVC) insertion", "Central venous catheter removal",
  "PICC line insertion", "PICC line removal",
  "Arterial line insertion", "Arterial line removal",
  // Urinary
  "Urinary catheter insertion (Foley)", "Urinary catheter removal",
  "Bladder irrigation", "Suprapubic catheter insertion",
  // Respiratory / Airway
  "Nasogastric tube insertion", "Nasogastric tube removal",
  "Endotracheal intubation", "Extubation",
  "Tracheostomy care", "Nasopharyngeal suctioning",
  "Nebulizer treatment", "Oxygen therapy initiation",
  "Non-invasive ventilation (NIV) initiation",
  // Cardiovascular
  "12-lead ECG", "Defibrillation", "Cardioversion",
  "Cardiac monitoring initiation", "Pericardiocentesis",
  // Diagnostic / Therapeutic
  "Lumbar puncture", "Thoracocentesis", "Paracentesis",
  "Joint aspiration (arthrocentesis)", "Bone marrow aspiration",
  "Chest tube insertion", "Chest tube removal",
  // Transfusion
  "Blood transfusion", "Platelet transfusion", "Fresh frozen plasma transfusion",
  // Minor surgical / procedural
  "Circumcision", "Vasectomy", "Bartholin cyst drainage",
  "Nail avulsion", "Foreign body removal",
  // Eye / ENT
  "Eye irrigation", "Nasal packing", "Epistaxis management",
  "Ear irrigation", "Syringing of ear",
  // Obstetrics / Gynecology
  "Fetal monitoring initiation", "Vaginal examination",
  "Cervical cerclage",
]

const BODY_SITES = [
  "Head", "Face", "Neck", "Chest", "Abdomen", "Back", "Spine",
  "Left arm", "Right arm", "Left hand", "Right hand",
  "Left leg", "Right leg", "Left foot", "Right foot",
  "Left groin", "Right groin", "Perineum",
  "Left antecubital fossa", "Right antecubital fossa",
  "Bilateral", "Multiple sites",
]

const BLANK: Omit<ProcedureOrderInput, "patientId" | "encounterId"> = {
  procedureName: "", bodySite: "", priority: "routine", indication: "", notes: "",
}

export function ProcedureOrderDialog({ patientId, encounterId, onSaved, patient }: Props) {
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set<K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.procedureName.trim()) return
    setSaving(true); setError(null)
    try {
      await createProcedureOrder({ patientId, encounterId, ...form })
      setOpen(false)
      setForm(BLANK)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create procedure order")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
        <Plus className="h-3.5 w-3.5" />
        Order Procedure
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Order Procedure</DialogTitle>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Procedure name */}
          <div className="space-y-1.5">
            <Label htmlFor="po-name">Procedure <span className="text-destructive">*</span></Label>
            <Input
              id="po-name"
              list="po-name-list"
              placeholder="Search or type procedure name"
              value={form.procedureName}
              onChange={(e) => set("procedureName", e.target.value)}
              required
            />
            <datalist id="po-name-list">
              {COMMON_PROCEDURES.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>

          {/* Body site + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="po-site">Body Site</Label>
              <Input
                id="po-site"
                list="po-site-list"
                placeholder="e.g. Left arm"
                value={form.bodySite ?? ""}
                onChange={(e) => set("bodySite", e.target.value)}
              />
              <datalist id="po-site-list">
                {BODY_SITES.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", (v ?? "routine") as typeof form.priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="asap">ASAP</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Indication */}
          <div className="space-y-1.5">
            <Label htmlFor="po-indication">Clinical Indication</Label>
            <Input
              id="po-indication"
              placeholder="Reason for ordering this procedure"
              value={form.indication ?? ""}
              onChange={(e) => set("indication", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="po-notes">Notes</Label>
            <Textarea
              id="po-notes"
              rows={2}
              placeholder="Special instructions or additional information"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.procedureName.trim()}
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Order
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
