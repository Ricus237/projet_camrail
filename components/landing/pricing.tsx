"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const steps = [
  {
    name: "Socle local",
    description: "Base SQLite, sites, équipements, rapports et dashboard alimentés par les données locales.",
    features: ["Aucune sortie cloud", "Données seedées", "Thème CAMRAIL"],
    cta: "Déjà posé",
    active: true,
  },
  {
    name: "Exploitation",
    description: "Formulaires de création, édition et suppression pour que les équipes modifient réellement la base.",
    features: ["CRUD sites", "CRUD liaisons", "Inventaire vivant"],
    cta: "En cours",
    active: true,
  },
  {
    name: "Sécurité",
    description: "Authentification locale avec NextAuth, rôles et accès dashboard protégés.",
    features: ["Session locale", "Rôles métiers", "Journalisation"],
    cta: "Prochaine étape",
    active: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-muted/40">
      <div className="container">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Feuille de route
          </p>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            Déploiement local, étape par étape
          </h2>
          <p className="mt-5 text-muted-foreground text-lg">
            L&apos;application avance vers un poste CAMRAIL interne: base locale,
            opérations terrain, puis authentification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((step, index) => (
            <motion.div
              key={step.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className={`relative p-6 rounded-lg rail-panel ${step.active ? "border-primary/40" : ""}`}
            >
              {step.active && (
                <div className="absolute top-4 right-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  Actif
                </div>
              )}
              <h3 className="text-xl font-bold mb-3">{step.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {step.description}
              </p>
              <ul className="space-y-3 mb-7">
                {step.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant={step.active ? "default" : "outline"} className="w-full">
                {step.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
