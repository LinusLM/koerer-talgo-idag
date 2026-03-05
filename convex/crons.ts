import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "Fetch and process station data", { minutes: 5 }, internal.snapshot.fetchAndProcessSnapshot
)



export default crons;