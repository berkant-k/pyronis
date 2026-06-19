"use client"

import { useState, useRef, useLayoutEffect, useCallback } from "react"
import { Camera, Upload, X, Trash2, Loader2, RotateCcw } from "lucide-react"
import { updatePatientPhoto, removePatientPhoto } from "@/lib/fhir-client"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  open:           boolean
  onOpenChange:   (v: boolean) => void
  patientId:      string
  currentPhotoUrl: string | null
  initials:       string
  onPhotoSaved:   (dataUrl: string | null) => void
}

type Mode = "idle" | "camera" | "preview"

const MAX_PX = 512

function resizeToDataUrl(src: string, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement("canvas")
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL(mime, 0.88))
    }
    img.onerror = reject
    img.src = src
  })
}

export function PatientPhotoDialog({
  open, onOpenChange, patientId, currentPhotoUrl, initials, onPhotoSaved,
}: Props) {
  const [mode, setMode]           = useState<Mode>("idle")
  const [preview, setPreview]     = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [removing, setRemoving]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [camError, setCamError]   = useState<string | null>(null)
  const [dragging, setDragging]   = useState(false)

  const fileRef   = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) {
      stopCamera()
      setMode("idle")
      setPreview(null)
      setError(null)
      setCamError(null)
    }
  }, [open, stopCamera])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function startCamera() {
    setCamError(null)
    setMode("camera")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCamError("Camera not available or permission denied.")
      setMode("idle")
    }
  }

  function captureFrame() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    const scale  = Math.min(1, MAX_PX / Math.max(video.videoWidth, video.videoHeight))
    canvas.width  = Math.round(video.videoWidth  * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height)
    stopCamera()
    setPreview(canvas.toDataURL("image/jpeg", 0.88))
    setMode("preview")
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.")
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const resized = await resizeToDataUrl(e.target!.result as string, "image/jpeg")
        setPreview(resized)
        setMode("preview")
      } catch {
        setError("Could not read this image file.")
      }
    }
    reader.readAsDataURL(file)
  }

  async function savePhoto() {
    if (!preview) return
    setSaving(true)
    setError(null)
    try {
      const [, rest] = preview.split(",")
      await updatePatientPhoto(patientId, rest, "image/jpeg")
      onPhotoSaved(preview)
      onOpenChange(false)
    } catch {
      setError("Failed to save photo. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function removePhoto() {
    setRemoving(true)
    setError(null)
    try {
      await removePatientPhoto(patientId)
      onPhotoSaved(null)
      onOpenChange(false)
    } catch {
      setError("Failed to remove photo. Please try again.")
    } finally {
      setRemoving(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "preview" ? "Confirm photo" : mode === "camera" ? "Take photo" : "Patient photo"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Preview mode ── */}
        {mode === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="h-48 w-48 rounded-full object-cover ring-4 ring-primary/20 shadow-lg"
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => { setPreview(null); setMode("idle") }}
                className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
                disabled={saving}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retake
              </button>
              <button
                type="button"
                onClick={savePhoto}
                className={cn(buttonVariants(), "gap-1.5")}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save photo
              </button>
            </div>
          </div>
        )}

        {/* ── Camera mode ── */}
        {mode === "camera" && (
          <div className="space-y-4">
            {camError ? (
              <p className="text-sm text-destructive text-center py-6">{camError}</p>
            ) : (
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-square object-cover"
                />
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => { stopCamera(); setMode("idle") }}
                className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              {!camError && (
                <button
                  type="button"
                  onClick={captureFrame}
                  className={cn(buttonVariants(), "gap-1.5")}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Capture
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Idle mode ── */}
        {mode === "idle" && (
          <div className="space-y-4">
            {/* Current photo or avatar */}
            <div className="flex justify-center">
              {currentPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPhotoUrl}
                  alt="Current photo"
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20 shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/15 shadow-md">
                  <span className="text-3xl font-bold text-primary">{initials}</span>
                </div>
              )}
            </div>

            {/* Upload drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop an image here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WebP — max 10 MB</p>
              </div>
            </div>

            {/* Camera button */}
            <button
              type="button"
              onClick={startCamera}
              className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
            >
              <Camera className="h-4 w-4" />
              Open camera
            </button>

            {/* Remove photo */}
            {currentPhotoUrl && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={removing}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                )}
              >
                {removing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />
                }
                Remove photo
              </button>
            )}

            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
