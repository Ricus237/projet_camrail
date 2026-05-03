"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const plans = [
  {
    name: "Essai Gratuit",
    price: "0",
    duration: "30 Jours",
    description: "Parfait pour explorer la plateforme et les simulations de base.",
    features: ["Jusqu'à 5 Liaisons", "Analyse de Propagation de Base", "Cartographie Standard", "Support par Email"],
    cta: "Commencer l'essai",
    popular: false,
  },
  {
    name: "Professionnel",
    price: "49.99",
    duration: "Par mois",
    description: "Conçu pour les ingénieurs RF et consultants à plein temps.",
    features: ["Liaisons Illimitées", "Analyse d'Interférence Avancée", "Rapports de Bilan Détaillés", "Base d'Équipements Personnalisée", "Support Prioritaire"],
    cta: "Passer au Pro",
    popular: true,
  },
  {
    name: "Entreprise",
    price: "Sur mesure",
    duration: "Annuel",
    description: "Solutions évolutives pour les grands opérateurs et firmes télécoms.",
    features: ["Collaboration Multi-utilisateurs", "Accès API", "Intégration Personnalisée", "Gestionnaire de Compte Dédié", "Garantie de SLA"],
    cta: "Nous contacter",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-slate-50 dark:bg-[#0f172a]">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Des Tarifs Simples et Transparents</h2>
          <p className="text-slate-500 text-lg">
            Choisissez le forfait qui correspond à vos besoins de planification. Pas de frais cachés.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-3xl bg-white dark:bg-white/5 border ${plan.popular ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-white/10'} shadow-xl overflow-hidden`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-bl-xl">
                  MOST POPULAR
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">
                    {plan.price !== "Sur mesure" ? `${plan.price}$` : plan.price}
                  </span>
                  {plan.price !== "Sur mesure" && <span className="text-slate-500 text-sm">/{plan.duration}</span>}
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.popular ? 'default' : 'outline'} 
                className="w-full h-12 text-base font-semibold"
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
