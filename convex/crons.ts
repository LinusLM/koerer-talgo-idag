import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "Fetch and process station data", { minutes: 25 }, internal.snapshot.fetchAndProcessSnapshot
)



export default crons;