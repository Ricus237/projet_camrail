"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  Eye,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Report } from "@/lib/local-db";

type ReportsClientProps = {
  initialReports: Report[];
};

export function ReportsClient({ initialReports }: ReportsClientProps) {
  const [query, setQuery] = useState("");

  const reports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return initialReports;
    }

    return initialReports.filter((report) =>
      [
        report.id,
        report.title,
        report.reportType,
        report.sizeLabel,
        report.author,
        report.linkId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [initialReports, query]);

  const pdfCount = initialReports.filter((report) => report.reportType === "PDF").length;
  const csvCount = initialReports.filter((report) => report.reportType === "CSV").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rapports & Documentation</h1>
          <p className="text-muted-foreground">
            Accédez à vos rapports de simulation et historiques d&apos;analyse.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <FileDown className="w-4 h-4 mr-2" /> Générer Nouveau Rapport
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-2xl">
          <p className="text-xs text-muted-foreground uppercase mb-1">Total Rapports</p>
          <p className="text-2xl font-bold">{initialReports.length}</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl">
          <p className="text-xs text-muted-foreground uppercase mb-1">PDF</p>
          <p className="text-2xl font-bold">{pdfCount}</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl">
          <p className="text-xs text-muted-foreground uppercase mb-1">CSV</p>
          <p className="text-2xl font-bold">{csvCount}</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl">
          <p className="text-xs text-muted-foreground uppercase mb-1">Source</p>
          <p className="text-2xl font-bold">Locale</p>
        </div>
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
        <Button variant="outline" className="border-border bg-card">
          <Calendar className="w-4 h-4 mr-2" /> Période
        </Button>
        <Button variant="outline" className="border-border bg-card">
          <Filter className="w-4 h-4 mr-2" /> Type
        </Button>
      </div>

      <div className="space-y-3">
        {reports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  report.reportType === "PDF"
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
                  <span>{report.sizeLabel}</span>
                  <span>Par {report.author}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={`Aperçu ${report.title}`}
              >
                <Eye className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label={`Télécharger ${report.title}`}
              >
                <Download className="w-5 h-5" />
              </Button>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-muted-foreground transition-colors ml-2" />
            </div>
          </motion.div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Aucun rapport ne correspond à cette recherche.
        </div>
      )}
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
