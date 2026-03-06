import { internalAction } from "./_generated/server";
import { isTalgo } from "../lib/talgo";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { removeAmpersandFromCode } from "../lib/stations";

const DEBUG = process.env.DEBUG_MITTOG === "true";

const trackedTrainTypes = new Set([
  "EC",
  "ECE",
  "EX"
])



export const processSnapshot = internalAction({
  args: {
    stationId: v.string(),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    const { stationId, snapshot } = args;

    if (DEBUG) console.log("Processing snapshot for", stationId);

    // 🚀 ONE QUERY - load all existing train states for this station
    const existingStates = await ctx.runQuery(api.trainStates.getAllTrainStatesForStation, {
      stationId: stationId
    });

    // Convert to map for fast lookup
    const stateMap = new Map(
      existingStates.map((s) => [s.trainId, s])
    );

    const notifications: Array<{ title: string; message: string }> = [];
    const stateUpdates: Array<{ stationId: string; trainId: string; wasTalgo: boolean; wasCancelled: boolean; departureTime?: number }> = [];

    for (const train of snapshot.Trains ?? []) {
      const rawTime = train.ScheduleTimeDeparture ?? train.ScheduleTime ?? "";
      let departureTimeInMs = NaN;
      if (typeof rawTime === "string" && rawTime.trim() !== "") {
        try {
          departureTimeInMs = parseMittogTime(rawTime);
        } catch (err) {
          if (DEBUG) console.log("Failed to parse departure time:", rawTime, err);
          departureTimeInMs = NaN;
        }
      }

      const currentTime = Date.now();
      const maxFutureTime = 8 * 60 * 60 * 1000; // 8 hours

      // If we couldn't parse a valid departure time, skip this train.
      if (!Number.isFinite(departureTimeInMs)) {
        if (DEBUG) console.log("Skipping train due to invalid/missing departure time:", train.PublicTrainId);
        continue;
      }

      // Normalize common id/cancellation fields across different snapshot shapes
      const trainId = train.PublicTrainId;
      const product = (train.Product ?? "").toString().trim().toUpperCase();

      if (departureTimeInMs - currentTime > maxFutureTime) {
        if (DEBUG) console.log("Skipping train: ", trainId, ". with future departure time:");
        continue;
      }

      if (!trackedTrainTypes.has(product)) {
        if (DEBUG) console.log("Skipping untracked train type:", product, trainId);
        continue;
      }

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

      // Use canonical parsed departure time from above
      const departureTimestamp = departureTimeInMs;

      const existing = stateMap.get(trainId);

      if (DEBUG) {
        console.log("Train", trainId, "Talgo:", talgoNow, "Cancelled:", cancelledNow);
      }

      // Check for state changes that require notifications
      let stateChanged = false;

      // 🚄 TALGO SWITCHED IN
      if (!existing?.wasTalgo && talgoNow) {
        if (DEBUG) console.log("Talgo switched IN:", trainId);
        notifications.push({
          title: "Talgo fundet ved " + removeAmpersandFromCode(stationId),
          message: formatNotification(train)
        });
        stateChanged = true;
      }

      // 🚄 TALGO SWITCHED OUT  
      if (existing?.wasTalgo && !talgoNow) {
        if (DEBUG) console.log("Talgo switched OUT:", trainId);
        notifications.push({
          title: `Talgo fjernet ved ${removeAmpersandFromCode(stationId)}`,
          message: formatNotification(train)
        });
        stateChanged = true;
      }

      // 🚫 CANCELLATION (only for TALGO trains)
      if (!existing?.wasCancelled && cancelledNow && (existing?.wasTalgo || talgoNow)) {
        if (DEBUG) console.log("Talgo train cancelled:", trainId);
        notifications.push({
          title: `Talgo aflyst ved ${removeAmpersandFromCode(stationId)}`,
          message: formatNotification(train)
        });
        stateChanged = true;
      }

      // Always track the current state for batch update (only if state changed or new train)
      if (!existing || existing.wasTalgo !== talgoNow || existing.wasCancelled !== cancelledNow || (Number.isFinite(departureTimestamp) && existing?.departureTime !== departureTimestamp)) {
        stateUpdates.push({
          stationId,
          trainId,
          wasTalgo: talgoNow,
          wasCancelled: cancelledNow,
          departureTime: Number.isFinite(departureTimestamp) ? departureTimestamp : undefined,
        });
      }
    }

    // 🚀 BATCH DB UPDATE - One call instead of many
    if (stateUpdates.length > 0) {
      await ctx.runMutation(api.trainStates.batchUpdateTrainStates, {
        updates: stateUpdates
      });
    }

    // 🔔 BATCH NOTIFICATIONS - Send all at once
    for (const notification of notifications) {
      await notifyStationSubscribers(ctx, stationId, notification);
    }

    if (DEBUG) console.log(`Snapshot processing finished - ${stateUpdates.length} state updates, ${notifications.length} notifications`);
  },
});

function parseMittogTime(time: string) {
  if (typeof time !== "string" || time.trim() === "") {
    return NaN;
  }

  // Expected format: DD-MM-YYYY HH:mm (allow 1-2 digit day/month/hour)
  const re = /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})$/;
  const m = re.exec(time.trim());
  if (!m) {
    return NaN;
  }

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);

  // Validate ranges
  if (!(month >= 1 && month <= 12)) return NaN;
  if (!(day >= 1 && day <= 31)) return NaN;
  if (!(hour >= 0 && hour <= 23)) return NaN;
  if (!(minute >= 0 && minute <= 59)) return NaN;

  const date = new Date(year, month - 1, day, hour, minute);
  const t = date.getTime();
  if (isNaN(t)) return NaN;
  return t;
}

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

function formatNotification(train: Train): string {
  const product = train.Product ?? "";
  const trainId = train.PublicTrainId ?? "";

  const departureTime = train.ScheduleTimeDeparture ?? train.ScheduleTime ?? "";

  const destination = removeAmpersandFromCode(train.Routes?.[0]?.DestinationStationId ?? "");
  let time = "unknown time";
  if (departureTime) {
    const date = new Date(departureTime);
    if (!isNaN(date.getTime())) {
      time = date.toLocaleTimeString("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
      }).replace(".", ":");
    }
  }
  const trainNumber = `${product}${trainId}`;

  return `${trainNumber} til ${destination} kl. ${time}`;
}

interface Route {
  DestinationStationId: string;
  OriginStationId: string;
}

interface Train {
  Product: string;
  PublicTrainId: string;
  Routes?: Route[];
  ScheduleTimeDeparture?: string;
  ScheduleTime?: string;
}
