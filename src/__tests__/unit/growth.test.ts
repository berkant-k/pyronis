import type { Observation, Patient } from "@medplum/fhirtypes";
import {
  estimateCentile,
  extractGrowthSeries,
  getGrowthReference,
} from "@/lib/growth";

const patient: Patient = {
  resourceType: "Patient",
  id: "p1",
  gender: "male",
  birthDate: "2018-01-01",
};

function observation(code: string, value: number, unit: string, date: string): Observation {
  return {
    resourceType: "Observation",
    status: "final",
    code: { coding: [{ system: "http://loinc.org", code }] },
    effectiveDateTime: date,
    valueQuantity: { value, unit },
  };
}

describe("growth utilities", () => {
  it("extracts weight, height, and calculated BMI readings", () => {
    const series = extractGrowthSeries(patient, [
      observation("29463-7", 20, "kg", "2023-01-01T10:00:00Z"),
      observation("8302-2", 110, "cm", "2023-01-01T10:00:00Z"),
    ]);

    expect(series.sex).toBe("male");
    expect(series.weight).toHaveLength(1);
    expect(series.height).toHaveLength(1);
    expect(series.bmi).toEqual([
      expect.objectContaining({ value: 16.5 }),
    ]);
  });

  it("returns CDC reference rows for the selected sex and metric", () => {
    const rows = getGrowthReference("weight", "female");

    expect(rows[0]).toEqual(expect.objectContaining({ ageYears: 2, p50: 12.06 }));
    expect(rows.length).toBeGreaterThan(30);
  });

  it("estimates a centile label for a reading", () => {
    const label = estimateCentile("weight", "male", {
      ageYears: 5.04,
      value: 18.5,
      date: "2023-01-01T10:00:00Z",
    });

    expect(label).toBe("50th");
  });
});
