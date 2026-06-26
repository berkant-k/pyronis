"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Patient } from "@medplum/fhirtypes";
import {
  patientDisplayName,
  patientAge,
  formatDate,
  getPatientMRN,
  getPatientQID,
  getPatientPassport,
  getPatientPhone,
} from "@/lib/fhir-client";
import { usePatientSearch } from "@/lib/query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Loader2, User, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PatientSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { data: patients = [], isFetching, isFetched, refetch } = usePatientSearch(query);

  const trimmed = query.trim();
  const hasSearched = trimmed.length >= 2 && isFetched;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (trimmed.length >= 2) void refetch();
  }

  function clearSearch() {
    setQuery("");
  }

  function initials(p: Patient): string {
    const name = p.name?.find((n) => !n.extension?.length) ?? p.name?.[0];
    const first = name?.given?.[0]?.[0] ?? "";
    const last = name?.family?.[0] ?? "";
    return (first + last).toUpperCase() || "?";
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, MRN, QID, passport, or phone…"
            className="pl-9 pr-8"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={isFetching || trimmed.length < 2}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {hasSearched && (
        <div className="rounded-md border bg-background">
          {patients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <User className="h-8 w-8" />
              <p className="text-sm font-medium">No patients found</p>
              <p className="text-xs">
                No results for &ldquo;{query}&rdquo; — try a different name, MRN, or QID
              </p>
            </div>
          ) : (
            <>
              <div className="border-b px-4 py-2">
                <p className="text-xs text-muted-foreground">
                  {patients.length} patient{patients.length !== 1 ? "s" : ""} found
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">MRN</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="w-36">QID</TableHead>
                    <TableHead className="w-28">Passport</TableHead>
                    <TableHead className="w-28">DOB</TableHead>
                    <TableHead className="w-20">Gender</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => {
                    const mrn      = getPatientMRN(p);
                    const qid      = getPatientQID(p);
                    const passport = getPatientPassport(p);
                    const phone    = getPatientPhone(p);

                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/patients/${p.id}`)}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {mrn ? `MR-${mrn}` : <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs">{initials(p)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{patientDisplayName(p)}</p>
                              {phone && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-sm">
                          {qid || <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        <TableCell className="font-mono text-sm">
                          {passport || <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(p.birthDate)}
                          {p.birthDate && (
                            <span className="block text-[11px]">{patientAge(p)} yrs</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {p.gender && (
                            <Badge variant="secondary" className="capitalize">
                              {p.gender}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Search className="h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">Search for a patient</p>
          <p className="text-xs text-center max-w-xs">
            Enter a name, MRN (e.g. MR-000123), QID (11-digit), passport number, or phone number
          </p>
        </div>
      )}
    </div>
  );
}
