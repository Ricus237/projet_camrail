"use client";

import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  Activity, 
  BarChart, 
  ShieldAlert, 
  RefreshCw,
  Search,
  Filter,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analyse d'Interférence</h1>
          <p className="text-slate-500">Détectez les conflits de fréquences et optimisez le spectre sur votre réseau.</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <RefreshCw className="w-4 h-4 mr-2" /> Scanner le Spectre
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="font-bold text-rose-500">Conflits Critiques</h3>
          </div>
          <p className="text-3xl font-bold">2</p>
          <p className="text-xs text-slate-500 mt-2">Liaisons avec un rapport C/I inférieur à 15dB.</p>
        </div>

        <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="font-bold text-amber-500">Alertes Mineures</h3>
          </div>
          <p className="text-3xl font-bold">14</p>
          <p className="text-xs text-slate-500 mt-2">Risques potentiels d'évanouissement par interférence.</p>
        </div>

        <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="font-bold text-emerald-500">Spectre Optimisé</h3>
          </div>
          <p className="text-3xl font-bold">85%</p>
          <p className="text-xs text-slate-500 mt-2">Efficacité globale de l'allocation des fréquences.</p>
        </div>
      </div>

      {/* Interference List */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold">Journal des Interférences Détectées</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Rechercher..." className="pl-10 h-9 bg-slate-900 border-slate-800 w-64" />
            </div>
            <Button variant="outline" size="sm" className="border-slate-800"><Filter className="w-4 h-4 mr-2" /> Filtrer</Button>
          </div>
        </div>
        
        <div className="p-12 text-center">
          <Activity className="w-12 h-12 text-slate-800 mx-auto mb-4 animate-pulse" />
          <h4 className="text-slate-400 font-medium">Analyse Spectrale en cours...</h4>
          <p className="text-sm text-slate-600 mt-2">Le moteur IA vérifie les interférences co-canal et canal adjacent.</p>
        </div>
      </div>
    </div>
  );
}
