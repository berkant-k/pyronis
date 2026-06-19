import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { EncounterSearch } from "@/components/encounters/EncounterSearch";

export const metadata: Metadata = { title: "Encounters | Pyronis EMR" };

export default function EncountersPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Encounters</h1>
          <p className="text-sm text-muted-foreground">
            Search and filter encounters across all patients
          </p>
        </div>
      </div>
      <EncounterSearch />
    </div>
  );
}
