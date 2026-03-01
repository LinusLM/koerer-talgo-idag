import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  subscriptions: defineTable({
    userId: v.string(),
    subscription: v.any(),
    stations: v.array(v.string()),
    trains: v.array(v.string()),
  }).index("by_userId", ["userId"]),
});
