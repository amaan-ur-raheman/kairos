import { ClerkProvider, OrganizationList, useAuth } from "@clerk/tanstack-react-start";
import { Toaster } from "@kairos/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";

import Header from "../components/header";

import appCss from "../index.css?url";

function ClerkApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkAuthTokenGetter(getToken);
    return () => setClerkAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

import type { orpc } from "@/utils/orpc";
export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Kairos" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,500;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function AuthGate() {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const location = useLocation();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <main className="grid place-items-center p-6 min-h-svh">
        <div
          className="h-4 w-4 rounded-full animate-spin border-2"
          style={{ borderColor: "var(--color-border-strong)", borderTopColor: "var(--ember)" }}
        />
      </main>
    );
  }

  if (!isSignedIn) {
    const isAuthPage = location.pathname === "/sign-in" || location.pathname === "/sign-up";
    if (!isAuthPage) {
      router.navigate({ to: "/sign-in", search: { redirect: location.href } });
    }
    return <Outlet />;
  }

  if (!orgId) {
    return (
      <main className="overflow-auto grid place-items-center p-6 min-h-svh">
        <div className="w-full max-w-lg text-center">
          <h1 className="font-serif-display text-2xl font-semibold">Choose your workspace</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--ink-muted)" }}>
            Select or create a workspace to get started.
          </p>
          <div
            className="mt-8 overflow-hidden rounded-xl border p-5 text-left"
            style={{ borderColor: "var(--color-border)", background: "var(--card)" }}
          >
            <OrganizationList
              hidePersonal
              afterCreateOrganizationUrl="/calendar"
              afterSelectOrganizationUrl="/calendar"
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="grid h-dvh grid-rows-[auto_1fr]" style={{ height: "100dvh" }}>
      <Header />
      <div className="min-h-0 overflow-hidden flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}

function RootDocument() {
  return (
    <ClerkProvider>
      <ClerkApiAuthBridge />
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body>
          <AuthGate />
          <Toaster richColors />
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
          <Scripts />
        </body>
      </html>
    </ClerkProvider>
  );
}
