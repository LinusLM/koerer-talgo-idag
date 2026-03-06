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

// Get all train states for a station (for optimized bulk processing)
export const getAllTrainStatesForStation = query({
  args: {
    stationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainStates")
      .withIndex("by_station_train", (q) =>
        q.eq("stationId", args.stationId)
      )
      .collect();
  },
});

// Get train state by station and train ID
export const getTrainState = query({
  args: {
    stationId: v.string(),
    trainId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainStates")
      .withIndex("by_station_train", (q) =>
        q.eq("stationId", args.stationId).eq("trainId", args.trainId)
      )
      .unique();
  },
});

// Update existing train state
export const updateTrainState = mutation({
  args: {
    id: v.id("trainStates"),
    wasTalgo: v.boolean(),
    wasCancelled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      wasTalgo: args.wasTalgo,
      wasCancelled: args.wasCancelled,
    });
    return { success: true };
  },
});

// Upsert train state (insert or update if exists)
export const upsertTrainState = mutation({
  args: {
    stationId: v.string(),
    trainId: v.string(),
    wasTalgo: v.boolean(),
    wasCancelled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trainStates")
      .withIndex("by_station_train", (q) =>
        q.eq("stationId", args.stationId).eq("trainId", args.trainId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        wasTalgo: args.wasTalgo,
        wasCancelled: args.wasCancelled,
      });
    } else {
      try {
        await ctx.db.insert("trainStates", {
          stationId: args.stationId,
          trainId: args.trainId,
          wasTalgo: args.wasTalgo,
          wasCancelled: args.wasCancelled,
        });
      } catch (error) {
        // Handle race condition - another thread may have inserted the same record
        // Re-query and update the existing record
        const retryExisting = await ctx.db
          .query("trainStates")
          .withIndex("by_station_train", (q) =>
            q.eq("stationId", args.stationId).eq("trainId", args.trainId)
          )
          .first();

        if (retryExisting) {
          await ctx.db.patch(retryExisting._id, {
            wasTalgo: args.wasTalgo,
            wasCancelled: args.wasCancelled,
          });
        } else {
          // If still no record found, re-throw the original error
          throw error;
        }
      }
    }

    return { success: true };
  },
});

// Batch update train states for better performance
export const batchUpdateTrainStates = mutation({
  args: {
    updates: v.array(v.object({
      stationId: v.string(),
      trainId: v.string(),
      wasTalgo: v.boolean(),
      wasCancelled: v.boolean(),
    }))
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const existing = await ctx.db
        .query("trainStates")
        .withIndex("by_station_train", (q) =>
          q.eq("stationId", update.stationId).eq("trainId", update.trainId)
        )
        .first();

      if (existing) {
        // Only update if state actually changed
        if (existing.wasTalgo !== update.wasTalgo || existing.wasCancelled !== update.wasCancelled) {
          await ctx.db.patch(existing._id, {
            wasTalgo: update.wasTalgo,
            wasCancelled: update.wasCancelled,
          });
        }
      } else {
        await ctx.db.insert("trainStates", {
          stationId: update.stationId,
          trainId: update.trainId,
          wasTalgo: update.wasTalgo,
          wasCancelled: update.wasCancelled,
        });
      }
    }

    return { success: true };
  },
});

// Cleanup old train states (older than 5 hours) - Internal Action for cron job
export const cleanupOldTrainStates = internalAction({
  handler: async (ctx) => {
    const fiveHoursAgo = Date.now() - (5 * 60 * 60 * 1000); // 5 hours in milliseconds

    const oldStates = await ctx.runQuery(internal.subscriptions.getOldTrainStates, {
      cutoffTime: fiveHoursAgo
    });

    let deletedCount = 0;
    for (const state of oldStates) {
      await ctx.runMutation(internal.subscriptions.deleteTrainState, {
        id: state._id
      });
      deletedCount++;
    }

    console.log(`Cleaned up ${deletedCount} old train states`);
    return { deletedCount };
  },
});

// Helper query to get old train states
export const getOldTrainStates = internalQuery({
  args: {
    cutoffTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainStates")
      .filter((q) => q.lt(q.field("_creationTime"), args.cutoffTime))
      .collect();
  },
});

// Helper mutation to delete a train state
export const deleteTrainState = internalMutation({
  args: {
    id: v.id("trainStates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});