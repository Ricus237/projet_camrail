"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Wifi,
  Trash2,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/lib/local-db";

type InventoryClientProps = {
  initialEquipment: Equipment[];
};

export function InventoryClient({ initialEquipment }: InventoryClientProps) {
  const [query, setQuery] = useState("");

  const equipment = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return initialEquipment;
    }

    return initialEquipment.filter((item) =>
      [
        item.id,
        item.brand,
        item.model,
        item.category,
        item.frequencyRange,
        item.gainDbi ? `${item.gainDbi} dBi` : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [initialEquipment, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventaire des Équipements</h1>
          <p className="text-muted-foreground">
            Gérez le catalogue de matériel télécom de l&apos;entreprise.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un Équipement
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par modèle, marque, catégorie ou ID..."
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border bg-card">
            <Filter className="w-4 h-4 mr-2" /> Filtrer
          </Button>
          <Button variant="outline" className="border-border bg-card">
            Exporter (CSV)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map((item, index) => {
          const isAntenna = item.category.toLowerCase().includes("antenne");
          const frequencyOrGain = item.frequencyRange ?? `${item.gainDbi ?? "-"} dBi`;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group glass p-6 rounded-2xl border border-border hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      isAntenna
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-cyan-500/10 text-cyan-500",
                    )}
                  >
                    {isAntenna ? <Wifi className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                  </div>
                  <button
                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Options pour ${item.brand} ${item.model}`}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-muted-foreground font-mono mb-1">{item.id}</p>
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.brand} {item.model}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.category}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-muted/50 rounded-xl border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      Fréquence/Gain
                    </p>
                    <p className="text-sm font-bold">{frequencyOrGain}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      En Stock
                    </p>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        item.stock < 5 ? "text-amber-500" : "text-foreground",
                      )}
                    >
                      {item.stock} unités
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Edit className="w-3 h-3 mr-2" /> Éditer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="w-3 h-3 mr-2" /> Supprimer
                </Button>
              </div>
            </motion.div>
          );
        })}

        <button className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:border-primary hover:text-primary transition-all group">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center group-hover:border-primary">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">Nouveau Modèle d&apos;Équipement</span>
        </button>
      </div>

      {equipment.length === 0 && (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Aucun équipement ne correspond à cette recherche.
        </div>
      )}
    </div>
  );
}
