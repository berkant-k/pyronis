"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Scan, Loader2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { createRadOrder } from "@/lib/fhir-client"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

const RAD_STUDIES = [
  {
    group: "X-Ray (Plain Film)",
    studies: [
      { display: "Chest X-Ray (PA)" },
      { display: "Chest X-Ray (AP / Portable)" },
      { display: "Abdominal X-Ray (KUB)" },
      { display: "Pelvis X-Ray" },
      { display: "Cervical Spine X-Ray" },
      { display: "Thoracic Spine X-Ray" },
      { display: "Lumbar Spine X-Ray" },
      { display: "Hand / Wrist X-Ray" },
      { display: "Foot / Ankle X-Ray" },
      { display: "Knee X-Ray" },
      { display: "Shoulder X-Ray" },
    ],
  },
  {
    group: "CT Scan",
    studies: [
      { display: "CT Head (non-contrast)" },
      { display: "CT Head (with contrast)" },
      { display: "CT Chest (non-contrast)" },
      { display: "CT Chest (with contrast)" },
      { display: "CT Abdomen (non-contrast)" },
      { display: "CT Abdomen & Pelvis (non-contrast)" },
      { display: "CT Abdomen & Pelvis (with contrast)" },
      { display: "CT Angiography (CTA) Chest" },
      { display: "CT Angiography (CTA) Abdomen" },
      { display: "CT Pulmonary Angiography (CTPA)" },
      { display: "CT Coronary Angiography (CTCA)" },
      { display: "CT Cervical Spine" },
      { display: "CT Lumbar Spine" },
      { display: "CT Sinuses" },
      { display: "CT Neck" },
    ],
  },
  {
    group: "MRI",
    studies: [
      { display: "MRI Brain (non-contrast)" },
      { display: "MRI Brain (with contrast)" },
      { display: "MRI Cervical Spine" },
      { display: "MRI Thoracic Spine" },
      { display: "MRI Lumbar Spine" },
      { display: "MRI Abdomen" },
      { display: "MRI Pelvis" },
      { display: "MRI Knee" },
      { display: "MRI Shoulder" },
      { display: "MRI Hip" },
      { display: "MRI Cardiac" },
      { display: "MRA Brain (MR Angiography)" },
      { display: "MRI Breast" },
    ],
  },
  {
    group: "Ultrasound",
    studies: [
      { display: "US Abdomen (Upper)" },
      { display: "US Pelvis (Pelvic)" },
      { display: "US Pelvis (Obstetric)" },
      { display: "US Thyroid / Neck" },
      { display: "US Renal & Bladder" },
      { display: "US Hepatobiliary" },
      { display: "US Testicular / Scrotal" },
      { display: "US Breast" },
      { display: "US Arterial Doppler (Lower Extremity)" },
      { display: "US Venous Doppler (Lower Extremity)" },
      { display: "FAST Exam (Trauma)" },
      { display: "Echocardiogram (2D Echo)" },
      { display: "Transoesophageal Echo (TOE)" },
    ],
  },
  {
    group: "Nuclear Medicine",
    studies: [
      { display: "DEXA Bone Density Scan" },
      { display: "Bone Scan (Whole Body)" },
      { display: "V/Q Scan (Ventilation Perfusion)" },
      { display: "PET-CT (Oncology)" },
      { display: "Thyroid Scan / Uptake" },
    ],
  },
  {
    group: "Fluoroscopy",
    studies: [
      { display: "Barium Swallow" },
      { display: "Upper GI Series" },
      { display: "Barium Enema" },
      { display: "Intravenous Pyelogram (IVP)" },
    ],
  },
]

interface RadOrderDialogProps {
  patientId:    string
  encounterId?: string
  patient?:     PatientInfo
}

export function RadOrderDialog({ patientId, encounterId, patient }: RadOrderDialogProps) {
  const router = useRouter()
  const [open, setOpen]                 = useState(false)
  const [selectedStudy, setSelectedStudy] = useState("")
  const [customStudy, setCustomStudy]   = useState("")
  const [bodyPart, setBodyPart]         = useState("")
  const [contrast, setContrast]         = useState<"yes" | "no" | "">("")
  const [priority, setPriority]         = useState<"routine" | "urgent" | "asap" | "stat">("routine")
  const [indication, setIndication]     = useState("")
  const [notes, setNotes]               = useState("")
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  function reset() {
    setSelectedStudy(""); setCustomStudy(""); setBodyPart("")
    setContrast(""); setPriority("routine"); setIndication(""); setNotes(""); setError(null)
  }

  const isCustom    = selectedStudy === "__custom__"
  const studyDisplay = isCustom ? customStudy.trim() : selectedStudy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studyDisplay) { setError("Please select or enter a study name."); return }
    setLoading(true); setError(null)
    try {
      await createRadOrder({
        patientId, encounterId, studyDisplay,
        bodyPart:   bodyPart.trim() || undefined,
        contrast:   contrast === "yes" ? true : contrast === "no" ? false : undefined,
        priority,
        indication: indication.trim() || undefined,
        notes:      notes.trim() || undefined,
      })
      setOpen(false); reset(); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create radiology order")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
        <Scan className="h-3.5 w-3.5" />
        Order Radiology
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Radiology Order</DialogTitle>
          <DialogDescription>Order an imaging study for this patient.</DialogDescription>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>
                Study <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedStudy} onValueChange={(v) => setSelectedStudy(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a study…" />
                </SelectTrigger>
                <SelectContent>
                  {RAD_STUDIES.map((g) => (
                    <SelectGroup key={g.group}>
                      <SelectLabel>{g.group}</SelectLabel>
                      {g.studies.map((s) => (
                        <SelectItem key={`${g.group}:${s.display}`} value={s.display}>{s.display}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    <SelectItem value="__custom__">Custom / Unlisted study…</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {isCustom && (
                <Input
                  value={customStudy}
                  onChange={(e) => setCustomStudy(e.target.value)}
                  placeholder="Enter study name…"
                  className="mt-2"
                  autoFocus
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rad-bodypart">Body Region / Area</Label>
              <Input
                id="rad-bodypart"
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                placeholder="e.g. Right knee, Left femur, Neck…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Contrast</Label>
              <Select value={contrast} onValueChange={(v) => setContrast((v ?? "") as typeof contrast)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not specified (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">With contrast</SelectItem>
                  <SelectItem value="no">Without contrast</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority((v ?? "routine") as typeof priority)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="asap">ASAP</SelectItem>
                  <SelectItem value="stat">STAT (Immediate)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rad-indication">Clinical Indication</Label>
              <Textarea
                id="rad-indication"
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                placeholder="Reason for ordering this study…"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rad-notes">Additional Notes</Label>
              <Textarea
                id="rad-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sedation required, contrast allergy, follow-up study…"
                rows={2}
                className="resize-none"
              />
            </div>
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
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Ordering…</> : "Place Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
