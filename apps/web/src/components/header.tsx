import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/tanstack-react-start";
import { Link, useLocation } from "@tanstack/react-router";

const NAV_LINKS = [
  { to: "/calendar", label: "Calendar" },
  { to: "/team", label: "Team" },
  { to: "/settings", label: "Settings" },
] as const;

export default function Header() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);
  const initials = "AK"; // UserButton renders the real avatar; chip shows brand mark fallback

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-6 h-[60px] px-5 lg:px-8 shrink-0"
      style={{ background: "var(--card)", borderBottom: "3px double var(--color-border-strong)" }}
    >
      <Link
        to="/calendar"
        className="flex items-center gap-2.5 font-serif-display font-semibold text-[19px] tracking-[-0.01em]"
      >
        <span
          aria-hidden
          className="w-[25px] h-[25px] rounded-full grid place-items-center text-white text-[11px] font-bold"
          style={{ background: "var(--ember)", fontFamily: "var(--font-sans)" }}
        >
          K
        </span>
        kairos
      </Link>

      {isLoaded && isSignedIn && (
        <nav className="hidden md:flex items-center gap-[22px]" aria-label="Primary">
          {NAV_LINKS.map(({ to, label }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className="text-[13.5px] font-medium"
                style={
                  active
                    ? {
                        color: "var(--ember)",
                        textDecoration: "underline",
                        textDecorationThickness: "1.5px",
                        textUnderlineOffset: "5px",
                      }
                    : { color: "var(--ink-muted)" }
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-3">
        {isLoaded && isSignedIn ? (
          <>
            <div className="hidden sm:block [&_.clerk-internal]:!text-[12px]">
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl="/calendar"
                afterSelectOrganizationUrl="/calendar"
                appearance={{
                  elements: {
                    organizationSwitcherTrigger: "text-[12.5px] font-medium",
                    organizationPreviewText: "font-serif-display",
                  },
                }}
              />
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ boxShadow: "0 0 0 2px var(--paper), 0 0 0 3.5px var(--ember)" }}
            >
              <UserButton />
            </div>
          </>
        ) : isLoaded ? (
          <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
            Sign in to continue
          </span>
        ) : (
          <span className="sr-only">{initials}</span>
        )}
      </div>
    </header>
  );
}
