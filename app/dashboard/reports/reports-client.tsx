"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  Download,
  Eye,
  FileDown,
  FileText,
  Filter,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NetworkLink, Report } from "@/lib/local-db";
import { createReportAction, deleteReportAction } from "./actions";

type ReportsClientProps = {
  initialReports: Report[];
  links: NetworkLink[];
};

type ReportTypeFilter = "all" | "PDF" | "CSV" | "SIMULATION" | "BUDGET" | "SPECTRUM";

export function ReportsClient({ initialReports, links }: ReportsClientProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReportTypeFilter>("all");
  const [recentOnly, setRecentOnly] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const reports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const latestTimestamp = initialReports.reduce(
      (latest, report) => Math.max(latest, new Date(report.createdAt).getTime()),
      0,
    );
    const recentLimit = latestTimestamp - 30 * 24 * 60 * 60 * 1000;

    return initialReports.filter((report) => {
      const matchesQuery =
        !normalizedQuery ||
        [report.id, report.title, report.reportType, report.sizeLabel, report.author, report.linkId]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesType = typeFilter === "all" || report.reportType === typeFilter;
      const matchesPeriod = !recentOnly || new Date(report.createdAt).getTime() >= recentLimit;

      return matchesQuery && matchesType && matchesPeriod;
    });
  }, [initialReports, query, recentOnly, typeFilter]);

  const pdfCount = initialReports.filter((report) => report.reportType === "PDF").length;
  const csvCount = initialReports.filter((report) => report.reportType === "CSV").length;

  function rotateTypeFilter() {
    const filters: ReportTypeFilter[] = ["all", "PDF", "CSV", "SIMULATION", "BUDGET", "SPECTRUM"];
    const currentIndex = filters.indexOf(typeFilter);
    setTypeFilter(filters[(currentIndex + 1) % filters.length]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rapports & Documentation</h1>
          <p className="text-muted-foreground">
            Accedez aux rapports de simulation, bilans et historiques analyse locaux.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground" onClick={() => setIsCreating(true)}>
          <FileDown className="w-4 h-4 mr-2" /> Generer Nouveau Rapport
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Rapports" value={String(initialReports.length)} />
        <StatCard label="PDF" value={String(pdfCount)} />
        <StatCard label="CSV" value={String(csvCount)} />
        <StatCard label="Source" value="Locale" />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un rapport..."
            className="pl-10 bg-card border-border"
          />
        </div>
        <Button
          variant="outline"
          className={cn("border-border bg-card", recentOnly && "border-primary text-primary")}
          onClick={() => setRecentOnly((value) => !value)}
        >
          <Calendar className="w-4 h-4 mr-2" /> {recentOnly ? "30 derniers jours" : "Toute periode"}
        </Button>
        <Button variant="outline" className="border-border bg-card" onClick={rotateTypeFilter}>
          <Filter className="w-4 h-4 mr-2" /> {typeFilter === "all" ? "Tous types" : typeFilter}
        </Button>
      </div>

      <div className="space-y-3">
        {reports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-md flex items-center justify-center",
                  report.reportType === "PDF" || report.reportType === "BUDGET"
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-emerald-500/10 text-emerald-500",
                )}
              >
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                  {report.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="font-mono">{report.id}</span>
                  <span>{formatDate(report.createdAt)}</span>
                  <span>{report.reportType}</span>
                  <span>{report.sizeLabel}</span>
                  <span>Par {report.author}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={`Apercu ${report.title}`}
                onClick={() => setPreviewReport(report)}
              >
                <Eye className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label={`Telecharger ${report.title}`}
                asChild
              >
                <Link href={`/dashboard/reports/${report.id}/download`}>
                  <Download className="w-5 h-5" />
                </Link>
              </Button>
              <form action={deleteReportAction}>
                <input type="hidden" name="id" value={report.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-rose-500"
                  aria-label={`Supprimer ${report.title}`}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </form>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ml-2" />
            </div>
          </motion.div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Aucun rapport ne correspond a cette recherche.
        </div>
      )}

      {isCreating && <ReportFormDialog links={links} onClose={() => setIsCreating(false)} />}
      {previewReport && (
        <ReportPreviewDialog
          report={previewReport}
          link={links.find((item) => item.id === previewReport.linkId)}
          onClose={() => setPreviewReport(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <p className="text-xs text-muted-foreground uppercase mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ReportFormDialog({
  links,
  onClose,
}: {
  links: NetworkLink[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-lg shadow-2xl">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Generer un rapport</h2>
            <p className="text-sm text-muted-foreground">
              L&apos;entree sera stockee dans la base locale.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <form action={createReportAction} className="p-5 space-y-4">
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Titre</span>
            <Input name="title" defaultValue="Rapport CAMRAIL local" required />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Type</span>
              <select
                name="reportType"
                defaultValue="PDF"
                className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="PDF">PDF</option>
                <option value="CSV">CSV</option>
                <option value="SIMULATION">SIMULATION</option>
                <option value="BUDGET">BUDGET</option>
                <option value="SPECTRUM">SPECTRUM</option>
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Auteur</span>
              <Input name="author" defaultValue=" Tsague" required />
            </label>
          </div>
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Liaison associee</span>
            <select
              name="linkId"
              defaultValue=""
              className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Aucune liaison</option>
              {links.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.siteAName} - {link.siteBName}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Generer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportPreviewDialog({
  report,
  link,
  onClose,
}: {
  report: Report;
  link?: NetworkLink;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-lg shadow-2xl">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{report.title}</h2>
            <p className="text-sm text-muted-foreground">{report.id}</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <PreviewRow label="Type" value={report.reportType} />
          <PreviewRow label="Auteur" value={report.author} />
          <PreviewRow label="Date" value={formatDate(report.createdAt)} />
          <PreviewRow label="Taille" value={report.sizeLabel} />
          <PreviewRow label="Liaison" value={link ? `${link.siteAName} - ${link.siteBName}` : "Aucune"} />
          {link && (
            <div className="rounded-md border border-border bg-muted/50 p-4 mt-4">
              <p className="font-bold mb-2">Donnees RF</p>
              <p>Frequence: {link.frequencyGhz} GHz</p>
              <p>Distance: {link.distanceKm.toFixed(1)} km</p>
              <p>RSL: {link.rslDbm.toFixed(1)} dBm</p>
              <p>Disponibilite: {link.availabilityPct.toFixed(3)}%</p>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex justify-end">
          <Button asChild>
            <Link href={`/dashboard/reports/${report.id}/download`}>
              <Download className="w-4 h-4 mr-2" /> Telecharger
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
