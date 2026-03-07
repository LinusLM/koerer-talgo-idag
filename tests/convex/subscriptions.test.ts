import { expect, test } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';
const modules = import.meta.glob('../../convex/**/*.ts') as Record<string, () => Promise<any>>;

test('subscribe, set targets, getByUserId and getStationsWithSubscriptions work', async () => {
    const t = convexTest(schema, modules);

    // Subscribe user
    await t.run(async (ctx) => {
        await ctx.runMutation(api.subscriptions.subscribeUser, { userId: 'u1', subscription: { endpoint: 'x', keys: { auth: 'a', p256dh: 'b' } } });
    });

    // Set targets (stations + trains)
    await t.run(async (ctx) => {
        await ctx.runMutation(api.subscriptions.setUserTargets, { userId: 'u1', stations: ['KH', 'OD'], trains: ['100'] });
    });

    // getByUserId should show stations
    const sub = await t.run(async (ctx) => {
        return await ctx.runQuery(api.subscriptions.getByUserId, { userId: 'u1' });
    });
    expect(sub).toBeTruthy();
    expect(sub!.stations).toEqual(['KH', 'OD']);

    // getStationsWithSubscriptions should include KH and OD
    const stations = await t.run(async (ctx) => {
        return await ctx.runQuery(api.subscriptions.getStationsWithSubscriptions, {} as any);
    });
    expect(stations.sort()).toEqual(['KH', 'OD'].sort());

    // Unsubscribe user
    await t.run(async (ctx) => {
        await ctx.runMutation(api.subscriptions.unsubscribeUser, { userId: 'u1' });
    });

    const after = await t.run(async (ctx) => {
        return await ctx.runQuery(api.subscriptions.getByUserId, { userId: 'u1' });
    });
    // Convex may return `null` for missing rows; assert null/undefined
    expect(after == null).toBe(true);
});
