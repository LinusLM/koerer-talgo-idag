import { mutation, query, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

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
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
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
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stations: args.stations,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        subscription: null,
        stations: args.stations,
      });
    }

    return { success: true };
  },
});

// Get stations that have active subscriptions
export const getStationsWithSubscriptions = query({
  handler: async (ctx) => {
    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    // Extract unique station IDs that have active subscriptions
    const stationsSet = new Set<string>();

    for (const sub of allSubscriptions) {
      if (sub.stations && sub.stations.length > 0) {
        sub.stations.forEach(stationId => stationsSet.add(stationId));
      }
    }

    return Array.from(stationsSet);
  },
});

// Train state helpers were moved to `convex/trainStates.ts` to keep concerns separated.

