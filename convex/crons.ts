import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "Fetch and process station data", { minutes: 25 }, internal.snapshot.fetchAndProcessSnapshot
)

crons.interval(
    "Cleanup old train states", { hours: 1 }, internal.subscriptions.cleanupOldTrainStates
)



export default crons;