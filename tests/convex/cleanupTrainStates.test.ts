import { expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { internal } from '../../convex/_generated/api';
const modules = import.meta.glob('../../convex/**/*.ts') as Record<string, () => Promise<any>>;

test('cleanupTrainStates removes old entries older than cutoff', async () => {
    vi.useFakeTimers();
    // Current time fixed
    const now = new Date('2026-03-07T12:00:00+01:00').getTime();
    vi.setSystemTime(now);

    const t = convexTest(schema, modules);

    // Insert old and recent trainStates
    await t.run(async (ctx) => {
        // Old: 6 hours ago
        await ctx.db.insert('trainStates', {
            stationId: 'KH',
            trainId: 'old',
            wasTalgo: false,
            wasCancelled: false,
            departureTime: now - 6 * 60 * 60 * 1000,
        });

        // Recent: 1 hour ago
        await ctx.db.insert('trainStates', {
            stationId: 'KH',
            trainId: 'recent',
            wasTalgo: false,
            wasCancelled: false,
            departureTime: now - 1 * 60 * 60 * 1000,
        });
    });

    // Run cleanup
    await t.run(async (ctx) => {
        await ctx.runMutation(internal.cleanupTrainStates.cleanupTrainStates

        );
    });

    // Verify only recent remains
    const remaining = await t.run(async (ctx) => {
        return await ctx.db.query('trainStates').collect();
    });

    expect(remaining.find((r: any) => r.trainId === 'old')).toBeUndefined();
    expect(remaining.find((r: any) => r.trainId === 'recent')).toBeTruthy();

    vi.useRealTimers();
});
