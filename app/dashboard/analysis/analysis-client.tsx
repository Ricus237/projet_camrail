"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { InterferenceFinding, InterferenceOverview } from "@/lib/local-db";
import { scanSpectrumAction } from "./actions";

type AnalysisClientProps = {
  overview: InterferenceOverview;
  lastScanAt?: string;
};

type SeverityFilter = "all" | InterferenceFinding["severity"];

const severityLabels: Record<SeverityFilter, string> = {
  all: "Tous",
  critical: "Critiques",
  warning: "Alertes",
  ok: "OK",
};

export function AnalysisClient({ overview, lastScanAt }: AnalysisClientProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SeverityFilter>("all");

  const findings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return overview.findings.filter((finding) => {
      const matchesQuery =
        !normalizedQuery ||
        [finding.title, finding.description, finding.linkAId, finding.linkBId]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesFilter = filter === "all" || finding.severity === filter;

      return matchesQuery && matchesFilter;
    });
  }, [filter, overview.findings, query]);

  function rotateFilter() {
    const filters: SeverityFilter[] = ["all", "critical", "warning", "ok"];
    const currentIndex = filters.indexOf(filter);
    setFilter(filters[(currentIndex + 1) % filters.length]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analyse d&apos;Interference</h1>
          <p className="text-muted-foreground">
            Detection locale des conflits de frequences sur les liaisons CAMRAIL.
          </p>
          {lastScanAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Dernier scan: {new Date(lastScanAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
        <form action={scanSpectrumAction}>
          <Button type="submit" className="bg-primary text-primary-foreground">
            <RefreshCw className="w-4 h-4 mr-2" /> Scanner le Spectre
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={ShieldAlert}
          title="Conflits Critiques"
          value={String(overview.criticalCount)}
          description="Frequences identiques ou trop proches."
          tone="critical"
        />
        <MetricCard
          icon={AlertTriangle}
          title="Alertes Mineures"
          value={String(overview.warningCount)}
          description="Canaux proches ou disponibilite sous objectif."
          tone="warning"
        />
        <MetricCard
          icon={CheckCircle2}
          title="Spectre Optimise"
          value={`${overview.optimizedPct}%`}
          description="Score local allocation des frequences."
          tone="ok"
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="font-bold">Journal des Interferences Detectees</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher..."
                className="pl-10 h-9 bg-muted/50 border-border sm:w-64"
              />
            </div>
            <Button variant="outline" size="sm" className="border-border" onClick={rotateFilter}>
              <Filter className="w-4 h-4 mr-2" /> {severityLabels[filter]}
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {findings.map((finding) => (
            <div key={finding.id} className="p-5 flex items-start gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-md flex items-center justify-center shrink-0",
                  finding.severity === "critical"
                    ? "bg-rose-500/10 text-rose-500"
                    : finding.severity === "warning"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-emerald-500/10 text-emerald-500",
                )}
              >
                {finding.severity === "ok" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Activity className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold">{finding.title}</h4>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      finding.severity === "critical"
                        ? "bg-rose-500/10 text-rose-500"
                        : finding.severity === "warning"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-emerald-500/10 text-emerald-500",
                    )}
                  >
                    {finding.severity}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                {finding.linkAId && (
                  <p className="text-xs text-muted-foreground font-mono mt-2">
                    {finding.linkAId}
                    {finding.linkBId ? ` / ${finding.linkBId}` : ""}
                    {finding.frequencyGapGhz !== null
                      ? ` | ecart ${finding.frequencyGapGhz} GHz`
                      : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {findings.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-muted-foreground font-medium">Aucun resultat pour ce filtre.</h4>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  description,
  tone,
}: {
  icon: typeof ShieldAlert;
  title: string;
  value: string;
  description: string;
  tone: "critical" | "warning" | "ok";
}) {
  return (
    <div
      className={cn(
        "p-6 border rounded-lg",
        tone === "critical"
          ? "bg-rose-500/5 border-rose-500/20"
          : tone === "warning"
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-emerald-500/5 border-emerald-500/20",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "p-2 rounded-md",
            tone === "critical"
              ? "bg-rose-500/10 text-rose-500"
              : tone === "warning"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-emerald-500/10 text-emerald-500",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h3
          className={cn(
            "font-bold",
            tone === "critical"
              ? "text-rose-500"
              : tone === "warning"
                ? "text-amber-500"
                : "text-emerald-500",
          )}
        >
          {title}
        </h3>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
