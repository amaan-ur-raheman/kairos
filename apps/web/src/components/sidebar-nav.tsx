import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/tanstack-react-start";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { to: "/calendar", label: "Calendar" },
  { to: "/team", label: "Team" },
  { to: "/settings", label: "Settings" },
] as const;

export function SidebarNav({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  if (!isLoaded || !isSignedIn) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--color-bg)",
      }}
    >
      {/* Top Navigation Bar */}
      <nav
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          borderBottom: "1px solid var(--color-border)",
          position: "sticky",
          top: 0,
          background: "var(--color-bg)",
          zIndex: 10,
        }}
      >
        {/* Brand */}
        <Link
          to="/calendar"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius)",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-bg)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            K
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--color-ink)",
            }}
          >
            kairos
          </span>
        </Link>

        {/* Nav Links - Desktop */}
        <div className="hidden md:flex" style={{ gap: 4, marginLeft: 40 }}>
          {NAV_LINKS.map(({ to, label }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  background: active ? "var(--color-surface)" : "transparent",
                  color: active ? "var(--color-ink)" : "var(--color-ink-secondary)",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            marginLeft: "auto",
            padding: 8,
            color: "var(--color-ink-secondary)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Spacer + Org Switcher + Avatar - Desktop */}
        <div
          className="hidden md:flex"
          style={{ marginLeft: "auto", alignItems: "center", gap: 12 }}
        >
          <OrganizationSwitcher
            afterCreateOrganizationUrl="/calendar"
            afterSelectOrganizationUrl="/calendar"
            hidePersonal
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "rounded-lg px-2.5 py-1.5 bg-transparent hover:bg-[var(--color-surface)] border-none text-xs font-semibold text-[var(--color-ink-secondary)] transition-colors",
              },
            }}
          />
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 rounded-full",
              },
            }}
          />
        </div>
      </nav>

      {/* Mobile Nav Dropdown */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            background: "var(--color-bg)",
            padding: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_LINKS.map(({ to, label }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius)",
                    fontSize: 15,
                    fontWeight: 500,
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                    background: active ? "var(--color-surface)" : "transparent",
                    color: active ? "var(--color-ink)" : "var(--color-ink-secondary)",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/calendar"
              afterSelectOrganizationUrl="/calendar"
              hidePersonal
            />
            <UserButton />
          </div>
        </div>
      )}

      {/* Page Content */}
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
