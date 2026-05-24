"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Activity,
  BarChart,
  Download,
  Edit,
  Info,
  MapPin,
  Plus,
  Save,
  Settings2,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NetworkMap } from "@/components/dashboard/network-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Equipment, LinkStatus, NetworkLink, Site } from "@/lib/local-db";
import {
  createLinkAction,
  deleteLinkAction,
  saveSimulationAction,
  updateLinkAction,
} from "./actions";

type LinksClientProps = {
  sites: Site[];
  equipment: Equipment[];
  initialLinks: NetworkLink[];
  initialFocusId?: string;
  initialQuery?: string;
};

const statusLabels: Record<LinkStatus, string> = {
  Active: "Actif",
  Alert: "Alerte",
  Planned: "Planifie",
  Maintenance: "Maintenance",
};

export function LinksClient({
  sites,
  equipment,
  initialLinks,
  initialFocusId,
  initialQuery = "",
}: LinksClientProps) {
  const chartReady = useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);
  const [query, setQuery] = useState(initialQuery);
  const [activePanel, setActivePanel] = useState<"details" | "map">("details");
  const [isCreating, setIsCreating] = useState(false);
  const [editingLink, setEditingLink] = useState<NetworkLink | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState(
    initialFocusId && initialLinks.some((link) => link.id === initialFocusId)
      ? initialFocusId
      : initialLinks[0]?.id,
  );

  const filteredLinks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return initialLinks;
    }

    return initialLinks.filter((link) =>
      [
        link.id,
        link.siteAName,
        link.siteBName,
        link.status,
        `${link.frequencyGhz} GHz`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [initialLinks, query]);

  const selectedLink =
    initialLinks.find((link) => link.id === selectedLinkId) ?? initialLinks[0];
  const selectedSites = selectedLink
    ? sites.filter((site) => site.id === selectedLink.siteAId || site.id === selectedLink.siteBId)
    : sites;
  const elevationData = selectedLink ? generateElevationData(selectedLink) : [];
  const fadeMargin = selectedLink ? Math.max(0, selectedLink.rslDbm + 80) : 0;
  const linkHealth =
    selectedLink?.status === "Alert"
      ? "A surveiller"
      : fadeMargin >= 25
        ? "Excellent"
        : fadeMargin >= 15
          ? "Correct"
          : "Limite";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Simulation de Liaison</h1>
          <p className="text-muted-foreground">
            Planifiez, calculez et enregistrez les liaisons radio dans la base locale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-border bg-card" asChild>
            <Link href="/dashboard/sites">
              <Plus className="w-4 h-4 mr-2" /> Nouveau Site
            </Link>
          </Button>
          <Button variant="outline" className="border-border bg-card" asChild>
            <Link href="/dashboard/links/export">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Link>
          </Button>
          <Button className="bg-primary text-primary-foreground" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle Liaison
          </Button>
          {selectedLink && (
            <form action={saveSimulationAction}>
              <input type="hidden" name="linkId" value={selectedLink.id} />
              <Button type="submit" className="bg-primary text-primary-foreground">
                <Save className="w-4 h-4 mr-2" /> Enregistrer Simulation
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-lg border border-border space-y-5">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Configuration active</h3>
            </div>

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une liaison..."
              className="bg-background border-border"
            />

            <div className="space-y-2 max-h-[330px] overflow-y-auto pr-1">
              {filteredLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => setSelectedLinkId(link.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-md border transition-colors",
                    selectedLink?.id === link.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <p className="text-sm font-bold">{link.siteAName} - {link.siteBName}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{link.id}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span>{link.frequencyGhz} GHz</span>
                    <span>{statusLabels[link.status]}</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedLink && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingLink(selectedLink)}>
                  <Edit className="w-3 h-3 mr-2" /> Modifier
                </Button>
                <form action={deleteLinkAction}>
                  <input type="hidden" name="id" value={selectedLink.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="w-full text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3 mr-2" /> Supprimer
                  </Button>
                </form>
              </div>
            )}
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-md">
                <Zap className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-500">
                  {selectedLink ? linkHealth : "Aucune liaison"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedLink
                    ? `Marge locale estimee: ${fadeMargin.toFixed(1)} dB.`
                    : "Creez une premiere liaison pour calculer le bilan."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <BarChart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Profil d&apos;Elevation et Zone de Fresnel</h3>
                  <p className="text-xs text-muted-foreground">
                    Profil local estime a partir de la liaison selectionnee.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={activePanel === "details" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePanel("details")}
                >
                  <Info className="w-4 h-4 mr-2" /> Details
                </Button>
                <Button
                  variant={activePanel === "map" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePanel("map")}
                >
                  <MapPin className="w-4 h-4 mr-2" /> Carte
                </Button>
              </div>
            </div>

            {activePanel === "details" ? (
              <div className="h-[380px] w-full">
                {chartReady && selectedLink ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={elevationData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFresnel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e30613" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#e30613" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="distance"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--popover-foreground))",
                        }}
                      />
                      <Area type="monotone" dataKey="fresnelUpper" stroke="none" fill="url(#colorFresnel)" />
                      <Area type="monotone" dataKey="terrain" stroke="#f59e0b" fill="url(#colorElevation)" />
                      <ReferenceLine y={550} stroke="#e30613" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full rounded-md bg-muted/50" />
                )}
              </div>
            ) : (
              <NetworkMap
                sites={selectedLink ? selectedSites : sites}
                links={selectedLink ? [selectedLink] : initialLinks}
                className="h-[380px] overflow-hidden rounded-md border border-border"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Signal Recu (RSL)"
              value={selectedLink ? selectedLink.rslDbm.toFixed(1) : "-"}
              suffix="dBm"
              tone={selectedLink && selectedLink.rslDbm < -72 ? "warning" : "good"}
            />
            <MetricCard
              label="Disponibilite"
              value={selectedLink ? selectedLink.availabilityPct.toFixed(3) : "-"}
              suffix="%"
              tone={selectedLink && selectedLink.availabilityPct < 99.99 ? "warning" : "good"}
            />
            <MetricCard
              label="Distance totale"
              value={selectedLink ? selectedLink.distanceKm.toFixed(1) : "-"}
              suffix="km"
              tone="neutral"
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold">Analyse du Trajet & Interferences</h3>
            </div>

            {selectedLink ? (
              <div className="space-y-4">
                <InfoRow
                  tone={fadeMargin >= 20 ? "good" : "warning"}
                  title="Marge de fading"
                  description={`${fadeMargin.toFixed(1)} dB calcules depuis le RSL local. Objectif conseille: 20 dB ou plus.`}
                />
                <InfoRow
                  tone={selectedLink.status === "Alert" ? "warning" : "neutral"}
                  title="Allocation spectrale"
                  description={`Frequence ${selectedLink.frequencyGhz} GHz. Les conflits sont controles dans la page Analyse interference.`}
                  action={
                    <Button size="sm" variant="ghost" className="text-primary" asChild>
                      <Link href="/dashboard/analysis">Analyser</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Aucune liaison locale n&apos;est encore disponible.
              </div>
            )}
          </div>
        </div>
      </div>

      {(isCreating || editingLink) && (
        <LinkFormDialog
          link={editingLink}
          sites={sites}
          equipment={equipment}
          onClose={() => {
            setIsCreating(false);
            setEditingLink(null);
          }}
        />
      )}
    </div>
  );
}

function LinkFormDialog({
  link,
  sites,
  equipment,
  onClose,
}: {
  link: NetworkLink | null;
  sites: Site[];
  equipment: Equipment[];
  onClose: () => void;
}) {
  const isEdit = Boolean(link);
  const action = isEdit ? updateLinkAction : createLinkAction;
  const firstSite = sites[0]?.id ?? "";
  const secondSite = sites[1]?.id ?? firstSite;
  const [siteAId, setSiteAId] = useState(link?.siteAId ?? firstSite);
  const [siteBId, setSiteBId] = useState(link?.siteBId ?? secondSite);
  const [frequencyGhz, setFrequencyGhz] = useState(String(link?.frequencyGhz ?? 15));
  const [txPowerDbm, setTxPowerDbm] = useState(String(link?.txPowerDbm ?? 20));
  const [antennaGainDbi, setAntennaGainDbi] = useState(String(link?.antennaGainDbi ?? 36));
  const [cableLossDb, setCableLossDb] = useState(String(link?.cableLossDb ?? 2));
  const [status, setStatus] = useState<LinkStatus>(link?.status ?? "Active");
  const radio = equipment.find((item) => item.powerDbm !== null);
  const antenna = equipment.find((item) => item.gainDbi !== null);

  function applyEquipmentDefaults() {
    if (radio?.powerDbm !== null && radio?.powerDbm !== undefined) {
      setTxPowerDbm(String(radio.powerDbm));
    }

    if (antenna?.gainDbi !== null && antenna?.gainDbi !== undefined) {
      setAntennaGainDbi(String(antenna.gainDbi));
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {isEdit ? "Modifier la liaison" : "Nouvelle liaison"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Le bilan RF sera recalcule et persiste en SQLite.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <form action={action} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" name="id" value={link?.id ?? ""} />
          <SelectField label="Site A" name="siteAId" value={siteAId} onChange={setSiteAId}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Site B" name="siteBId" value={siteBId} onChange={setSiteBId}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </SelectField>
          <ControlledField
            label="Frequence (GHz)"
            name="frequencyGhz"
            type="number"
            step="0.1"
            value={frequencyGhz}
            onChange={setFrequencyGhz}
          />
          <ControlledField
            label="Puissance radio (dBm)"
            name="txPowerDbm"
            type="number"
            step="0.1"
            value={txPowerDbm}
            onChange={setTxPowerDbm}
          />
          <ControlledField
            label="Gain antenne (dBi)"
            name="antennaGainDbi"
            type="number"
            step="0.1"
            value={antennaGainDbi}
            onChange={setAntennaGainDbi}
          />
          <ControlledField
            label="Pertes cables (dB)"
            name="cableLossDb"
            type="number"
            step="0.1"
            value={cableLossDb}
            onChange={setCableLossDb}
          />
          <SelectField label="Statut" name="status" value={status} onChange={(value) => setStatus(value as LinkStatus)}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>

          <div className="md:col-span-2 flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-medium">Equipement entreprise</p>
              <p className="text-xs text-muted-foreground">
                {radio || antenna
                  ? `${radio ? `${radio.brand} ${radio.model}` : "Radio non definie"} / ${antenna ? `${antenna.brand} ${antenna.model}` : "antenne non definie"}`
                  : "Aucun equipement catalogue disponible."}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={applyEquipmentDefaults}>
              Charger Equipement Entreprise
            </Button>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{isEdit ? "Enregistrer" : "Creer la liaison"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ControlledField({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="bg-background border-border"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Label className="space-y-2">
      <span>{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
      >
        {children}
      </select>
    </Label>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  tone: "good" | "warning" | "neutral";
}) {
  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-muted-foreground mb-1">{suffix}</span>
      </div>
      <div
        className={cn(
          "mt-4 flex items-center gap-2 text-xs",
          tone === "good" ? "text-emerald-500" : tone === "warning" ? "text-amber-500" : "text-muted-foreground",
        )}
      >
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            tone === "good" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-muted-foreground",
          )}
        />
        Donnee locale
      </div>
    </div>
  );
}

function InfoRow({
  title,
  description,
  tone,
  action,
}: {
  title: string;
  description: string;
  tone: "good" | "warning" | "neutral";
  action?: ReactNode;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-md border border-border flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            tone === "good"
              ? "bg-emerald-500/10 text-emerald-500"
              : tone === "warning"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-primary/10 text-primary",
          )}
        >
          <Info className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function generateElevationData(link: NetworkLink) {
  const points = 50;
  const seed = Array.from(link.id).reduce((total, char) => total + char.charCodeAt(0), 0);
  const distanceKm = Math.max(link.distanceKm, 1);
  const fresnelRadius = Math.max(12, Math.min(42, distanceKm / 5));

  return Array.from({ length: points }, (_, index) => {
    const ratio = index / (points - 1);
    const distance = ratio * distanceKm;
    const terrain =
      405 +
      Math.sin((index + seed) * 0.2) * 44 +
      Math.cos((index + seed) * 0.47) * 28 +
      Math.sin(ratio * Math.PI) * Math.min(95, distanceKm / 2.4);

    return {
      distance: distance.toFixed(1),
      terrain: Math.round(terrain),
      fresnelUpper: Math.round(550 + Math.sin(ratio * Math.PI) * fresnelRadius),
    };
  });
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
