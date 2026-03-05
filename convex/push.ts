"use node";

import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import webpush from "web-push";

// Configure VAPID from environment so web-push sends proper Authorization headers.
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  // Replace the mailto with an admin/contact address for your app.
  webpush.setVapidDetails("mailto:postmaster@example.com", VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn(
    "VAPID keys not set (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY). Push may fail for some endpoints."
  );
}

export const sendNotification = action({
  args: {
    title: v.string(),
    message: v.string(),
    stationId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.runQuery(api.subscriptions.getAll, {});

    const filtered = subscriptions.filter((s) =>
      s.stations?.includes(args.stationId)
    );

    for (const sub of filtered) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: args.title,
            body: args.message,
            icon: "/icon-192x192.png",
          })
        );
      } catch (err) {
        console.error("Push failed", err);
      }
    }

    return { success: true };
  },
});

