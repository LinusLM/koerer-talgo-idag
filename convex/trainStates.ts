import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function isUniqueConstraintError(err: any) {
    if (!err) return false;
    const msg = (err.message || "").toString().toLowerCase();
    const name = (err.name || "").toString().toLowerCase();
    return msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists") || name.includes("unique");
}

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
        departureTime: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const patch: any = { wasTalgo: args.wasTalgo, wasCancelled: args.wasCancelled };
        if (args.departureTime !== undefined) patch.departureTime = args.departureTime;
        await ctx.db.patch(args.id, patch);
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
        departureTime: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("trainStates")
            .withIndex("by_station_train", (q) =>
                q.eq("stationId", args.stationId).eq("trainId", args.trainId)
            )
            .first();

        if (existing) {
            const patch: any = { wasTalgo: args.wasTalgo, wasCancelled: args.wasCancelled };
            if (args.departureTime !== undefined) patch.departureTime = args.departureTime;
            await ctx.db.patch(existing._id, patch);
        } else {
            try {
                const insertObj: any = {
                    stationId: args.stationId,
                    trainId: args.trainId,
                    wasTalgo: args.wasTalgo,
                    wasCancelled: args.wasCancelled,
                };
                if (args.departureTime !== undefined) insertObj.departureTime = args.departureTime;
                await ctx.db.insert("trainStates", insertObj);
            } catch (error) {
                if (isUniqueConstraintError(error)) {
                    const retryExisting = await ctx.db
                        .query("trainStates")
                        .withIndex("by_station_train", (q) =>
                            q.eq("stationId", args.stationId).eq("trainId", args.trainId)
                        )
                        .first();

                    if (retryExisting) {
                        const patch: any = { wasTalgo: args.wasTalgo, wasCancelled: args.wasCancelled };
                        if (args.departureTime !== undefined) patch.departureTime = args.departureTime;
                        await ctx.db.patch(retryExisting._id, patch);
                    } else {
                        throw error;
                    }
                } else {
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
            departureTime: v.optional(v.number()),
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
                const departureChanged = update.departureTime !== undefined && existing.departureTime !== update.departureTime;
                const stateChanged = existing.wasTalgo !== update.wasTalgo || existing.wasCancelled !== update.wasCancelled || departureChanged;
                if (stateChanged) {
                    const patch: any = { wasTalgo: update.wasTalgo, wasCancelled: update.wasCancelled };
                    if (update.departureTime !== undefined) patch.departureTime = update.departureTime;
                    await ctx.db.patch(existing._id, patch);
                }
            } else {
                const insertObj: any = {
                    stationId: update.stationId,
                    trainId: update.trainId,
                    wasTalgo: update.wasTalgo,
                    wasCancelled: update.wasCancelled,
                };
                if (update.departureTime !== undefined) insertObj.departureTime = update.departureTime;
                try {
                    await ctx.db.insert("trainStates", insertObj);
                } catch (error) {
                    if (isUniqueConstraintError(error)) {
                        const retryExisting = await ctx.db
                            .query("trainStates")
                            .withIndex("by_station_train", (q) =>
                                q.eq("stationId", update.stationId).eq("trainId", update.trainId)
                            )
                            .first();

                        if (retryExisting) {
                            const patch: any = { wasTalgo: update.wasTalgo, wasCancelled: update.wasCancelled };
                            if (update.departureTime !== undefined) patch.departureTime = update.departureTime;
                            await ctx.db.patch(retryExisting._id, patch);
                        } else {
                            throw error;
                        }
                    } else {
                        throw error;
                    }
                }
            }
        }

        return { success: true };
    },
});
