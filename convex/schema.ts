import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  subscriptions: defineTable({
    userId: v.string(),
    subscription: v.any(),
    stations: v.array(v.string()), // multiple stations per user
    trains: v.optional(v.array(v.string())),   // optional, if you want train-specific subscriptions
  }).index("by_userId", ["userId"]), // keep userId index for quick lookups

  trainStates: defineTable({
    stationId: v.string(),
    trainId: v.string(),
    wasTalgo: v.boolean(),
    wasCancelled: v.boolean(),
  }).index("by_station_train", ["stationId", "trainId"]),
});