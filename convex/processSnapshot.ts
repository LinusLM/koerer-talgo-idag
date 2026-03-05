import { internalAction } from "./_generated/server";
import { isTalgo } from "../lib/talgo";
import { v } from "convex/values";
import { api } from "./_generated/api";

const DEBUG = process.env.DEBUG_MITTOG === "true";

export const processSnapshot = internalAction({
  args: {
    stationId: v.string(),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    const { stationId, snapshot } = args;

    if (DEBUG) console.log("Processing snapshot for", stationId);

    // 🚀 ONE QUERY - load all existing train states for this station
    const existingStates = await ctx.runQuery(api.subscriptions.getAllTrainStatesForStation, {
      stationId: stationId
    });

    // convert to map for fast lookup
    const stateMap = new Map(
      existingStates.map((s) => [s.trainId, s])
    );

    for (const train of snapshot.Trains ?? []) {
      // Normalize common id/cancellation fields across different snapshot shapes
      const trainId = train.PublicTrainId;
      const product = train.Product ?? "";

      // Validate trainId is present before processing
      if (!trainId || typeof trainId !== 'string' || trainId.trim() === '') {
        if (DEBUG) console.log("Skipping train with missing/invalid PublicTrainId:", train);
        continue;
      }

      const talgoNow = isTalgo(train);
      const cancelledNow =
        train.IsCancelledDeparture === true ||
        train.isCancelled === true ||
        train.cancelled === true ||
        train.IsCancelled === true;

      const existing = stateMap.get(trainId);

      if (DEBUG)
        console.log(
          "Train",
          trainId,
          "Talgo:",
          talgoNow,
          "Cancelled:",
          cancelledNow
        );

      // 🚄 TALGO SWITCHED IN
      if (!existing?.wasTalgo && talgoNow) {
        if (DEBUG) console.log("Talgo switched IN:", trainId);

        await notifyStationSubscribers(ctx, stationId, {
          title: "Talgo train detected",
          message: `Train ${product}${trainId} is now a Talgo`,
        });
      }

      // 🚄 TALGO SWITCHED OUT
      if (existing?.wasTalgo && !talgoNow) {
        if (DEBUG) console.log("Talgo switched OUT:", trainId);

        await notifyStationSubscribers(ctx, stationId, {
          title: "Talgo removed",
          message: `Train ${product}${trainId} is no longer Talgo`,
        });
      }

      // 🚫 CANCELLATION (only for TALGO trains)
      if (!existing?.wasCancelled && cancelledNow && (existing?.wasTalgo || talgoNow)) {
        if (DEBUG) console.log("Talgo train cancelled:", trainId);

        await notifyStationSubscribers(ctx, stationId, {
          title: "Talgo train cancelled",
          message: `Talgo train ${product}${trainId} was cancelled`,
        });
      }

      // DB updates - use mutations
      if (existing) {
        await ctx.runMutation(api.subscriptions.updateTrainState, {
          id: existing._id,
          wasTalgo: talgoNow,
          wasCancelled: cancelledNow,
        });
      } else {
        await ctx.runMutation(api.subscriptions.upsertTrainState, {
          stationId,
          trainId,
          wasTalgo: talgoNow,
          wasCancelled: cancelledNow,
        });
      }
    }

    if (DEBUG) console.log("Snapshot processing finished");
  },
});

async function notifyStationSubscribers(
  ctx: any,
  stationId: string,
  payload: any
) {
  if (DEBUG)
    console.log("Sending notification for station", stationId);

  await ctx.runAction(api.push.sendNotification, {
    stationId,
    title: payload.title,
    message: payload.message,
  });
}

