"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Navigation, 
  TowerControl as Tower,
  Globe,
  Trash2,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialSites = [
  { id: "SITE-DLA-001", name: "Douala Port", lat: "4.0511", long: "9.7085", height: "45m", type: "Pylône Autostable", status: "Opérationnel" },
  { id: "SITE-YAO-002", name: "Yaoundé Mvan", lat: "3.8480", long: "11.5192", height: "60m", type: "Pylône Haubané", status: "Opérationnel" },
  { id: "SITE-BAF-003", name: "Bafoussam Ville", lat: "5.4777", long: "10.4176", height: "30m", type: "Roof-top", status: "Maintenance" },
  { id: "SITE-GAR-004", name: "Aéroport Garoua", lat: "9.3328", long: "13.3915", height: "40m", type: "Pylône Autostable", status: "Alerte" },
  { id: "SITE-KRI-005", name: "Port Kribi", lat: "2.9376", long: "9.9077", height: "55m", type: "Pylône Autostable", status: "Planifié" },
];

export default function SitesPage() {
  const [sites, setSites] = useState(initialSites);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Sites (Pylônes)</h1>
          <p className="text-slate-500">Gérez l'emplacement et les caractéristiques de vos infrastructures de transmission.</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un Site
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Rechercher un site par nom ou ID..." 
            className="pl-10 bg-[#0f172a] border-slate-800"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-800 bg-[#0f172a]">
            <Globe className="w-4 h-4 mr-2" /> Voir sur Carte
          </Button>
          <Button variant="outline" className="border-slate-800 bg-[#0f172a]">
            <Filter className="w-4 h-4 mr-2" /> Filtrer
          </Button>
        </div>
      </div>

      {/* Sites List (Table) */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="p-4 font-medium text-slate-400">Nom du Site</th>
                <th className="p-4 font-medium text-slate-400">Coordonnées</th>
                <th className="p-4 font-medium text-slate-400">Hauteur/Type</th>
                <th className="p-4 font-medium text-slate-400">Statut</th>
                <th className="p-4 font-medium text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sites.map((site, i) => (
                <motion.tr 
                  key={site.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Tower className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">{site.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{site.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-xs">
                        <Navigation className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-400">Lat:</span> {site.lat}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs">
                        <Navigation className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-400">Long:</span> {site.long}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{site.height}</p>
                      <p className="text-xs text-slate-500">{site.type}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      site.status === "Opérationnel" ? "bg-emerald-500/10 text-emerald-500" :
                      site.status === "Alerte" ? "bg-amber-500/10 text-amber-500" :
                      site.status === "Maintenance" ? "bg-rose-500/10 text-rose-500" :
                      "bg-slate-500/10 text-slate-500"
                    )}>
                      {site.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <button className="p-2 text-slate-500 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
