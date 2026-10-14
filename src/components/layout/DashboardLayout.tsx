import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";
import Header from "./Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import TenancyPromptModal from "@/components/TenancyPromptModal";
import TenancyBanner from "@/components/TenancyBanner";
import { useTenancy } from "@/hooks/useTenancy";

export default function DashboardLayout() {
  const { token, user, userLoading, loadUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  // Asked once across the whole app, not per page, and never blocking.
  const tenancy = useTenancy();

  useEffect(() => {
    if (token && !user && !userLoading) {
      loadUser();
    }
  }, [token, user, userLoading, loadUser]);

  // Close the mobile drawer on navigation so it never covers the new page.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (userLoading || (!user && token)) {
    return <LoadingSpinner className="h-screen" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Ambient wash — keeps large empty regions from reading as a dead void */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-accent/[0.06] to-transparent"
        />
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-40" />

        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="relative flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
            {/* Stays until answered, so dismissing is never a dead end. */}
            {tenancy.needsChoice && !tenancy.shouldPrompt && (
              <TenancyBanner onOpen={tenancy.reopen} className="mb-6" />
            )}
            <Outlet />
          </div>
        </main>
      </div>

      <TenancyPromptModal
        open={tenancy.shouldPrompt}
        onChoose={tenancy.choose}
        onDismiss={tenancy.dismiss}
      />
    </div>
  );
}
