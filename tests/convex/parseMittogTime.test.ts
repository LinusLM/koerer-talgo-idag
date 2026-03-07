import { expect, test, vi } from 'vitest';
import { parseMittogTime } from '../../lib/parseMittogTime';

test('parseMittogTime parses full date and time', () => {
    const t = parseMittogTime('07-03-2026 14:22:00');
    expect(Number.isFinite(t)).toBe(true);
    const d = new Date(t);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getDate()).toBe(7);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(22);
});

test('parseMittogTime interprets time-only as today or next day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T13:22:36+01:00'));

    const a = parseMittogTime('14:22');
    expect(Number.isFinite(a)).toBe(true);
    expect(new Date(a).getDate()).toBe(7);

    const b = parseMittogTime('00:10');
    expect(Number.isFinite(b)).toBe(true);
    expect(new Date(b).getDate()).toBe(8);

    vi.useRealTimers();
});
