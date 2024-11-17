import {describe, expect, it} from 'vitest';
import synonyms from './synonyms';

describe("Testing synonym matcher", () => {
    it("exact word match", () => {
        expect(synonyms('Bazofily')).toBe('Basophils');
    })

    it("partial word match", () => {
        expect(synonyms('03472 Bazofily')).toBe('Basophils');
    })

    it("match order", () => {
        expect(synonyms('Bazofily -abs')).toBe('Basophils Absolute');
    })
})