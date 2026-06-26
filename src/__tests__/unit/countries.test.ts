import {COUNTRIES} from "@/lib/countries";

describe('countries type check', () => {
    it('should return an array of countries', () => {
        expect(COUNTRIES).toBeInstanceOf(Array);
        expect(COUNTRIES).toHaveLength(257);
        const firstCountry = COUNTRIES[0];
        expect(firstCountry).toHaveProperty('name');
        expect(firstCountry).toHaveProperty('code');
        expect(firstCountry.code).toEqual("634");
    })
})