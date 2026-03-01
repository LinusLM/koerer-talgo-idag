// push.ts
"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import webpush from "web-push";
import { v } from "convex/values";

webpush.setVapidDetails(
  "mailto:your@email.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export const sendNotification = action({
  args: {
    title: v.string(),
    message: v.string(),
    stationId: v.optional(v.string()),
    trainId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.runQuery(api.subscriptions.getAll, {});

    const filtered = subscriptions.filter(
      (s) =>
        (args.stationId && s.stations.includes(args.stationId)) ||
        (args.trainId && s.trains.includes(args.trainId))
    );
    for (const sub of filtered) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: args.title || "Test Notification",
            body: args.message,
            icon: "/icon-192x192.png",
          }),
        );
      } catch (err) {
        console.error("Push failed", err);
      }
    }
    return { success: true };
  },
});
