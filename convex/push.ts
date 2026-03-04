"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import webpush from "web-push";

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