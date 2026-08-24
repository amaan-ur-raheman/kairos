import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/tanstack-react-start";
import { Button } from "@kairos/ui/components/button";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { to: "/calendar", label: "Calendar" },
  { to: "/team", label: "Team" },
  { to: "/settings", label: "Settings" },
] as const;

const ORG_SWITCHER = {
  hidePersonal: true,
  afterCreateOrganizationUrl: "/calendar",
  afterSelectOrganizationUrl: "/calendar",
} as const;

export default function Header() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile sheet on navigation
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is intentionally the trigger
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Escape closes the mobile sheet
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-[60px] px-4 sm:px-6 lg:px-10 shrink-0"
      style={{ background: "var(--card)", borderBottom: "1px solid var(--color-border-strong)" }}
    >
      {/* Left cluster: logo + nav */}
      <div className="flex items-center gap-1 sm:gap-4">
        <Link
          to="/calendar"
          className="flex items-center gap-2.5 font-serif-display font-semibold text-[19px] tracking-[-0.01em]"
        >
          <img src="/kairos-logo.png" alt="" aria-hidden="true" className="size-7 object-contain" />
          kairos
        </Link>

        {isLoaded && isSignedIn && (
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="nav-link"
                data-active={location.pathname.startsWith(to)}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-5">
        {isLoaded && isSignedIn ? (
          <>
            <div className="hidden sm:block [&_.clerk-internal]:!text-[12px]">
              <OrganizationSwitcher
                {...ORG_SWITCHER}
                appearance={{
                  elements: {
                    organizationSwitcherTrigger: "text-[12.5px] font-medium",
                    organizationPreviewText: "font-serif-display",
                  },
                }}
              />
            </div>
            <UserButton />
            {/* Mobile menu toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 border-0 text-[var(--ink-secondary)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)] md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </>
        ) : isLoaded ? (
          <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
            Sign in to continue
          </span>
        ) : null}
      </div>

      {/* ══ Mobile nav sheet ══ */}
      {isLoaded && isSignedIn && mobileOpen && (
        <div
          id="mobile-nav"
          className="md:hidden fixed left-0 right-0 top-[60px] z-30 px-5 py-4"
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <nav aria-label="Mobile" style={{ display: "flex", flexDirection: "column" }}>
            {NAV_LINKS.map(({ to, label }) => {
              const active = location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className="py-3 text-[15px] font-medium border-b last:border-b-0"
                  style={{
                    color: active ? "var(--ember)" : "var(--ink-secondary)",
                    borderColor: "var(--color-border-subtle)",
                    textDecoration: "none",
                    paddingLeft: active ? 10 : 0,
                    borderLeft: active ? "2px solid var(--ember)" : "2px solid transparent",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div
            className="mt-2 pt-4 flex items-center justify-between border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <OrganizationSwitcher {...ORG_SWITCHER} />
            <UserButton />
          </div>
        </div>
      )}
    </header>
  );
}
