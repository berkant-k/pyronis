"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Loader2 } from "lucide-react"
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
import { createLabOrder } from "@/lib/fhir-client"
import { PatientBanner, type PatientInfo } from "@/components/ui/PatientBanner"

const LAB_PANELS = [
  {
    group: "Hematology",
    tests: [
      { display: "Complete Blood Count (CBC)",              code: "58410-2" },
      { display: "Prothrombin Time / INR",                 code: "5902-2"  },
      { display: "aPTT",                                   code: "3173-2"  },
      { display: "D-Dimer",                                code: "48065-7" },
      { display: "Blood Smear / Peripheral Film",          code: "18723-7" },
      { display: "Reticulocyte Count",                     code: "17849-1" },
    ],
  },
  {
    group: "Chemistry",
    tests: [
      { display: "Basic Metabolic Panel (BMP)",            code: "51990-0" },
      { display: "Comprehensive Metabolic Panel (CMP)",    code: "24323-8" },
      { display: "Lipid Panel",                            code: "57698-3" },
      { display: "Liver Function Tests (LFT)",             code: "24325-3" },
      { display: "Renal Function Panel",                   code: "24362-6" },
      { display: "HbA1c (Glycated Haemoglobin)",           code: "4548-4"  },
      { display: "Fasting Glucose",                        code: "1558-6"  },
      { display: "Random Blood Glucose",                   code: "2345-7"  },
      { display: "Uric Acid",                              code: "3084-1"  },
      { display: "Calcium",                                code: "17861-6" },
      { display: "Magnesium",                              code: "19123-9" },
      { display: "Phosphate",                              code: "2777-1"  },
    ],
  },
  {
    group: "Thyroid & Endocrine",
    tests: [
      { display: "TSH (Thyroid Stimulating Hormone)",      code: "11580-8" },
      { display: "Free T4 (Thyroxine)",                    code: "3024-7"  },
      { display: "Free T3 (Triiodothyronine)",             code: "3051-0"  },
      { display: "Cortisol",                               code: "2143-6"  },
      { display: "Prolactin",                              code: "2842-3"  },
    ],
  },
  {
    group: "Cardiac Markers",
    tests: [
      { display: "Troponin I",                             code: "10839-9" },
      { display: "CK-MB",                                  code: "13969-1" },
      { display: "NT-proBNP",                              code: "33762-6" },
      { display: "BNP (B-type Natriuretic Peptide)",       code: "30934-4" },
    ],
  },
  {
    group: "Inflammatory Markers",
    tests: [
      { display: "C-Reactive Protein (CRP)",               code: "1988-5"  },
      { display: "ESR (Erythrocyte Sedimentation Rate)",   code: "4537-7"  },
      { display: "Ferritin",                               code: "2276-4"  },
      { display: "Procalcitonin (PCT)",                    code: "75241-0" },
    ],
  },
  {
    group: "Microbiology",
    tests: [
      { display: "Blood Culture (Aerobic + Anaerobic)",    code: "600-7"   },
      { display: "Urine Culture",                          code: "630-4"   },
      { display: "Wound Swab Culture",                     code: "12005-8" },
      { display: "Throat Swab Culture",                    code: "626-2"   },
    ],
  },
  {
    group: "Urinalysis",
    tests: [
      { display: "Urinalysis (Routine)",                   code: "24356-8" },
      { display: "Urine Protein / Creatinine Ratio",       code: "13705-9" },
      { display: "Urine Microalbumin",                     code: "1754-7"  },
    ],
  },
  {
    group: "Serology",
    tests: [
      { display: "HIV 1/2 Antibody",                       code: "56888-1" },
      { display: "HBsAg (Hepatitis B Surface Antigen)",    code: "5195-3"  },
      { display: "Anti-HCV (Hepatitis C Antibody)",        code: "16128-1" },
      { display: "VDRL / RPR (Syphilis Screen)",           code: "5291-0"  },
    ],
  },
]

const SPECIMEN_TYPES = [
  "Whole Blood (EDTA)",
  "Serum",
  "Plasma (Citrate)",
  "Plasma (Heparin)",
  "Urine (Random)",
  "Urine (First Morning)",
  "Urine (24-hour)",
  "CSF (Cerebrospinal Fluid)",
  "Swab",
  "Sputum",
  "Stool",
  "Tissue Biopsy",
]

interface LabOrderDialogProps {
  patientId:    string
  encounterId?: string
  patient?:     PatientInfo
}

export function LabOrderDialog({ patientId, encounterId, patient }: LabOrderDialogProps) {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [selectedTest, setSelectedTest] = useState("")
  const [customTest, setCustomTest]   = useState("")
  const [priority, setPriority]       = useState<"routine" | "urgent" | "asap" | "stat">("routine")
  const [specimenType, setSpecimenType] = useState("")
  const [indication, setIndication]   = useState("")
  const [notes, setNotes]             = useState("")
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  function reset() {
    setSelectedTest(""); setCustomTest(""); setPriority("routine")
    setSpecimenType(""); setIndication(""); setNotes(""); setError(null)
  }

  const isCustom   = selectedTest === "__custom__"
  const testDisplay = isCustom ? customTest.trim() : selectedTest

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!testDisplay) { setError("Please select or enter a test name."); return }
    setLoading(true); setError(null)
    try {
      let testCode: string | undefined
      if (!isCustom) {
        for (const g of LAB_PANELS) {
          const t = g.tests.find((x) => x.display === selectedTest)
          if (t) { testCode = t.code; break }
        }
      }
      await createLabOrder({
        patientId, encounterId, testDisplay, testCode, priority,
        specimenType: specimenType || undefined,
        indication:   indication.trim() || undefined,
        notes:        notes.trim() || undefined,
      })
      setOpen(false); reset(); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lab order")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
        <FlaskConical className="h-3.5 w-3.5" />
        Order Lab
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Lab Order</DialogTitle>
          <DialogDescription>Order a laboratory investigation for this patient.</DialogDescription>
        </DialogHeader>
        {patient && <PatientBanner {...patient} />}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>
                Test / Panel <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedTest} onValueChange={(v) => setSelectedTest(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a test…" />
                </SelectTrigger>
                <SelectContent>
                  {LAB_PANELS.map((g) => (
                    <SelectGroup key={g.group}>
                      <SelectLabel>{g.group}</SelectLabel>
                      {g.tests.map((t) => (
                        <SelectItem key={t.code} value={t.display}>{t.display}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    <SelectItem value="__custom__">Custom / Unlisted test…</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {isCustom && (
                <Input
                  value={customTest}
                  onChange={(e) => setCustomTest(e.target.value)}
                  placeholder="Enter test name…"
                  className="mt-2"
                  autoFocus
                />
              )}
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
              <Label>Specimen Type</Label>
              <Select value={specimenType} onValueChange={(v) => setSpecimenType(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select specimen type (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIMEN_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lab-indication">Clinical Indication</Label>
              <Textarea
                id="lab-indication"
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                placeholder="Reason for ordering this test…"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lab-notes">Additional Notes</Label>
              <Textarea
                id="lab-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fasting required, special handling instructions…"
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
