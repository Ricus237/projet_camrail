"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Vue d'ensemble", href: "/dashboard" },
  { icon: MapIcon, label: "Sites", href: "/dashboard/sites" },
  { icon: Zap, label: "Liaisons", href: "/dashboard/links" },
  { icon: BarChart3, label: "Bilan de Liaison", href: "/dashboard/budget" },
  { icon: AlertTriangle, label: "Analyse d'interférence", href: "/dashboard/analysis" },
  { icon: Cpu, label: "Inventaire", href: "/dashboard/inventory" },
  { icon: FileText, label: "Rapports", href: "/dashboard/reports" },
  { icon: Settings, label: "Paramètres", href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside
        className={cn(
          "relative h-full bg-card border-r border-border transition-all duration-300 flex flex-col",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <div className="p-5 flex items-center gap-3">
          <Image
            src="/images/camrail-worker-icon.png"
            alt="CAMRAIL"
            width={38}
            height={38}
            className="rounded-md object-cover border border-border"
          />
          {!collapsed && (
            <div>
              <span className="block font-bold text-lg tracking-tight">CAMRAIL</span>
              <span className="block text-xs text-muted-foreground">Connect</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t border-border flex items-center justify-center hover:bg-muted transition-colors"
          aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <form action="/dashboard/links" className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                name="search"
                placeholder="Rechercher sites, liaisons..."
                className="w-full bg-muted/40 border border-border rounded-md pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </form>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-8 w-px bg-border mx-1" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">Paul Tsague</p>
                <p className="text-xs text-muted-foreground">Ingénieur RF</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-muted border border-border overflow-hidden">
                <Image
                  src="/images/camrail-worker-icon.png"
                  alt="Profil local"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
