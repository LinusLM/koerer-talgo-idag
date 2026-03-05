"use node";

import { internalAction } from "./_generated/server";
import WebSocket from "ws";
import { internal } from "./_generated/api";

const DEBUG = process.env.DEBUG_MITTOG === "true";
const log = (...args: any[]) => {
  if (DEBUG) console.log("[snapshot]", ...args);
};

export const fetchAndProcessSnapshot = internalAction({
  handler: async (ctx) => {
    log("Starting websocket connection");

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(
        "wss://api.mittog.dk/api/ws/departure/KH/"
      );

      let handled = false;

      ws.on("open", () => {
        log("Websocket connected");
      });

      ws.on("message", async (data) => {
        if (handled) {
          log("Ignoring extra snapshot");
          return;
        }

        handled = true;
        log("Received snapshot");

        try {
          const snapshot = JSON.parse(data.toString());

          log(
            "Snapshot trains:",
            snapshot?.Trains?.length ?? 0
          );

          await ctx.runMutation(
            internal.processSnapshot.processSnapshot,
            {
              stationId: "KH",
              snapshot,
            }
          );

          log("Snapshot processed successfully");

          ws.close();
          resolve();
        } catch (err) {
          console.error("[snapshot] Failed to process snapshot", err);
          reject(err);
        }
      });

      ws.on("error", (err) => {
        console.error("[snapshot] Websocket error", err);
        reject(err);
      });

      ws.on("close", () => {
        log("Websocket closed");
      });

      setTimeout(() => {
        if (!handled) {
          log("Timeout reached, closing websocket");
          ws.close();
          resolve();
        }
      }, 8000);
    });
  },
});