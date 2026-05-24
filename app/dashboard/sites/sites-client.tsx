"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Edit,
  Filter,
  Globe,
  MoreVertical,
  Navigation,
  Plus,
  Search,
  TowerControl as Tower,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkMap } from "@/components/dashboard/network-map";
import { cn } from "@/lib/utils";
import type { NetworkLink, Site, SiteStatus } from "@/lib/local-db";
import { createSiteAction, deleteSiteAction, updateSiteAction } from "./actions";

const statusLabels: Record<SiteStatus, string> = {
  Operational: "Opérationnel",
  Maintenance: "Maintenance",
  Alert: "Alerte",
  Planned: "Planifié",
};

type SitesClientProps = {
  initialSites: Site[];
  links: NetworkLink[];
};

export function SitesClient({ initialSites, links }: SitesClientProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SiteStatus | "All">("All");
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const sites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return initialSites.filter((site) =>
      (!normalizedQuery ||
        [site.id, site.name, site.region, site.towerType, statusLabels[site.status]]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)) &&
      (statusFilter === "All" || site.status === statusFilter),
    );
  }, [initialSites, query, statusFilter]);

  function rotateStatusFilter() {
    const statuses: Array<SiteStatus | "All"> = [
      "All",
      "Operational",
      "Maintenance",
      "Alert",
      "Planned",
    ];
    const currentIndex = statuses.indexOf(statusFilter);
    setStatusFilter(statuses[(currentIndex + 1) % statuses.length]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Sites (Pylônes)</h1>
          <p className="text-muted-foreground">
            Gérez l&apos;emplacement et les caractéristiques de vos infrastructures de
            transmission.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground" onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter un Site
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un site par nom, ID, région ou statut..."
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border bg-card" onClick={() => setShowMap(true)}>
            <Globe className="w-4 h-4 mr-2" /> Voir sur Carte
          </Button>
          <Button variant="outline" className="border-border bg-card" onClick={rotateStatusFilter}>
            <Filter className="w-4 h-4 mr-2" />{" "}
            {statusFilter === "All" ? "Tous" : statusLabels[statusFilter]}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 font-medium text-muted-foreground">Nom du Site</th>
                <th className="p-4 font-medium text-muted-foreground">Coordonnées</th>
                <th className="p-4 font-medium text-muted-foreground">Hauteur/Type</th>
                <th className="p-4 font-medium text-muted-foreground">Statut</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sites.map((site, index) => (
                <motion.tr
                  key={site.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-muted/50 transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                        <Tower className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">{site.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{site.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-xs">
                        <Navigation className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Lat:</span>{" "}
                        {site.latitude.toFixed(4)}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs">
                        <Navigation className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Long:</span>{" "}
                        {site.longitude.toFixed(4)}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{site.towerHeightM}m</p>
                      <p className="text-xs text-muted-foreground">{site.towerType}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        site.status === "Operational"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : site.status === "Alert"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : site.status === "Maintenance"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {statusLabels[site.status]}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Modifier ${site.name}`}
                        onClick={() => setEditingSite(site)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <form action={deleteSiteAction}>
                        <input type="hidden" name="id" value={site.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                          aria-label={`Supprimer ${site.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </form>
                      <button
                        className="p-2 text-muted-foreground hover:text-foreground"
                        aria-label={`Options pour ${site.name}`}
                        onClick={() => setEditingSite(site)}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {sites.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Aucun site ne correspond à cette recherche.
          </div>
        )}
      </div>

      {(isCreating || editingSite) && (
        <SiteFormDialog
          site={editingSite}
          onClose={() => {
            setIsCreating(false);
            setEditingSite(null);
          }}
        />
      )}
      {showMap && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Carte des sites CAMRAIL</h2>
                <p className="text-sm text-muted-foreground">
                  {sites.length} sites filtres, {links.length} liaisons locales.
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setShowMap(false)}>
                Fermer
              </Button>
            </div>
            <NetworkMap sites={sites} links={links} className="h-[560px]" />
          </div>
        </div>
      )}
    </div>
  );
}

function SiteFormDialog({
  site,
  onClose,
}: {
  site: Site | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(site);
  const action = isEdit ? updateSiteAction : createSiteAction;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {isEdit ? "Modifier le site" : "Ajouter un site"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Les changements sont enregistrés dans la base SQLite locale.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <form action={action} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" name="id" value={site?.id ?? ""} />
          <Field label="Nom du site" name="name" defaultValue={site?.name} />
          <Field label="Région" name="region" defaultValue={site?.region} />
          <Field
            label="Latitude"
            name="latitude"
            type="number"
            step="0.0001"
            defaultValue={site?.latitude}
          />
          <Field
            label="Longitude"
            name="longitude"
            type="number"
            step="0.0001"
            defaultValue={site?.longitude}
          />
          <Field
            label="Hauteur pylône (m)"
            name="towerHeightM"
            type="number"
            step="0.1"
            defaultValue={site?.towerHeightM}
          />
          <Field label="Type de structure" name="towerType" defaultValue={site?.towerType} />

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Statut</span>
            <select
              name="status"
              defaultValue={site?.status ?? "Operational"}
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{isEdit ? "Enregistrer" : "Créer le site"}</Button>
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
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  step?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required
        className="bg-background border-border"
      />
    </label>
  );
}
