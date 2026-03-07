import { expect, test, vi } from 'vitest';
// Mock web-push before modules are loaded
vi.mock('web-push', () => ({
    default: {
        setVapidDetails: vi.fn(),
        sendNotification: vi.fn(),
    }
}));

import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import webpush from 'web-push';
const modules = import.meta.glob('../../convex/**/*.ts') as Record<string, () => Promise<any>>;

test('processSnapshot triggers push.sendNotification for subscribed stations', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T13:00:00+01:00'));

    const t = convexTest(schema, modules);

    // Insert a subscription that listens to station 'KH'
    await t.run(async (ctx) => {
        await ctx.db.insert('subscriptions', {
            userId: 'u1',
            subscription: { endpoint: 'https://example', keys: { auth: 'a', p256dh: 'b' } },
            stations: ['KH'],
        });

        // Insert existing train state with wasTalgo = false
        await ctx.db.insert('trainStates', {
            stationId: 'KH',
            trainId: '200',
            wasTalgo: false,
            wasCancelled: false,
            departureTime: Date.now(),
        });
    });

    // Build a Talgo-like train that will switch IN
    const routes: any[] = [];
    routes.push(...Array(2).fill({ UnitType: 'BPD' }));
    routes.push({ UnitType: 'APT' });
    routes.push({ UnitType: 'AP' });
    routes.push({ UnitType: 'BPH' });
    routes.push(...Array(4).fill({ UnitType: 'BP' }));
    routes.push(...Array(3).fill({ UnitType: 'BPT' }));

    const train: any = {
        PublicTrainId: '200',
        Product: 'EX',
        ScheduleTimeDeparture: '07-03-2026 14:22:00',
        Routes: routes,
        IsCancelledDeparture: false,
    };

    // Run the processSnapshot internal action which should call push.sendNotification
    await t.action(internal.processSnapshot.processSnapshot, { stationId: 'KH', snapshot: { Trains: [train] } });

    // web-push sendNotification should have been called at least once
    const mockWebpush = (webpush as any).sendNotification
    expect((webpush as any).sendNotification).toHaveBeenCalled();

    vi.useRealTimers();
});
