import { useLocation } from "react-router-dom";
import { Menu, AudioLines, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tenants": "Tenants",
  "/conversations": "Conversations",
  "/orders": "Orders",
  "/voice-test": "Voice Test",
  "/settings": "Settings",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/tenants/")) return "Tenant Detail";
  return "Console";
}

interface Props {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: Props) {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text lg:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Brand stands in for the hidden sidebar on small screens */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/12 lg:hidden">
          <AudioLines size={15} className="text-accent-light" strokeWidth={2.25} />
        </div>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
          <span className="text-text-dim">Console</span>
          <span className="text-text-dim/60">/</span>
          <span className="truncate font-medium text-text">{titleFor(pathname)}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-2.5 py-1 text-[11px] font-medium text-text-muted">
          <ShieldCheck size={12} className={isSuperAdmin ? "text-accent" : "text-success"} />
          {isSuperAdmin ? "Super Admin" : "Tenant Admin"}
        </span>
      </div>
    </header>
  );
}
