"use client";

import { useState, useMemo } from "react";
import { 
  MapPin, 
  Zap, 
  Activity, 
  Plus, 
  Settings2, 
  BarChart, 
  Info
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mock Elevation Data Generator
const generateElevationData = (siteA: string, siteB: string) => {
  const points = 50;
  const routeSeed = Array.from(`${siteA}-${siteB}`).reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  const distanceKm = 60 + (routeSeed % 220);
  const phase = routeSeed % 17;

  return Array.from({ length: points }, (_, i) => {
    const distance = (i / (points - 1)) * distanceKm;
    // Generate a random-ish terrain with some hills
    const baseElevation =
      400 + Math.sin((i + phase) * 0.2) * 50 + Math.cos((i + phase) * 0.5) * 30;
    return {
      distance: distance.toFixed(1),
      elevation: baseElevation,
      los: 550, // Straight line between antennas
      fresnelUpper: 550 + Math.sin((i / (points - 1)) * Math.PI) * 20,
      fresnelLower: 550 - Math.sin((i / (points - 1)) * Math.PI) * 20,
    };
  });
};

export default function SimulationPage() {
  const [siteA, setSiteA] = useState("Douala Port");
  const [siteB, setSiteB] = useState("Yaoundé Mvan");
  const [frequency, setFrequency] = useState("15");
  const [power, setPower] = useState("20");

  const elevationData = useMemo(() => generateElevationData(siteA, siteB), [siteA, siteB]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Simulation de Liaison Advanced</h1>
          <p className="text-muted-foreground">Planifiez et testez vos configurations radio avec profil d&apos;élévation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border bg-muted/50">
            <Plus className="w-4 h-4 mr-2" /> Nouveau Site
          </Button>
          <Button className="bg-primary text-primary-foreground">
            Enregistrer Simulation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-2xl border border-border space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Configuration</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Site A (Origine)</Label>
                <select
                  value={siteA}
                  onChange={(event) => setSiteA(event.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>Douala Port</option>
                  <option>Bafoussam Ville</option>
                  <option>Aéroport Garoua</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Site B (Destination)</Label>
                <select
                  value={siteB}
                  onChange={(event) => setSiteB(event.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>Yaoundé Mvan</option>
                  <option>Univ Dschang</option>
                  <option>Falaise Ngaoundéré</option>
                </select>
              </div>

              <div className="h-px bg-muted/50" />

              <div className="space-y-2">
                <Label>Fréquence (GHz)</Label>
                <Input 
                  type="number" 
                  value={frequency} 
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="ex: 15"
                />
              </div>

              <div className="space-y-2">
                <Label>Puissance Radio (dBm)</Label>
                <Input 
                  type="number" 
                  value={power} 
                  onChange={(e) => setPower(e.target.value)}
                  placeholder="ex: 20"
                />
              </div>

              <div className="space-y-2">
                <Label>Modèle d&apos;Antenne</Label>
                <select className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>ValuLine 2ft (36 dBi)</option>
                  <option>ValuLine 4ft (42 dBi)</option>
                  <option>High Performance 6ft (45 dBi)</option>
                </select>
              </div>
            </div>

            <Button variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/5">
              Charger Équipement Entreprise
            </Button>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Zap className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-500">Liaison Possible</p>
                <p className="text-xs text-muted-foreground mt-1">LOS dégagé à 100% avec marge de Fresnel suffisante.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Simulation View */}
        <div className="lg:col-span-3 space-y-6">
          {/* Elevation Profile Chart */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold">Profil d&apos;Élévation et Zone de Fresnel</h3>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-amber-500 rounded-full" />
                  <span className="text-muted-foreground">Sol (Terrain)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-cyan-400 rounded-full" />
                  <span className="text-muted-foreground">Ligne de Vue (LOS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-400/10 rounded-sm" />
                  <span className="text-muted-foreground">Zone de Fresnel</span>
                </div>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={elevationData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFresnel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="distance" 
                    stroke="#475569" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Distance (km)', position: 'bottom', offset: 0, fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Altitude (m)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  {/* Fresnel Zone */}
                  <Area
                    type="monotone"
                    dataKey="fresnelUpper"
                    stroke="none"
                    fill="url(#colorFresnel)"
                  />
                  <Area
                    type="monotone"
                    dataKey="fresnelLower"
                    stroke="none"
                    fill="#0f172a" // To mask the area below
                  />
                  {/* Terrain */}
                  <Area 
                    type="monotone" 
                    dataKey="elevation" 
                    stroke="#f59e0b" 
                    fillOpacity={1} 
                    fill="url(#colorElevation)" 
                  />
                  {/* Line of Sight */}
                  <ReferenceLine y={550} stroke="#22d3ee" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-card border border-border rounded-2xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Signal Reçu (RSL)</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">-48.5</span>
                <span className="text-muted-foreground mb-1">dBm</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Excellent
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Disponibilité (Pluie)</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">99.999</span>
                <span className="text-muted-foreground mb-1">%</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Haute Disponibilité
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Distance Totale</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">242.5</span>
                <span className="text-muted-foreground mb-1">km</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                DLA - YAO
              </div>
            </div>
          </div>

          {/* Interference & Path Info */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold">Analyse du Trajet & Interférences</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                    <Info className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Point Critique détecté à 120km</p>
                    <p className="text-xs text-muted-foreground">Le relief s&apos;approche à 85% de la 1ère zone de Fresnel. Hauteur pylône recommandée : +5m.</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-primary">Détails</Button>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Saturation Spectrale Faible</p>
                    <p className="text-xs text-muted-foreground">Aucune autre liaison entreprise détectée sur la bande 15GHz dans un rayon de 10km.</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-primary">Carte</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
