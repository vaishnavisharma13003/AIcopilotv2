"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Toasts from "../ui/Toasts";
import { useApp } from "../../context/AppContext";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { hydrated } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // close the mobile drawer whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      )}

      <div className="main-content">
        <Topbar onMenu={() => setDrawerOpen(true)} />

        <main className="dashboard" key={pathname}>
          {hydrated ? children : <div className="skeleton-block" />}
        </main>
      </div>

      <Toasts />
    </div>
  );
}
