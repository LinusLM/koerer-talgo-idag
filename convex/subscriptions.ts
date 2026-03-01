import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Subscribe user
export const subscribeUser = mutation({
  args: {
    userId: v.string(),
    subscription: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        subscription: args.subscription,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        subscription: args.subscription,
        stations: [],
        trains: [],
      });
    }

    return { success: true };
  },
});
// Unsubscribe user
export const unsubscribeUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

// Get all subscriptions
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("subscriptions").collect();
  },
});

// Get subscription by userId
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
  },
});

// Set stations and trains for a user
export const setUserTargets = mutation({
  args: {
    userId: v.string(),
    stations: v.array(v.string()),
    trains: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stations: args.stations,
        trains: args.trains,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        subscription: null,
        stations: args.stations,
        trains: args.trains,
      });
    }

    return { success: true };
  },
});
