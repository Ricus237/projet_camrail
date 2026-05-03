"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const services = [
  {
    title: "Simulation du Bilan de Liaison",
    description: "Calculez l'affaiblissement de propagation, l'atténuation atmosphérique et l'évanouissement dû à la pluie avec précision. Notre moteur supporte les configurations multi-bandes et la modulation adaptative adaptée aux conditions tropicales.",
    features: ["Modèles d'Atmosphère et de Pluie", "Support de la Modulation Adaptative", "Analyse de la Zone de Fresnel"],
    image: "/images/perfect-landing-ref.jpeg",
    reverse: false,
  },
  {
    title: "Analyse des Interférences",
    description: "Évitez la congestion spectrale. Détectez les interférences potentielles entre les liaisons existantes et nouvelles sur toute votre carte réseau grâce à une coordination de fréquence assistée par l'IA.",
    features: ["Calcul du Rapport C/I", "Coordination des Fréquences", "Base de Données des Sites Existants"],
    image: "/images/whitespace-ref.png",
    reverse: true,
  },
  {
    title: "Gestion des Sites et Actifs",
    description: "Conservez un inventaire détaillé de vos pylônes, antennes et équipements. Conçu pour répondre aux exigences réglementaires et opérationnelles locales.",
    features: ["Inventaire des Pylônes et Équipements", "Rapports de Visite de Site", "Planification de la Maintenance"],
    image: "/images/wireframe-1.jpeg",
    reverse: false,
  },
];

export function Services() {
  return (
    <section id="services" className="py-24 bg-slate-50 dark:bg-[#0f172a]">
      <div className="container space-y-32">
        {services.map((service, index) => (
          <div 
            key={index}
            className={`flex flex-col ${service.reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16`}
          >
            <motion.div 
              initial={{ opacity: 0, x: service.reverse ? 50 : -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{service.title}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 leading-relaxed">
                {service.description}
              </p>
              <ul className="space-y-4 mb-10">
                {service.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg">En savoir plus</Button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="flex-1 w-full aspect-video bg-white dark:bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative"
            >
              <img 
                src={service.image} 
                alt={service.title} 
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
