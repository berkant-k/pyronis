import type { Questionnaire, QuestionnaireResponse, QuestionnaireResponseItem } from "@medplum/fhirtypes";
import config from "./config.json";

// ─── Shared answer sets ───────────────────────────────────────────────────────

const PHQ_LIKERT_SYSTEM = config.fhir.codeSystems.phqLikert;

const PHQ_LIKERT = [
    { valueCoding: { system: PHQ_LIKERT_SYSTEM, code: "0", display: "Not at all" } },
    { valueCoding: { system: PHQ_LIKERT_SYSTEM, code: "1", display: "Several days" } },
    { valueCoding: { system: PHQ_LIKERT_SYSTEM, code: "2", display: "More than half the days" } },
    { valueCoding: { system: PHQ_LIKERT_SYSTEM, code: "3", display: "Nearly every day" } },
];

// ─── PHQ-9 ────────────────────────────────────────────────────────────────────

export const PHQ9: Questionnaire = {
    resourceType: "Questionnaire",
    id: "phq9",
    url: config.fhir.questionnaires.phq9,
    name: "PHQ9",
    title: "Patient Health Questionnaire (PHQ-9)",
    status: "active",
    description: "9-item depression screening tool. Score 0–27. Takes ~2 minutes.",
    item: [
        {
            linkId: "phq9-instructions",
            text: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
            type: "display",
        },
        {
            linkId: "phq9-q1",
            text: "1. Little interest or pleasure in doing things",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "phq9-q2",
            text: "2. Feeling down, depressed, or hopeless",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "phq9-q3",
            text: "3. Trouble falling or staying asleep, or sleeping too much",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "phq9-q4",
            text: "4. Feeling tired or having little energy",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "phq9-q5",
            text: "5. Poor appetite or overeating",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "phq9-q6",
            text: "6. Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "phq9-q7",
            text: "7. Trouble concentrating on things, such as reading or watching television",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "phq9-q8",
            text: "8. Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving a lot more than usual",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "phq9-q9",
            text: "9. Thoughts that you would be better off dead, or of hurting yourself in some way",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
    ],
};

// ─── GAD-7 ────────────────────────────────────────────────────────────────────

export const GAD7: Questionnaire = {
    resourceType: "Questionnaire",
    id: "gad7",
    url: config.fhir.questionnaires.gad7,
    name: "GAD7",
    title: "Generalized Anxiety Disorder (GAD-7)",
    status: "active",
    description: "7-item anxiety screening tool. Score 0–21. Takes ~2 minutes.",
    item: [
        {
            linkId: "gad7-instructions",
            text: "Over the last 2 weeks, how often have you been bothered by the following problems?",
            type: "display",
        },
        {
            linkId: "gad7-q1",
            text: "1. Feeling nervous, anxious, or on edge",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "gad7-q2",
            text: "2. Not being able to stop or control worrying",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "gad7-q3",
            text: "3. Worrying too much about different things",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "gad7-q4",
            text: "4. Trouble relaxing",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "gad7-q5",
            text: "5. Being so restless that it is hard to sit still",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "gad7-q6",
            text: "6. Becoming easily annoyed or irritable",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
        {
            linkId: "gad7-q7",
            text: "7. Feeling afraid as if something awful might happen",
            type: "choice",
            required: true,
            answerOption: PHQ_LIKERT,
        },
    ],
};

// ─── AUDIT-C ──────────────────────────────────────────────────────────────────

const AUDIT_SYS = config.fhir.codeSystems.auditC;

export const AUDIT_C: Questionnaire = {
    resourceType: "Questionnaire",
    id: "audit-c",
    url: config.fhir.questionnaires.auditC,
    name: "AUDITC",
    title: "Alcohol Use Disorders Identification Test (AUDIT-C)",
    status: "active",
    description: "3-item alcohol use screening tool. Score 0–12. Takes ~1 minute.",
    item: [
        {
            linkId: "audit-q1",
            text: "1. How often did you have a drink containing alcohol in the past year?",
            type: "choice",
            required: true,
            answerOption: [
                { valueCoding: { system: AUDIT_SYS, code: "0", display: "Never" } },
                { valueCoding: { system: AUDIT_SYS, code: "1", display: "Monthly or less" } },
                { valueCoding: { system: AUDIT_SYS, code: "2", display: "2–4 times a month" } },
                { valueCoding: { system: AUDIT_SYS, code: "3", display: "2–3 times a week" } },
                { valueCoding: { system: AUDIT_SYS, code: "4", display: "4 or more times a week" } },
            ],
        },
        {
            linkId: "audit-q2",
            text: "2. How many drinks containing alcohol did you have on a typical day when you were drinking in the past year?",
            type: "choice",
            required: true,
            answerOption: [
                { valueCoding: { system: AUDIT_SYS, code: "0", display: "1 or 2" } },
                { valueCoding: { system: AUDIT_SYS, code: "1", display: "3 or 4" } },
                { valueCoding: { system: AUDIT_SYS, code: "2", display: "5 or 6" } },
                { valueCoding: { system: AUDIT_SYS, code: "3", display: "7 to 9" } },
                { valueCoding: { system: AUDIT_SYS, code: "4", display: "10 or more" } },
            ],
        },
        {
            linkId: "audit-q3",
            text: "3. How often did you have six or more drinks on one occasion in the past year?",
            type: "choice",
            required: true,
            answerOption: [
                { valueCoding: { system: AUDIT_SYS, code: "0", display: "Never" } },
                { valueCoding: { system: AUDIT_SYS, code: "1", display: "Less than monthly" } },
                { valueCoding: { system: AUDIT_SYS, code: "2", display: "Monthly" } },
                { valueCoding: { system: AUDIT_SYS, code: "3", display: "Weekly" } },
                { valueCoding: { system: AUDIT_SYS, code: "4", display: "Daily or almost daily" } },
            ],
        },
    ],
};

// ─── Patient Intake ───────────────────────────────────────────────────────────

export const PATIENT_INTAKE: Questionnaire = {
    resourceType: "Questionnaire",
    id: "patient-intake",
    url: config.fhir.questionnaires.patientIntake,
    name: "PatientIntake",
    title: "Patient Intake Form",
    status: "active",
    description: "Pre-visit intake: chief complaint, symptoms, and health history.",
    item: [
        {
            linkId: "intake-complaint",
            text: "What is your main reason for today's visit? (Chief Complaint)",
            type: "text",
            required: true,
        },
        {
            linkId: "intake-duration",
            text: "How long have you had this problem?",
            type: "choice",
            required: true,
            answerOption: [
                { valueCoding: { system: config.fhir.codeSystems.duration, code: "days", display: "Days" } },
                { valueCoding: { system: config.fhir.codeSystems.duration, code: "weeks", display: "Weeks" } },
                { valueCoding: { system: config.fhir.codeSystems.duration, code: "months", display: "Months" } },
                { valueCoding: { system: config.fhir.codeSystems.duration, code: "years", display: "Years" } },
            ],
        },
        {
            linkId: "intake-pain",
            text: "Pain level right now (0 = no pain, 10 = worst imaginable pain)",
            type: "integer",
            required: false,
            extension: [{ url: "http://hl7.org/fhir/StructureDefinition/minValue", valueInteger: 0 }, { url: "http://hl7.org/fhir/StructureDefinition/maxValue", valueInteger: 10 }],
        },
        {
            linkId: "intake-symptoms-group",
            text: "Current Symptoms",
            type: "group",
            item: [
                { linkId: "intake-fever",    text: "Fever",                type: "boolean" },
                { linkId: "intake-cough",    text: "Cough",                type: "boolean" },
                { linkId: "intake-sob",      text: "Shortness of breath",  type: "boolean" },
                { linkId: "intake-nausea",   text: "Nausea or vomiting",   type: "boolean" },
                { linkId: "intake-diarrhea", text: "Diarrhea",             type: "boolean" },
                { linkId: "intake-headache", text: "Headache",             type: "boolean" },
                { linkId: "intake-chest",    text: "Chest pain",           type: "boolean" },
                { linkId: "intake-dizzy",    text: "Dizziness",            type: "boolean" },
                { linkId: "intake-fatigue",  text: "Fatigue",              type: "boolean" },
            ],
        },
        {
            linkId: "intake-meds",
            text: "List any medications you are currently taking",
            type: "text",
            required: false,
        },
        {
            linkId: "intake-allergies",
            text: "List any known allergies (medications, food, or environmental)",
            type: "text",
            required: false,
        },
        {
            linkId: "intake-smoker",
            text: "Do you currently smoke or use tobacco?",
            type: "boolean",
            required: false,
        },
        {
            linkId: "intake-alcohol",
            text: "Do you drink alcohol?",
            type: "boolean",
            required: false,
        },
    ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const BUILTIN_QUESTIONNAIRES: Questionnaire[] = [
    PHQ9,
    GAD7,
    AUDIT_C,
    PATIENT_INTAKE,
];

export function getBuiltinQuestionnaire(id: string): Questionnaire | undefined {
    return BUILTIN_QUESTIONNAIRES.find((q) => q.id === id);
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface QuestionnaireScore {
    total: number;
    max: number;
    severity: string;
    color: "green" | "yellow" | "orange" | "red";
}

function itemAnswerInteger(item: QuestionnaireResponseItem): number | null {
    const ans = item.answer?.[0];
    if (!ans) return null;
    if (ans.valueCoding?.code != null) {
        const v = parseInt(ans.valueCoding.code, 10);
        return isNaN(v) ? null : v;
    }
    if (ans.valueInteger != null) return ans.valueInteger;
    return null;
}

function collectFlatItems(items: QuestionnaireResponseItem[]): QuestionnaireResponseItem[] {
    const flat: QuestionnaireResponseItem[] = [];
    for (const item of items) {
        flat.push(item);
        if (item.item?.length) flat.push(...collectFlatItems(item.item));
    }
    return flat;
}

export function scoreResponse(
    questionnaire: Questionnaire,
    response: QuestionnaireResponse,
): QuestionnaireScore | null {
    const qid = questionnaire.id;
    if (!qid || !["phq9", "gad7", "audit-c"].includes(qid)) return null;

    const flat = collectFlatItems(response.item ?? []);
    const byLinkId = new Map(flat.map((i) => [i.linkId, i]));

    const scoredItems = (questionnaire.item ?? [])
        .filter((i) => i.type === "choice")
        .map((i) => {
            const ri = byLinkId.get(i.linkId);
            if (!ri) return null;
            return itemAnswerInteger(ri);
        })
        .filter((v): v is number => v !== null);

    if (scoredItems.length === 0) return null;
    const total = scoredItems.reduce((a, b) => a + b, 0);

    if (qid === "phq9") {
        const severity =
            total <= 4 ? "Minimal" :
            total <= 9 ? "Mild" :
            total <= 14 ? "Moderate" :
            total <= 19 ? "Moderately Severe" : "Severe";
        const color =
            total <= 4 ? "green" : total <= 9 ? "yellow" : total <= 14 ? "orange" : "red";
        return { total, max: 27, severity, color };
    }
    if (qid === "gad7") {
        const severity =
            total <= 4 ? "Minimal" : total <= 9 ? "Mild" : total <= 14 ? "Moderate" : "Severe";
        const color =
            total <= 4 ? "green" : total <= 9 ? "yellow" : total <= 14 ? "orange" : "red";
        return { total, max: 21, severity, color };
    }
    if (qid === "audit-c") {
        const severity = total >= 4 ? "Positive Screen" : "Negative Screen";
        const color = total >= 4 ? "red" : "green";
        return { total, max: 12, severity, color };
    }
    return null;
}

export const SCORE_COLORS: Record<QuestionnaireScore["color"], string> = {
    green:  "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red:    "bg-red-50 text-red-700 border-red-200",
};
