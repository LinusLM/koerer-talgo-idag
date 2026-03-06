import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  subscriptions: defineTable({
    userId: v.string(),
    subscription: v.any(),
    stations: v.array(v.string()), // multiple stations per user
  }).index("by_userId", ["userId"]), // keep userId index for quick lookups

  trainStates: defineTable({
    stationId: v.string(),
    trainId: v.string(),
    departureTime: v.optional(v.number()),
    wasTalgo: v.boolean(),
    wasCancelled: v.boolean(),

  }).index("by_station_train", ["stationId", "trainId"]),
});