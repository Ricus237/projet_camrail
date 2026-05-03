"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Zap, 
  Wifi, 
  Settings,
  Trash2,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialEquipment = [
  { id: "EQ-NEC-01", brand: "NEC", model: "iPASOLINK VR", type: "Radio (ODU/IDU)", freq: "6-42 GHz", power: "27 dBm", stock: 12 },
  { id: "EQ-HUA-05", brand: "Huawei", model: "OptiX RTN 950", type: "Radio (IDU)", freq: "6-80 GHz", power: "24 dBm", stock: 8 },
  { id: "EQ-ERI-02", brand: "Ericsson", model: "MINI-LINK 6352", type: "E-Band Radio", freq: "70/80 GHz", power: "18 dBm", stock: 5 },
  { id: "ANT-AND-01", brand: "Andrew", model: "ValuLine 2ft", type: "Antenne Parabolique", gain: "36 dBi", stock: 15 },
  { id: "ANT-COM-03", brand: "CommScope", model: "High Performance 4ft", type: "Antenne Parabolique", gain: "42 dBi", stock: 6 },
];

export default function InventoryPage() {
  const [equipment, setEquipment] = useState(initialEquipment);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventaire des Équipements</h1>
          <p className="text-slate-500">Gérez le catalogue de matériel télécom de l'entreprise.</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un Équipement
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Rechercher par modèle, marque ou ID..." 
            className="pl-10 bg-[#0f172a] border-slate-800"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-800 bg-[#0f172a]">
            <Filter className="w-4 h-4 mr-2" /> Filtrer
          </Button>
          <Button variant="outline" className="border-slate-800 bg-[#0f172a]">
            Exporter (CSV)
          </Button>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group glass p-6 rounded-2xl border border-white/10 hover:border-primary/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  item.type.includes("Antenne") ? "bg-amber-500/10 text-amber-500" : "bg-cyan-500/10 text-cyan-500"
                )}>
                  {item.type.includes("Antenne") ? <Wifi className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                </div>
                <button className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-xs text-slate-500 font-mono mb-1">{item.id}</p>
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{item.brand} {item.model}</h3>
                <p className="text-sm text-slate-400 mt-1">{item.type}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Fréquence/Gain</p>
                  <p className="text-sm font-bold">{item.freq || item.gain}</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">En Stock</p>
                  <p className={cn(
                    "text-sm font-bold",
                    item.stock < 5 ? "text-amber-500" : "text-white"
                  )}>{item.stock} unités</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-white/5">
              <Button variant="ghost" size="sm" className="flex-1 text-xs text-slate-400 hover:text-white">
                <Edit className="w-3 h-3 mr-2" /> Éditer
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-xs text-slate-400 hover:text-rose-500">
                <Trash2 className="w-3 h-3 mr-2" /> Supprimer
              </Button>
            </div>
          </motion.div>
        ))}

        {/* Add New Card */}
        <button className="border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-500 hover:border-primary hover:text-primary transition-all group">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center group-hover:border-primary">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">Nouveau Modèle d'Équipement</span>
        </button>
      </div>
    </div>
  );
}
