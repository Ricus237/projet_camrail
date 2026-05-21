"use client";

import { motion } from "framer-motion";
import { Database, FileText, MapPinned, RadioTower, ShieldCheck, TrainFront } from "lucide-react";

const features = [
  {
    title: "Sites ferroviaires",
    description:
      "Suivi local des gares, dépôts, pylônes, points radio et zones techniques qui soutiennent l'exploitation CAMRAIL.",
    icon: TrainFront,
  },
  {
    title: "Liaisons radio",
    description:
      "Calcul de distance, pertes de propagation, niveau reçu et disponibilité pour prioriser les interventions réseau.",
    icon: RadioTower,
  },
  {
    title: "Carte opérationnelle",
    description:
      "Visualisation des sites et des liaisons autour des corridors ferroviaires, avec statuts et alertes techniques.",
    icon: MapPinned,
  },
  {
    title: "Inventaire matériel",
    description:
      "Catalogue local des radios, antennes et équipements critiques, avec stock et caractéristiques utiles au terrain.",
    icon: Database,
  },
  {
    title: "Traçabilité",
    description:
      "Rapports et historiques prêts à documenter les simulations, les bilans et les décisions d'exploitation.",
    icon: FileText,
  },
  {
    title: "Données locales",
    description:
      "La base SQLite reste sur la machine: aucun service externe n'est requis pour consulter ou préparer les données.",
    icon: ShieldCheck,
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container">
        <div className="max-w-3xl mb-14">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Poste technique CAMRAIL
          </p>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            De la maquette au pilotage local du réseau
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            CAMRAIL Connect rassemble les données de transmission nécessaires au terrain:
            sites, liaisons, équipements, calculs RF et rapports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="rail-panel rounded-lg p-6 hover:border-primary/40 transition-colors"
            >
              <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-3">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
