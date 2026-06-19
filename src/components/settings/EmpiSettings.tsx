"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Server, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmpiBaseUrl, saveEmpiBaseUrl, testEmpiConnection } from "@/lib/empi-client";

type TestResult = { ok: boolean; message: string };

export function EmpiSettings() {
  const [url, setUrl] = useState(() => getEmpiBaseUrl());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  function handleSave() {
    saveEmpiBaseUrl(url);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    if (!url.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testEmpiConnection(url.trim());
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4" />
          Master Patient Index (eMPI)
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure the eMPI FHIR server used to auto-fill patient demographics from QID lookups in the patient form.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div className="space-y-1.5">
          <Label htmlFor="empi-url">eMPI Server Base URL</Label>
          <div className="flex gap-2">
            <Input
              id="empi-url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://empi.example.com/fhir/r4"
              className="flex-1 font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={!url.trim() || testing}
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </Button>
            <Button type="button" onClick={handleSave} disabled={!url.trim()}>
              {saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </div>

        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
              testResult.ok
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Saved in browser local storage, overriding the{" "}
            <code className="font-mono">NEXT_PUBLIC_EMPI_BASE_URL</code> env variable.
            Each user session can configure its own endpoint.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
