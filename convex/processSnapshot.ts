
import { internalMutation } from "./_generated/server";
import { isTalgo } from "../lib/talgo";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const processSnapshot = internalMutation({
    args: {
        stationId: v.string(),
        snapshot: v.any(),
    },
    handler: async (ctx, args) => {
        const { stationId, snapshot } = args;

        for (const train of snapshot.Trains ?? []) {
            const talgoNow = isTalgo(train);
            const cancelledNow =
                train.IsCancelledDeparture === true;

            const existing = await ctx.db
                .query("trainStates")
                .withIndex("by_station_train", (q) =>
                    q.eq("stationId", stationId)
                        .eq("trainId", train.TrainId)
                )
                .unique();

            // 🚄 TALGO SWITCHED IN
            if (!existing?.wasTalgo && talgoNow) {
                await notifyStationSubscribers(ctx, stationId, {
                    type: "TALGO_IN",
                    train,
                });
            }

            // 🚄 TALGO SWITCHED OUT
            if (existing?.wasTalgo && !talgoNow) {
                await notifyStationSubscribers(ctx, stationId, {
                    type: "TALGO_OUT",
                    train,
                });
            }

            // 🚫 CANCELLATION
            if (!existing?.wasCancelled && cancelledNow) {
                await notifyStationSubscribers(ctx, stationId, {
                    type: "CANCELLED",
                    train,
                });
            }

            // Upsert state
            if (existing) {
                await ctx.db.patch(existing._id, {
                    wasTalgo: talgoNow,
                    wasCancelled: cancelledNow,
                });
            } else {
                await ctx.db.insert("trainStates", {
                    stationId,
                    trainId: train.TrainId,
                    wasTalgo: talgoNow,
                    wasCancelled: cancelledNow,
                });
            }
        }
    },
});

async function notifyStationSubscribers(
    ctx: any,
    stationId: string,
    payload: any
) {
    await ctx.runAction(api.push.sendNotification, {
        ...payload,
        stationId,
    });
}