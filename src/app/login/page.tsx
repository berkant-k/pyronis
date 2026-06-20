"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, KeyRound, Server, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setAuthToken, parseJwtClaims, NO_AUTH_SENTINEL } from "@/lib/auth";
import { FhirSettings } from "@/components/settings/FhirSettings";
import { getFhirBaseUrl } from "@/lib/fhir-client";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [fhirUrl, setFhirUrl] = useState(() => getFhirBaseUrl());
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleSettingsOpenChange(open: boolean) {
    setSettingsOpen(open);
    if (!open) setFhirUrl(getFhirBaseUrl());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = token.trim();

    if (!trimmed) {
      setError("Please enter a JWT token.");
      return;
    }
    if (trimmed.split(".").length !== 3) {
      setError("Invalid JWT — expected three dot-separated segments.");
      return;
    }

    const claims = parseJwtClaims(trimmed);
    if (claims?.exp && typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
      setError("This token has expired.");
      return;
    }

    setAuthToken(trimmed);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
            <HeartPulse className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Pyronis EMR</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in with your access token</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground"
        >
          <Server className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono">{fhirUrl}</span>
          <Settings className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="token" className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-3.5 w-3.5" />
              JWT Access Token
            </Label>
            <Textarea
              id="token"
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(""); }}
              className="font-mono text-xs min-h-32 resize-none"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Sign In
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setAuthToken(NO_AUTH_SENTINEL);
              router.push("/");
              router.refresh();
            }}
          >
            Continue without token
          </Button>
        </form>
      </div>

      <Dialog open={settingsOpen} onOpenChange={handleSettingsOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              FHIR Server Configuration
            </DialogTitle>
          </DialogHeader>
          <FhirSettings />
        </DialogContent>
      </Dialog>
    </div>
  );
}
