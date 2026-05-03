"use client";

import { motion } from "framer-motion";
import { 
  BarChart3, 
  Calculator, 
  Download, 
  Info, 
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BudgetPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calculateur de Bilan de Liaison</h1>
          <p className="text-slate-500">Détails précis des gains et pertes de signal sur le trajet radio.</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Download className="w-4 h-4 mr-2" /> Exporter le Bilan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Input Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Paramètres</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fréquence d'Opération (MHz)</Label>
                <Input type="number" defaultValue="15000" />
              </div>
              <div className="space-y-2">
                <Label>Distance de la Liaison (km)</Label>
                <Input type="number" defaultValue="25.5" />
              </div>
              <div className="space-y-2">
                <Label>Puissance d'Émission (dBm)</Label>
                <Input type="number" defaultValue="20" />
              </div>
              <div className="space-y-2">
                <Label>Gain Antenne TX (dBi)</Label>
                <Input type="number" defaultValue="36" />
              </div>
              <div className="space-y-2">
                <Label>Gain Antenne RX (dBi)</Label>
                <Input type="number" defaultValue="36" />
              </div>
            </div>

            <Button className="w-full mt-4 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30">
              Recalculer
            </Button>
          </div>
        </div>

        {/* Right: Detailed Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8">
            <h3 className="font-bold mb-8 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Décomposition du Bilan (Link Budget)
            </h3>

            <div className="space-y-6">
              {/* Positive Gains */}
              <div className="space-y-3">
                <p className="text-xs text-slate-500 uppercase font-bold">Gains (+)</p>
                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <span>Puissance Émetteur</span>
                  <span className="font-mono text-emerald-500">+20.0 dBm</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <span>Gain Antenne TX</span>
                  <span className="font-mono text-emerald-500">+36.0 dBi</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <span>Gain Antenne RX</span>
                  <span className="font-mono text-emerald-500">+36.0 dBi</span>
                </div>
              </div>

              {/* Negative Losses */}
              <div className="space-y-3">
                <p className="text-xs text-slate-500 uppercase font-bold">Pertes (-)</p>
                <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                  <span>Free Space Path Loss (FSL)</span>
                  <span className="font-mono text-rose-500">-144.1 dB</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                  <span>Pertes Câbles & Connecteurs</span>
                  <span className="font-mono text-rose-500">-4.0 dB</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                  <span>Atténuation Atmosphérique</span>
                  <span className="font-mono text-rose-500">-0.5 dB</span>
                </div>
              </div>

              <div className="h-px bg-slate-800 my-8" />

              {/* Total Result */}
              <div className="flex items-center justify-between p-6 bg-primary/10 border border-primary/20 rounded-3xl">
                <div>
                  <p className="font-bold text-lg">Niveau de Réception Total (RSL)</p>
                  <p className="text-sm text-slate-400">Calculé pour des conditions ciel clair.</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">-56.6 dBm</p>
                  <p className="text-xs text-emerald-500 font-bold mt-1">Conforme aux objectifs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-slate-400 leading-relaxed">
              <span className="font-bold text-amber-500">Attention :</span> Ce calcul ne prend pas en compte le fading dû à la pluie. Pour une analyse complète incluant les modèles climatiques locaux, utilisez l'outil de <span className="text-white hover:underline cursor-pointer">Simulation Avancée</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
