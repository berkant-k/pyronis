import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import config from "@/lib/config.json";

const { system, code } = config.notifications.tag;

async function serverAuthHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const token = cookieStore.get(config.auth.storageKey)?.value ?? null;
    if (!token || token === "no-auth") return {};
    return { Authorization: `Bearer ${token}`, inquiryusername: "pyronis" };
}

export async function POST(req: NextRequest) {
    // Acknowledge immediately — the FHIR server must not time out waiting for us.
    // We fire-and-forget the storage into the response body so 200 is returned quickly.
    console.log("[notify] Received notification");
    const fhirBase = process.env.NEXT_PUBLIC_FHIR_BASE_URL;

    void (async () => {
        try {
            const body = await req.json();
            if(!body){
                console.log("[notify] Received empty body");
                return;
            }

            // Attach our tag so the inbox can query these bundles later.
            const existingTags: { system?: string; code?: string }[] =
                body.meta?.tag ?? [];
            const tagged = {
                ...body,
                id: undefined, // force the server to assign a new ID on storage
                meta: {
                    ...body.meta,
                    tag: [
                        ...existingTags.filter((t) => !(t.system === system && t.code === code)),
                        { system, code },
                    ],
                },
            };

            if (!fhirBase) {
                console.error("[notify] NEXT_PUBLIC_FHIR_BASE_URL is not set");
                return;
            }

            const res = await fetch(`${fhirBase}/Bundle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/fhir+json",
                    Accept: "application/fhir+json",
                    ...(await serverAuthHeaders()),
                },
                body: JSON.stringify(tagged),
            });

            if (!res.ok) {
                console.error(`[notify] Failed to store notification bundle: ${res.status} ${await res.text()}`);
            }
        } catch (err) {
            console.error("[notify] Error processing notification:", err);
        }
    })();

    return new NextResponse(null, { status: 200 });
}
