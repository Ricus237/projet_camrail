"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Edit, Filter, MoreVertical, Plus, Search, Trash2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/lib/local-db";
import {
  createEquipmentAction,
  deleteEquipmentAction,
  updateEquipmentAction,
} from "./actions";

type InventoryClientProps = {
  initialEquipment: Equipment[];
};

type InventoryFilter = "all" | "available" | "low-stock";

export function InventoryClient({ initialEquipment }: InventoryClientProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const equipment = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return initialEquipment.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.id, item.brand, item.model, item.category, item.frequencyRange, item.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        (filter === "available" && item.status === "available") ||
        (filter === "low-stock" && item.stock < 5);

      return matchesQuery && matchesFilter;
    });
  }, [initialEquipment, query, filter]);

  const filterLabel =
    filter === "all" ? "Tous" : filter === "available" ? "Disponibles" : "Stock bas";

  function rotateFilter() {
    setFilter((current) =>
      current === "all" ? "available" : current === "available" ? "low-stock" : "all",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventaire des Equipements</h1>
          <p className="text-muted-foreground">
            Gerez le catalogue de materiel telecom CAMRAIL.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground" onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter un Equipement
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par modele, marque, categorie ou ID..."
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border bg-card" onClick={rotateFilter}>
            <Filter className="w-4 h-4 mr-2" /> {filterLabel}
          </Button>
          <Button variant="outline" className="border-border bg-card" asChild>
            <Link href="/dashboard/inventory/export">Exporter CSV</Link>
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
              className="group glass p-6 rounded-lg border border-border hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={cn(
                      "p-3 rounded-md",
                      isAntenna
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-cyan-500/10 text-cyan-500",
                    )}
                  >
                    {isAntenna ? <Wifi className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                  </div>
                  <button
                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Modifier ${item.brand} ${item.model}`}
                    onClick={() => setEditingEquipment(item)}
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
                  <div className="p-3 bg-muted/50 rounded-md border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      Frequence/Gain
                    </p>
                    <p className="text-sm font-bold">{frequencyOrGain}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-md border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      En Stock
                    </p>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        item.stock < 5 ? "text-amber-500" : "text-foreground",
                      )}
                    >
                      {item.stock} unites
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingEquipment(item)}
                >
                  <Edit className="w-3 h-3 mr-2" /> Editer
                </Button>
                <form action={deleteEquipmentAction} className="flex-1">
                  <input type="hidden" name="id" value={item.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-rose-500"
                  >
                    <Trash2 className="w-3 h-3 mr-2" /> Supprimer
                  </Button>
                </form>
              </div>
            </motion.div>
          );
        })}

        <button
          onClick={() => setIsCreating(true)}
          className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:border-primary hover:text-primary transition-all group"
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center group-hover:border-primary">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">Nouveau Modele d&apos;Equipement</span>
        </button>
      </div>

      {equipment.length === 0 && (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Aucun equipement ne correspond a cette recherche.
        </div>
      )}

      {(isCreating || editingEquipment) && (
        <EquipmentFormDialog
          equipment={editingEquipment}
          onClose={() => {
            setIsCreating(false);
            setEditingEquipment(null);
          }}
        />
      )}
    </div>
  );
}

function EquipmentFormDialog({
  equipment,
  onClose,
}: {
  equipment: Equipment | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(equipment);
  const action = isEdit ? updateEquipmentAction : createEquipmentAction;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {isEdit ? "Modifier l'equipement" : "Ajouter un equipement"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Les changements sont enregistres dans SQLite local.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <form action={action} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" name="id" value={equipment?.id ?? ""} />
          <Field label="Marque" name="brand" defaultValue={equipment?.brand} />
          <Field label="Modele" name="model" defaultValue={equipment?.model} />
          <Field label="Categorie" name="category" defaultValue={equipment?.category} />
          <Field
            label="Plage de frequence"
            name="frequencyRange"
            defaultValue={equipment?.frequencyRange ?? ""}
            required={false}
          />
          <Field
            label="Puissance (dBm)"
            name="powerDbm"
            type="number"
            step="0.1"
            defaultValue={equipment?.powerDbm ?? ""}
            required={false}
          />
          <Field
            label="Gain (dBi)"
            name="gainDbi"
            type="number"
            step="0.1"
            defaultValue={equipment?.gainDbi ?? ""}
            required={false}
          />
          <Field
            label="Stock"
            name="stock"
            type="number"
            step="1"
            defaultValue={equipment?.stock ?? 0}
          />
          <label className="space-y-2">
            <span className="text-sm font-medium">Statut</span>
            <select
              name="status"
              defaultValue={equipment?.status ?? "available"}
              className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="available">Disponible</option>
              <option value="reserved">Reserve</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retire</option>
            </select>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{isEdit ? "Enregistrer" : "Creer l'equipement"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
  required = true,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        className="bg-background border-border"
      />
    </label>
  );
}
