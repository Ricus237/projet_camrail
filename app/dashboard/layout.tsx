"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Settings, 
  BarChart3, 
  Zap, 
  AlertTriangle, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  Search,
  User,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Vue d'ensemble", href: "/dashboard" },
  { icon: MapIcon, label: "Sites", href: "/dashboard/sites" },
  { icon: Zap, label: "Liaisons", href: "/dashboard/links" },
  { icon: BarChart3, label: "Bilan de Liaison", href: "/dashboard/budget" },
  { icon: AlertTriangle, label: "Analyse d'Interférence", href: "/dashboard/analysis" },
  { icon: FileText, label: "Rapports", href: "/dashboard/reports" },
  { icon: Settings, label: "Paramètres", href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "relative h-full bg-[#0f172a] border-r border-slate-800 transition-all duration-300 flex flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold">T</div>
          {!collapsed && <span className="font-bold text-xl tracking-tight">T.N.T</span>}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {sidebarItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                pathname === item.href 
                  ? "bg-primary text-primary-foreground" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Rechercher sites, liaisons..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400">
              <Sun className="w-5 h-5" />
            </Button>
            <div className="h-8 w-px bg-slate-800 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">Paul Tsague</p>
                <p className="text-xs text-slate-500">Ingénieur RF</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
