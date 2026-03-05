"use node";

import { internalAction } from "./_generated/server";
import WebSocket from "ws";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";

export const fetchAndProcessSnapshot = internalAction({
  handler: async (ctx) => {
    console.log("Starting multi-station snapshot fetch");

    // Get stations that have active subscriptions
    const activeStations = await ctx.runQuery(api.subscriptions.getStationsWithSubscriptions);

    if (activeStations.length === 0) {
      console.log("No stations have active subscriptions, skipping snapshot fetch");
      return;
    }

    console.log("Processing stations:", activeStations);

    // Process each station with subscriptions
    const promises = activeStations.map(stationId =>
      fetchStationSnapshot(ctx, stationId)
    );

    await Promise.all(promises);
    console.log("All station snapshots processed");
  },
});

async function fetchStationSnapshot(ctx: any, stationId: string) {
  console.log(`Starting websocket connection for station ${stationId}`);

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(
      `wss://api.mittog.dk/api/ws/departure/${stationId}/`
    );

    let handled = false;

    ws.on("open", () => {
      console.log(`Websocket connected for ${stationId}`);
    });

    ws.on("message", async (data) => {
      if (handled) {
        console.log(`Ignoring extra snapshot for ${stationId}`);
        return;
      }

      handled = true;
      console.log(`Received snapshot for ${stationId}`);

      try {
        const snapshot = JSON.parse(data.toString());

        // If the feed wraps the payload in `data`, pass the inner object to the processor.
        const payloadToProcess = snapshot?.data ?? snapshot;

        await ctx.runAction(
          internal.processSnapshot.processSnapshot,
          {
            stationId: stationId,
            snapshot: payloadToProcess,
          }
        );

        console.log(`Snapshot processed successfully for ${stationId}`);

        ws.close();
        resolve();
      } catch (err) {
        console.error(`[snapshot] Failed to process snapshot for ${stationId}`, err);
        ws.close();
        reject(err);
      }
    });

    ws.on("error", (err) => {
      console.error(`[snapshot] Websocket error for ${stationId}`, err);
      reject(err);
    });

    ws.on("close", () => {
      console.log(`Websocket closed for ${stationId}`);
    });

    setTimeout(() => {
      if (!handled) {
        console.log(`Timeout reached for ${stationId}, closing websocket`);
        ws.close();
        resolve();
      }
    }, 8000);
  });
}