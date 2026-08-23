import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { availabilityRouter } from "./availability";
import { eventsRouter } from "./events";
import { leaveRouter } from "./leave";
import { membersRouter } from "./members";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  members: membersRouter,
  availability: availabilityRouter,
  leave: leaveRouter,
  events: eventsRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
