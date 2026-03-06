/// <reference types="vite/client" />

import { test, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

// Mock web-push before loading functions so the mocked module is used.
vi.mock("web-push", () => {
    const fn = vi.fn(async () => { });
    return {
        default: { sendNotification: fn, setVapidDetails: vi.fn() },
        sendNotification: fn,
        setVapidDetails: vi.fn(),
    };
});

// Import all Convex function modules (exclude any `*.test.ts` files)
const modules = import.meta.glob("../convex/**/!(*.test).ts");

test("sendNotification action sends notifications to station subscribers", async () => {
    const t = convexTest(schema, modules);

    // Seed a subscription that listens to station 'OD'
    await t.run(async (ctx) => {
        await ctx.db.insert("subscriptions", {
            userId: "user1",
            subscription: {
                endpoint: "https://example.com/push",
                keys: { auth: "auth", p256dh: "p256dh" },
            },
            stations: ["OD"],
        });
    });

    // Call the action
    await t.action(api.push.sendNotification, {
        title: "🚄 Test Talgo Notification",
        message: "This is a test notification for all OD subscribers!",
        stationId: "OD",
    });

    // Assert web-push sendNotification was called
    const webpush = await import("web-push");
    const sendFn = (webpush as any).sendNotification ?? (webpush as any).default?.sendNotification;
    expect(sendFn).toHaveBeenCalled();
});