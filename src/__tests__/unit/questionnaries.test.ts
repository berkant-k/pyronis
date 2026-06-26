import {BUILTIN_QUESTIONNAIRES} from "@/lib/questionnaires";

describe("Questionnaires", () => {
    it("should have at least four questionnaire", () => {
        expect(BUILTIN_QUESTIONNAIRES.length).toBeGreaterThan(3);
        const firstQuestionnaire = BUILTIN_QUESTIONNAIRES[0];
        expect(firstQuestionnaire).toHaveProperty('id');
        expect(firstQuestionnaire).toHaveProperty('name');
        expect(firstQuestionnaire).toHaveProperty('item');
    });
})