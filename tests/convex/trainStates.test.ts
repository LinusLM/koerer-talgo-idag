import { expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
const modules = import.meta.glob('../../convex/**/*.ts') as Record<string, () => Promise<any>>;

test('upsertTrainState inserts and updates state, queries return expected values', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T13:00:00+01:00'));

    const t = convexTest(schema, modules);

    // Insert new state via server mutation
    await t.run(async (ctx) => {
        await ctx.runMutation(api.trainStates.upsertTrainState, {
            stationId: 'KH',
            trainId: '100',
            wasTalgo: false,
            wasCancelled: false,
            departureTime: 123456789,
        });
    });

    // Query DB directly to find inserted state
    const states = await t.run(async (ctx) => {
        return await ctx.db
            .query('trainStates')
            .withIndex('by_station_train', (q) => q.eq('stationId', 'KH'))
            .collect();
    });

    const s = states.find((x: any) => x.trainId === '100');
    expect(s).toBeTruthy();
    expect(s!.wasTalgo).toBe(false);
    expect(s!.wasCancelled).toBe(false);

    // Update existing state via upsert (existing branch should patch)
    await t.run(async (ctx) => {
        await ctx.runMutation(api.trainStates.upsertTrainState, {
            stationId: 'KH',
            trainId: '100',
            wasTalgo: true,
            wasCancelled: false,
            departureTime: 555555,
        });
    });

    const updated = await t.run(async (ctx) => {
        return await ctx.db
            .query('trainStates')
            .withIndex('by_station_train', (q) => q.eq('stationId', 'KH'))
            .collect();
    });

    const u = updated.find((x: any) => x.trainId === '100');
    expect(u).toBeTruthy();
    expect(u!.wasTalgo).toBe(true);
    expect(u!.departureTime).toBe(555555);

    // Test updateTrainState mutation (patch by id)
    await t.run(async (ctx) => {
        await ctx.runMutation(api.trainStates.updateTrainState, {
            id: u!._id,
            wasTalgo: false,
            wasCancelled: true,
            departureTime: 555555,
        });
    });

    const patched = await t.run(async (ctx) => {
        return await ctx.db
            .query('trainStates')
            .withIndex('by_station_train', (q) => q.eq('stationId', 'KH'))
            .collect();
    });

    const p = patched.find((x: any) => x.trainId === '100');
    expect(p).toBeTruthy();
    expect(p!.wasTalgo).toBe(false);
    expect(p!.wasCancelled).toBe(true);

    vi.useRealTimers();
});
