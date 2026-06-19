"use client";

import { useState } from "react";
import { Braces, Copy, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RawFhirDialogProps {
  resource: Record<string, unknown>;
  title?: string;
}

export function RawFhirDialog({ resource, title }: RawFhirDialogProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(resource, null, 2);
  const resourceType = (resource.resourceType as string | undefined) ?? "Resource";
  const resourceId = (resource.id as string | undefined) ?? "";

  async function handleCopy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5 font-mono text-xs"
        )}
      >
        <Braces className="h-3.5 w-3.5" />
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-row items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <DialogTitle className="font-mono text-base">
              {title ?? `${resourceType}/${resourceId}`}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {resourceType} · id: {resourceId || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5 text-xs"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy JSON
                </>
              )}
            </button>
            <DialogClose
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8"
              )}
            >
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-[oklch(0.145_0.01_264)] rounded-b-xl">
          <pre className="p-5 text-[13px] leading-relaxed font-mono text-[oklch(0.82_0.02_264)] whitespace-pre overflow-x-auto">
            {json}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
