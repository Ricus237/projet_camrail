"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  Signal,
  MapPin,
  Activity,
  ShieldCheck,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardOverview, LinkStatus } from "@/lib/local-db";

type DashboardClientProps = {
  overview: DashboardOverview;
};

const statusLabels: Record<LinkStatus, string> = {
  Active: "Actif",
  Alert: "Alerte",
  Planned: "Planifié",
  Maintenance: "Maintenance",
};

export function DashboardClient({ overview }: DashboardClientProps) {
  const chartReady = useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);

  const kpis = [
    {
      label: "Sites Totaux",
      value: String(overview.totalSites),
      change: "+0",
      trend: "up",
      icon: MapPin,
    },
    {
      label: "Liaisons Actives",
      value: String(overview.activeLinks),
      change: "+0",
      trend: "up",
      icon: Signal,
    },
    {
      label: "Pertes de Propagation Moy.",
      value: `${overview.averagePathLossDb.toFixed(1)} dB`,
      change: "-",
      trend: "down",
      icon: Activity,
    },
    {
      label: "Disponibilité Moy.",
      value: `${overview.averageAvailabilityPct.toFixed(3)}%`,
      change: "+0.000",
      trend: "up",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aperçu du Réseau</h1>
          <p className="text-muted-foreground">
            État de votre infrastructure de transmission locale.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground">Nouvelle Liaison</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 bg-card border border-border rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-muted rounded-lg">
                <kpi.icon className="w-5 h-5 text-primary" />
              </div>
              <div
                className={cn(
                  "flex items-center text-xs font-medium",
                  kpi.trend === "up" ? "text-emerald-500" : "text-rose-500",
                )}
              >
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                )}
                {kpi.change}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold">Carte de Transmission</h3>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Données locales</span>
            </div>
          </div>
          <div className="flex-1 relative bg-muted/50 flex items-center justify-center">
            <div className="absolute inset-0 opacity-40 bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(0deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:42px_42px]" />
            <div className="relative z-10 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium italic">
                Carte réseau - intégration Leaflet à finaliser
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {overview.totalSites} sites et {overview.recentLinks.length} liaisons chargés
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
          <h3 className="font-bold mb-6">Disponibilité par Région (%)</h3>
          <div className="flex-1 min-h-[300px]">
            {chartReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.availabilityByRegion}
                  layout="vertical"
                  margin={{ left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" domain={[99.98, 100]} hide />
                  <YAxis
                    dataKey="region"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar dataKey="availability" radius={[0, 4, 4, 0]}>
                    {overview.availabilityByRegion.map((entry, index) => (
                      <Cell
                        key={`${entry.region}-${index}`}
                        fill={index === 0 ? "hsl(var(--primary))" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full min-h-[300px] rounded-md bg-muted/50" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold">Liaisons Récentes</h3>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Voir toutes les liaisons
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 font-medium text-muted-foreground">ID Liaison</th>
                <th className="p-4 font-medium text-muted-foreground">Site A</th>
                <th className="p-4 font-medium text-muted-foreground">Site B</th>
                <th className="p-4 font-medium text-muted-foreground">Fréquence</th>
                <th className="p-4 font-medium text-muted-foreground">Distance</th>
                <th className="p-4 font-medium text-muted-foreground">RSL</th>
                <th className="p-4 font-medium text-muted-foreground">Statut</th>
                <th className="p-4 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {overview.recentLinks.map((link) => (
                <tr key={link.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-mono text-xs text-cyan-500">{link.id}</td>
                  <td className="p-4">{link.siteAName}</td>
                  <td className="p-4">{link.siteBName}</td>
                  <td className="p-4">{link.frequencyGhz} GHz</td>
                  <td className="p-4">{link.distanceKm.toFixed(1)} km</td>
                  <td className="p-4">{link.rslDbm.toFixed(1)} dBm</td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        link.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : link.status === "Alert"
                            ? "bg-amber-500/10 text-amber-500"
                            : link.status === "Maintenance"
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-slate-500/10 text-muted-foreground",
                      )}
                    >
                      {statusLabels[link.status]}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Options pour ${link.id}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}

function clientSnapshot() {
  return true;
}

function serverSnapshot() {
  return false;
}
