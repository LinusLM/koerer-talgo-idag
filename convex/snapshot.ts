import { internalAction } from "./_generated/server";
import WebSocket from "ws";
import { internal } from "./_generated/api";

export const fetchAndProcessSnapshot = internalAction({
    handler: async (ctx) => {
        return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket(
                "wss://api.mittog.dk/api/ws/departure/KH/"
            );

            let handled = false;

            ws.on("message", async (data) => {
                if (handled) return; // safety guard
                handled = true;

                try {
                    const snapshot = JSON.parse(data.toString());

                    await ctx.runMutation(
                        internal.processSnapshot.processSnapshot,
                        { stationId: "KH", snapshot }
                    );

                    ws.close();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });

            ws.on("error", (err) => {
                reject(err);
            });

            // Safety timeout (in case no message arrives)
            setTimeout(() => {
                if (!handled) {
                    ws.close();
                    resolve();
                }
            }, 8000);
        });
    },
});