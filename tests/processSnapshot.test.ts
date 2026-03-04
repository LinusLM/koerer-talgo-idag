// tests/sendNotification.test.ts
import { describe, it } from "vitest";
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { sendNotification } from "../convex/push";
import { config } from "dotenv";

config({ path: ".env.local" }); // explicitly load .env.local
const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

describe("Send test notifications to OD subscribers", () => {
    it("should notify all OD subscribers", async () => {
        // Fetch all subscriptions from the dev Convex instance
        const allSubs = await client.query(api.subscriptions.getAll, {});

        // Filter to OD station
        const odSubs = allSubs.filter((sub: any) => sub.stationId === "OD");

        console.log(`Found ${odSubs.length} OD subscribers`);

        // Fake context for calling sendNotification
        const fakeCtx = {
            runQuery: async () => odSubs,
        };

        // Helper to call the action
        async function callSendNotification(args: {
            title: string;
            message: string;
            stationId: string;
        }) {
            // @ts-ignore: bypass TS because sendNotification expects internal context
            return sendNotification(args, fakeCtx);
        }

        // Actually call it
        await callSendNotification({
            title: "🚄 Test Talgo Notification",
            message: "This is a test notification for all OD subscribers!",
            stationId: "OD",
        });

        console.log("Notifications sent! Check your devices.");
    });
});