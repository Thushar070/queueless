"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Layers,
  BarChart3,
  History,
  LogOut,
  Menu,
  X,
  HelpCircle,
  ShieldCheck,
  Building
} from "lucide-react";

interface AdminSidebarProps {
  userEmail: string;
}

import ThemeToggle from "./theme-toggle";

export default function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/admin", label: "Overview", icon: ShieldCheck, exact: true },
    { href: "/admin/businesses", label: "Businesses", icon: Building },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: History }
  ];

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="lg:hidden flex items-center justify-between bg-card border-b border-border px-6 py-4 z-40 w-full fixed top-0 left-0 select-none">
        <div className="flex flex-col">
          <span className="text-sm font-extrabold tracking-tight text-foreground font-heading">
            QueueLess Admin
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Super Admin Portal
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 border border-border rounded-lg bg-muted text-foreground hover:bg-secondary cursor-pointer"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col justify-between p-6 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-8">
          {/* Logo / Org Section */}
          <div className="space-y-1 select-none">
            <span className="text-xl font-extrabold tracking-tight text-foreground font-heading block">
              QueueLess
            </span>
            <span className="text-[10px] font-heading text-destructive uppercase font-bold tracking-widest block">
              Super Admin Portal
            </span>
          </div>

          {/* Links navigation list */}
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold border-l-4 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Panel */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-t border-sidebar-border pt-6">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>

          {/* Staff Profile and Actions */}
          <div className="space-y-4">
            <div className="text-left select-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Authenticated As
              </span>
              <span className="text-xs font-bold text-foreground truncate block max-w-[200px]">
                {userEmail}
              </span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full bg-white hover:bg-red-50 text-destructive border border-destructive/20 hover:border-destructive/40 text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
