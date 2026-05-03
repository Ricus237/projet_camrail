"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Globe, 
  Zap, 
  Mail, 
  Lock,
  ChevronRight,
  Save,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const settingsSections = [
  { id: "profile", label: "Profil Utilisateur", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "data", label: "Gestion des Données", icon: Database },
  { id: "system", label: "Préférences Système", icon: Globe },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-slate-500">Gérez votre compte et les configurations de la plateforme T.N.T.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                activeSection === section.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "bg-[#0f172a] text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{section.label}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", activeSection === section.id && "rotate-90")} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="glass p-8 rounded-3xl border border-white/10 min-h-[500px] relative">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {activeSection === "profile" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-6 pb-8 border-b border-white/5">
                    <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-white/5 flex items-center justify-center text-3xl font-bold">
                      PT
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Paul Tsague</h2>
                      <p className="text-slate-500 text-sm">Ingénieur RF Senior</p>
                      <Button variant="outline" size="sm" className="mt-4 h-8 text-xs border-slate-700 bg-slate-900/50">Changer la Photo</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullname">Nom Complet</Label>
                      <Input id="fullname" defaultValue="Paul Tsague" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" defaultValue="paul.tsague@entreprise.cm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rôle</Label>
                      <Input id="role" defaultValue="RF Planning Engineer" disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <Input id="location" defaultValue="Douala, Cameroun" />
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <Button className="bg-primary text-primary-foreground">
                      <Save className="w-4 h-4 mr-2" /> Enregistrer les modifications
                    </Button>
                  </div>
                </div>
              )}

              {activeSection === "security" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold mb-6">Sécurité du Compte</h2>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Lock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Mot de passe</p>
                            <p className="text-xs text-slate-500">Dernière modification il y a 3 mois.</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-xs border-slate-700 bg-slate-900/50">Mettre à jour</Button>
                      </div>

                      <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-cyan-500" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Double Authentification (2FA)</p>
                            <p className="text-xs text-slate-500">Ajoutez une couche de sécurité supplémentaire.</p>
                          </div>
                        </div>
                        <Button className="bg-cyan-500 h-8 text-xs">Activer</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection !== "profile" && activeSection !== "security" && (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <Settings className="w-12 h-12 text-slate-800 mb-4 animate-spin-slow" />
                  <h3 className="text-slate-400 font-bold">Section en cours de développement</h3>
                  <p className="text-sm text-slate-600 max-w-xs mt-2">Nous préparons les options avancées de {activeSection} pour la prochaine mise à jour.</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
