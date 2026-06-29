import { fhirTenantHeaders } from "@/lib/auth";

describe("fhirTenantHeaders", () => {
    const originalTenant = process.env.NEXT_PUBLIC_FHIR_TENANT;

    afterEach(() => {
        process.env.NEXT_PUBLIC_FHIR_TENANT = originalTenant;
    });

    it("uses the configured tenant header fallback", async () => {
        delete process.env.NEXT_PUBLIC_FHIR_TENANT;

        expect(fhirTenantHeaders()).toEqual({ inquiryusername: "pyronis" });
    });

    it("uses NEXT_PUBLIC_FHIR_TENANT when set", async () => {
        process.env.NEXT_PUBLIC_FHIR_TENANT = "tenant-a";

        expect(fhirTenantHeaders()).toEqual({ inquiryusername: "tenant-a" });
    });
});
