import { internalMutation } from "./_generated/server";

const DEBUG = process.env.DEBUG_MITTOG

export const cleanupTrainStates = internalMutation({
    handler: async (ctx) => {
        const cutoff = Date.now() - 5 * 60 * 60 * 1000; // 5 hours

        const oldStates = await ctx.db
            .query("trainStates")
            .filter((q) => q.lt(q.field("departureTime"), cutoff))
            .collect();

        for (const state of oldStates) {
            await ctx.db.delete(state._id);
        }
        if (DEBUG) console.log(`Cleaned up ${oldStates.length} old train states`);
    }
})