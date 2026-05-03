"use client";

import { motion } from "framer-motion";
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  ChevronRight,
  Eye,
  FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const reports = [
  { id: "REP-2026-001", title: "Rapport de Bilan de Liaison - Douala-Yaoundé", date: "2026-05-01", type: "PDF", size: "1.2 MB", author: "Paul Tsague" },
  { id: "REP-2026-002", title: "Analyse d'Interférence Zone Littoral", date: "2026-04-28", type: "PDF", size: "2.4 MB", author: "Paul Tsague" },
  { id: "REP-2026-003", title: "Inventaire des Sites - Région Ouest", date: "2026-04-15", type: "CSV", size: "450 KB", author: "System" },
  { id: "REP-2026-004", title: "Simulation de Couverture Kribi Port", date: "2026-04-10", type: "PDF", size: "3.1 MB", author: "Admin" },
  { id: "REP-2026-005", title: "Rapport de Maintenance Pylône Bafoussam", date: "2026-03-22", type: "PDF", size: "890 KB", author: "Field Team" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rapports & Documentation</h1>
          <p className="text-slate-500">Accédez à vos rapports de simulation et historiques d'analyse.</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <FileDown className="w-4 h-4 mr-2" /> Générer Nouveau Rapport
        </Button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase mb-1">Total Rapports</p>
          <p className="text-2xl font-bold">128</p>
        </div>
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase mb-1">Ce Mois</p>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase mb-1">Stockage Utilisé</p>
          <p className="text-2xl font-bold">45.2 MB</p>
        </div>
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase mb-1">Partagés</p>
          <p className="text-2xl font-bold">42</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Rechercher un rapport..." className="pl-10 bg-[#0f172a] border-slate-800" />
        </div>
        <Button variant="outline" className="border-slate-800 bg-[#0f172a]">
          <Calendar className="w-4 h-4 mr-2" /> Période
        </Button>
        <Button variant="outline" className="border-slate-800 bg-[#0f172a]">
          <Filter className="w-4 h-4 mr-2" /> Type
        </Button>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {reports.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group flex items-center justify-between p-4 bg-[#0f172a] border border-slate-800 rounded-2xl hover:border-primary/50 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                report.type === "PDF" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
              )}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white group-hover:text-primary transition-colors">{report.title}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="font-mono">{report.id}</span>
                  <span>•</span>
                  <span>{report.date}</span>
                  <span>•</span>
                  <span>{report.size}</span>
                  <span>•</span>
                  <span>Par {report.author}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800">
                <Eye className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/10">
                <Download className="w-5 h-5" />
              </Button>
              <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-slate-400 transition-colors ml-2" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
