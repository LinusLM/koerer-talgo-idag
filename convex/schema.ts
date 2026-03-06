import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  subscriptions: defineTable({
    userId: v.string(),
    subscription: v.object({
      endpoint: v.string(),
      expirationTime: v.optional(v.any()),
      keys: v.object({
        auth: v.string(),
        p256dh: v.string(),
      }),
    }),
    stations: v.array(v.string()),
  }).index("by_userId", ["userId"]),

  trainStates: defineTable({
    stationId: v.string(),
    trainId: v.string(),
    departureTime: v.optional(v.number()),
    wasTalgo: v.boolean(),
    wasCancelled: v.boolean(),
  }).index("by_station_train", ["stationId", "trainId"]),
});