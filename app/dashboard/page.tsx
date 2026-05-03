"use client";

import { motion } from "framer-motion";
import { 
  Signal, 
  MapPin, 
  Activity, 
  ShieldCheck, 
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock Data
const kpis = [
  { label: "Sites Totaux", value: "42", change: "+3", trend: "up", icon: MapPin },
  { label: "Liaisons Actives", value: "128", change: "+12", trend: "up", icon: Signal },
  { label: "Pertes de Propagation Moy.", value: "114.2 dB", change: "-2.1", trend: "down", icon: Activity },
  { label: "Disponibilité Moy.", value: "99.998%", change: "+0.001", trend: "up", icon: ShieldCheck },
];

const recentLinks = [
  { id: "L-DLA-YAO-01", siteA: "Port de Douala", siteB: "Yaoundé Mvan", freq: "15 GHz", dist: "242.5 km", status: "Actif" },
  { id: "L-BAF-DSCH-04", siteA: "Bafoussam Ville", siteB: "Univ Dschang", freq: "7 GHz", dist: "45.2 km", status: "Actif" },
  { id: "L-GAR-NGA-02", siteA: "Aéroport Garoua", siteB: "Falaise Ngaoundéré", freq: "11 GHz", dist: "280.1 km", status: "Alerte" },
  { id: "L-YAO-EBO-01", siteA: "Yaoundé Centre", siteB: "Colline Ebolowa", freq: "18 GHz", dist: "158.3 km", status: "Actif" },
  { id: "L-KRI-DLA-03", siteA: "Port Kribi", siteB: "Douala Bonanjo", freq: "13 GHz", dist: "172.8 km", status: "Planifié" },
  { id: "L-BUE-DLA-01", siteA: "Buea Mile 17", siteB: "Douala Akwa", freq: "23 GHz", dist: "68.4 km", status: "Actif" },
  { id: "L-MAR-GAR-05", siteA: "Ville Maroua", siteB: "Garoua Nord", freq: "8 GHz", dist: "205.2 km", status: "Actif" },
  { id: "L-BAF-BAM-02", siteA: "Bafoussam Centre", siteB: "Bamenda Upstation", freq: "15 GHz", dist: "78.9 km", status: "Maintenance" },
];

const availabilityData = [
  { region: "Littoral", availability: 99.999 },
  { region: "Centre", availability: 99.997 },
  { region: "Ouest", availability: 99.995 },
  { region: "Nord", availability: 99.990 },
  { region: "Sud", availability: 99.998 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aperçu du Réseau</h1>
          <p className="text-slate-500">État en temps réel de votre infrastructure de transmission.</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          Nouvelle Liaison
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-[#0f172a] border border-slate-800 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-slate-800 rounded-lg">
                <kpi.icon className="w-5 h-5 text-primary" />
              </div>
              <div className={cn(
                "flex items-center text-xs font-medium",
                kpi.trend === "up" ? "text-emerald-500" : "text-rose-500"
              )}>
                {kpi.trend === "up" ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {kpi.change}
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Panel */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold">Carte de Transmission</h3>
            <div className="flex gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-500" />
               <span className="text-xs text-slate-400">Vue en Direct</span>
            </div>
          </div>
          <div className="flex-1 relative bg-slate-900 flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="relative z-10 text-center">
              <MapPin className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium italic">Map View — Leaflet integration pending</p>
              <p className="text-xs text-slate-600 mt-2">Displaying Douala to Yaoundé Backbone</p>
            </div>
          </div>
        </div>

        {/* Availability Chart */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col">
          <h3 className="font-bold mb-6">Disponibilité par Région (%)</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={availabilityData} layout="vertical" margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[99.98, 100]} hide />
                <YAxis 
                  dataKey="region" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="availability" radius={[0, 4, 4, 0]}>
                  {availabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Links Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold">Liaisons Récentes</h3>
          <Button variant="ghost" size="sm" className="text-xs text-slate-400">Voir toutes les liaisons</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="p-4 font-medium text-slate-400">ID Liaison</th>
                <th className="p-4 font-medium text-slate-400">Site A</th>
                <th className="p-4 font-medium text-slate-400">Site B</th>
                <th className="p-4 font-medium text-slate-400">Fréquence</th>
                <th className="p-4 font-medium text-slate-400">Distance</th>
                <th className="p-4 font-medium text-slate-400">Statut</th>
                <th className="p-4 font-medium text-slate-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentLinks.map((link) => (
                <tr key={link.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-mono text-xs text-cyan-500">{link.id}</td>
                  <td className="p-4">{link.siteA}</td>
                  <td className="p-4">{link.siteB}</td>
                  <td className="p-4">{link.freq}</td>
                  <td className="p-4">{link.dist}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      link.status === "Actif" ? "bg-emerald-500/10 text-emerald-500" :
                      link.status === "Alerte" ? "bg-amber-500/10 text-amber-500" :
                      link.status === "Maintenance" ? "bg-rose-500/10 text-rose-500" :
                      "bg-slate-500/10 text-slate-500"
                    )}>
                      {link.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-slate-500 hover:text-white">
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
