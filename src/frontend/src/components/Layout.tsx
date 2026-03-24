import {
  CalendarClock,
  DollarSign,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  QrCode,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import type { Page } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { Button } from "./ui/button";

const DSK_LOGO = "/assets/uploads/dsk-logo-new.png";

const navItems = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "customers", label: "Customers", icon: Users },
  { page: "renewals", label: "Renewals", icon: CalendarClock },
  { page: "accounts", label: "Accounts", icon: DollarSign },
  { page: "documents", label: "Documents", icon: FolderOpen },
  { page: "scanner", label: "QR Scanner", icon: QrCode },
  { page: "settings", label: "Settings", icon: Settings },
];

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  navigate: (page: Page) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

export function Layout({
  children,
  currentPage,
  navigate,
  darkMode,
  setDarkMode,
}: LayoutProps) {
  const { clear } = useInternetIdentity();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        {!logoError ? (
          <img
            src={DSK_LOGO}
            alt="DSK Logo"
            className="h-10 w-10 rounded-xl object-contain bg-white p-0.5"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm">
            DSK
          </div>
        )}
        <div>
          <div className="font-bold text-white text-sm">DSK</div>
          <div className="text-xs text-slate-400">Seva Kendra</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            type="button"
            onClick={() => {
              navigate({ name: page } as Page);
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === page
                ? "bg-amber-500 text-slate-900"
                : "text-slate-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700 space-y-1">
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          {darkMode ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          type="button"
          onClick={clear}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex flex-col w-56 bg-slate-800 border-r border-slate-700 flex-shrink-0">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 w-full h-full cursor-default"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-56 h-full bg-slate-800 border-r border-slate-700">
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="text-slate-400"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {!logoError ? (
              <img
                src={DSK_LOGO}
                alt="DSK Logo"
                className="h-7 w-7 rounded-lg object-contain bg-white p-0.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs">
                D
              </div>
            )}
            <span className="font-bold text-white text-sm">DSK Management</span>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
