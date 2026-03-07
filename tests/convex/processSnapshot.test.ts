/// <reference types="vitest" />
/// <reference types="vite/client" />
import { expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
const modules = import.meta.glob('../../convex/**/*.ts') as Record<string, () => Promise<any>>;

test('processSnapshot inserts train state for provided train', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T13:17:00+01:00'));

    const t = convexTest(schema, modules);

    const train = {
        TrainId: '397',
        PublicTrainId: '397',
        Product: 'EX',
        ScheduleTimeDeparture: '07-03-2026 14:22:00',
        ScheduleTime: '07-03-2026 14:22:00',
        IsCancelledDeparture: false,
        Routes: [
            {
                DestinationStationId: '&AP',
                OriginStationId: 'KH',
            },
        ],
    } as any;

    await t.action(internal.processSnapshot.processSnapshot, { stationId: 'KH', snapshot: { Trains: [train] } });

    const states = await t.run(async (ctx) => {
        return await ctx.db
            .query('trainStates')
            .withIndex('by_station_train', (q) => q.eq('stationId', 'KH'))
            .collect();
    });

    expect(states.length).toBeGreaterThanOrEqual(1);
    const s = states.find((x: any) => x.trainId === '397');
    expect(s).toBeTruthy();
    expect(s!.wasCancelled).toBe(false);

    vi.useRealTimers();
});

test('processSnapshot skips trains with invalid/missing departure time', async () => {
    const t = convexTest(schema, modules);

    const train = {
        PublicTrainId: '900',
        Product: 'EX',
        ScheduleTimeDeparture: 'not a date',
        Routes: [{ DestinationStationId: 'KH' }],
    } as any;

    await t.action(internal.processSnapshot.processSnapshot, { stationId: 'KH', snapshot: { Trains: [train] } });

    const states = await t.run(async (ctx) => {
        return await ctx.db.query('trainStates').collect();
    });

    expect(states.find((s: any) => s.trainId === '900')).toBeUndefined();
});

test('processSnapshot skips trains with far future departure times', async () => {
    vi.useFakeTimers();
    // freeze time
    vi.setSystemTime(new Date('2026-03-07T10:00:00+01:00'));

    const t = convexTest(schema, modules);

    // 3 hours ahead -> beyond 2 hour maxFutureTime
    const train = {
        PublicTrainId: '901',
        Product: 'EX',
        ScheduleTimeDeparture: '07-03-2026 13:30:00',
        Routes: [{ DestinationStationId: 'KH' }],
    } as any;

    await t.action(internal.processSnapshot.processSnapshot, { stationId: 'KH', snapshot: { Trains: [train] } });

    const states = await t.run(async (ctx) => {
        return await ctx.db.query('trainStates').collect();
    });

    expect(states.find((s: any) => s.trainId === '901')).toBeUndefined();

    vi.useRealTimers();
});

test('processSnapshot skips untracked products', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T10:00:00+01:00'));

    const t = convexTest(schema, modules);

    const train = {
        PublicTrainId: '902',
        Product: 'IC', // not in trackedTrainTypes
        ScheduleTimeDeparture: '07-03-2026 10:30:00',
        Routes: [{ DestinationStationId: 'KH' }],
    } as any;

    await t.action(internal.processSnapshot.processSnapshot, { stationId: 'KH', snapshot: { Trains: [train] } });

    const states = await t.run(async (ctx) => {
        return await ctx.db.query('trainStates').collect();
    });

    expect(states.find((s: any) => s.trainId === '902')).toBeUndefined();

    vi.useRealTimers();
});
