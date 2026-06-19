import { EmpiSettings } from "@/components/settings/EmpiSettings";
import { FhirSettings } from "@/components/settings/FhirSettings";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage system integrations and preferences.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          FHIR Server
        </h2>
        <FhirSettings />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Integrations
        </h2>
        <EmpiSettings />
      </section>
    </div>
  );
}
