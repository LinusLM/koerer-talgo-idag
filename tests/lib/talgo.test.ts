import { test, expect } from 'vitest';
import { isTalgo } from '../../lib/talgo';

test('isTalgo returns false for empty or missing unit info', () => {
    expect(isTalgo({})).toBe(false);
    expect(isTalgo({ Routes: [] })).toBe(false);
    expect(isTalgo({ routes: [{}, {}] })).toBe(false);
});

test('isTalgo detects Talgo formation from UnitType and unitType fields', () => {
    // Build units matching required TALGO_FORMATION counts
    const routes: any[] = [];
    routes.push(...Array(2).fill({ UnitType: 'BPD' }));
    routes.push({ UnitType: 'APT' });
    routes.push({ UnitType: 'AP' });
    routes.push({ UnitType: 'BPH' });
    routes.push(...Array(4).fill({ UnitType: 'BP' }));
    routes.push(...Array(3).fill({ UnitType: 'BPT' }));

    const train = { Routes: routes };
    expect(isTalgo(train)).toBe(true);

    // Also accept alternate shape with lowercase keys
    const routes2: any[] = [];
    routes2.push(...Array(2).fill({ unitType: 'BPD' }));
    routes2.push({ unitType: 'APT' });
    routes2.push({ unitType: 'AP' });
    routes2.push({ unitType: 'BPH' });
    routes2.push(...Array(4).fill({ unitType: 'BP' }));
    routes2.push(...Array(3).fill({ unitType: 'BPT' }));
    const train2 = { routes: routes2 };
    expect(isTalgo(train2)).toBe(true);
});

test('isTalgo returns false when formation counts are insufficient', () => {
    const routes = [
        { UnitType: 'BP' },
        { UnitType: 'BP' },
        { UnitType: 'BPD' },
    ];
    expect(isTalgo({ Routes: routes })).toBe(false);
});
