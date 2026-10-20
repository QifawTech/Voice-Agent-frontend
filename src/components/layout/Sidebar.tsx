import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  ShoppingCart,
  Mic,
  LogOut,
  Settings,
  X,
  AudioLines,
  BookOpen,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn, initials } from "@/lib/utils";

const sections = [
  {
    label: "Overview",
    links: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/tenants", label: "Tenants", icon: Building2 },
    ],
  },
  {
    label: "Operations",
    links: [
      { to: "/conversations", label: "Conversations", icon: MessageSquare },
      { to: "/orders", label: "Orders", icon: ShoppingCart },
      { to: "/voice-test", label: "Voice Test", icon: Mic },
      { to: "/integration-guide", label: "Integration Guide", icon: BookOpen },
    ],
  },
  {
    label: "Account",
    links: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-bg-subtle",
        "transition-transform duration-300 ease-out lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/12">
            <AudioLines size={18} className="text-accent-light" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-text">Voice Agent</p>
            <p className="text-[11px] text-text-dim">Admin Console</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-bg-hover hover:text-text lg:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-semibold text-text-dim">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      "transition-colors duration-150",
                      isActive
                        ? "bg-accent/10 text-text"
                        : "text-text-muted hover:bg-bg-hover hover:text-text",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active rail — gives the eye a fixed anchor while scanning */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent",
                          "transition-opacity duration-150",
                          isActive ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <Icon
                        size={17}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive ? "text-accent" : "text-text-dim group-hover:text-text-muted",
                        )}
                      />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/12 text-xs font-semibold text-accent-light">
            {initials(user?.full_name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-text">{user?.full_name ?? "—"}</p>
            <p className="truncate text-[11px] text-text-dim">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            className="rounded-md p-2 text-text-dim transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
