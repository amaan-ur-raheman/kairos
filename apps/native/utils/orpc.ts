import type { AppRouterClient } from "@kairos/api/routers/index";
import { env } from "@kairos/env/native";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Background queries fail silently in the UI by design; keep a clear log trail.
      console.error(`[query:${query.queryKey.join(":")}]`, error);
    },
  }),
});

async function expoFetch(request: Request, init?: RequestInit): Promise<Response> {
  const { fetch } = await import("expo/fetch");

  return (await fetch(request.url, {
    body: await request.blob(),
    headers: request.headers,
    method: request.method,
    signal: request.signal,
    ...init,
  })) as unknown as Response;
}

export const link = new RPCLink({
  url: `${env.EXPO_PUBLIC_SERVER_URL}/rpc`,
  headers: async () => {
    const token = await getClerkAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  fetch: expoFetch,
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
