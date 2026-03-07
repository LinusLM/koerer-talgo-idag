import { describe, it, expect } from 'vitest';
import { parseMittogTime } from '../lib/parseMittogTime';

describe('parseMittogTime', () => {
    it('parses HH:mm without seconds', () => {
        const t = parseMittogTime('07-03-2026 10:07');
        expect(Number.isFinite(t)).toBe(true);
        const d = new Date(t);
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(2); // March is month 2 (0-indexed)
        expect(d.getDate()).toBe(7);
        expect(d.getHours()).toBe(10);
        expect(d.getMinutes()).toBe(7);
        expect(d.getSeconds()).toBe(0);
    });

    it('parses HH:mm:ss with seconds', () => {
        const t = parseMittogTime('07-03-2026 10:07:05');
        expect(Number.isFinite(t)).toBe(true);
        const d = new Date(t);
        expect(d.getHours()).toBe(10);
        expect(d.getMinutes()).toBe(7);
        expect(d.getSeconds()).toBe(5);
    });

    it('returns NaN for invalid strings', () => {
        expect(Number.isFinite(parseMittogTime(''))).toBe(false);
        expect(Number.isFinite(parseMittogTime('not a date'))).toBe(false);
        expect(Number.isFinite(parseMittogTime('32-13-2026 10:00'))).toBe(false);
    });
});
