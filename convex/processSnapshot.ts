import { internalMutation } from "./_generated/server";
import { isTalgo } from "../lib/talgo";
import { v } from "convex/values";
import { api } from "./_generated/api";

const DEBUG = process.env.DEBUG_MITTOG === "true";
const log = (...args: any[]) => {
  if (DEBUG) console.log("[processSnapshot]", ...args);
};

export const processSnapshot = internalMutation({
  args: {
    stationId: v.string(),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    const { stationId, snapshot } = args;

    log("Processing snapshot for station:", stationId);

    for (const train of snapshot.Trains ?? []) {
      const talgoNow = isTalgo(train);
      const cancelledNow = train.IsCancelledDeparture === true;

      log(
        "Train",
        train.TrainId,
        "| talgo:",
        talgoNow,
        "| cancelled:",
        cancelledNow
      );

      const existing = await ctx.db
        .query("trainStates")
        .withIndex("by_station_train", (q) =>
          q.eq("stationId", stationId).eq("trainId", train.TrainId)
        )
        .unique();

      if (existing) {
        log("Existing state:", existing);
      }

      // 🚄 TALGO SWITCHED IN
      if (!existing?.wasTalgo && talgoNow) {
        log("Talgo switched IN for train", train.TrainId);

        await notifyStationSubscribers(ctx, stationId, {
          title: "Talgo train detected",
          message: `Train ${train.TrainId} is now a Talgo`,
        });
      }

      // 🚄 TALGO SWITCHED OUT
      if (existing?.wasTalgo && !talgoNow) {
        log("Talgo switched OUT for train", train.TrainId);

        await notifyStationSubscribers(ctx, stationId, {
          title: "Talgo removed",
          message: `Train ${train.TrainId} is no longer Talgo`,
        });
      }

      // 🚫 CANCELLATION
      if (!existing?.wasCancelled && cancelledNow) {
        log("Train cancelled", train.TrainId);

        await notifyStationSubscribers(ctx, stationId, {
          title: "Train cancelled",
          message: `Train ${train.TrainId} was cancelled`,
        });
      }

      if (existing) {
        log("Updating train state");

        await ctx.db.patch(existing._id, {
          wasTalgo: talgoNow,
          wasCancelled: cancelledNow,
        });
      } else {
        log("Creating train state");

        await ctx.db.insert("trainStates", {
          stationId,
          trainId: train.TrainId,
          wasTalgo: talgoNow,
          wasCancelled: cancelledNow,
        });
      }
    }

    log("Finished processing snapshot");
  },
});

async function notifyStationSubscribers(
  ctx: any,
  stationId: string,
  payload: any
) {
  log("Sending notification to station subscribers", stationId);

  await ctx.runAction(api.push.sendNotification, {
    ...payload,
    stationId,
  });
}