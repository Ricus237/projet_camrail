"use client";

import { motion } from "framer-motion";
import { Cpu, Globe, Layout, ShieldCheck, Zap, BarChart3 } from "lucide-react";

const features = [
  {
    title: "Précision Locale",
    description: "Conçu spécifiquement pour le relief et les conditions atmosphériques africaines, assurant une disponibilité de 99,999%.",
    icon: Globe,
    color: "text-blue-500",
  },
  {
    title: "Optimisation par l'IA",
    description: "Trouvez automatiquement les meilleures fréquences et angles d'inclinaison pour minimiser les interférences.",
    icon: Cpu,
    color: "text-cyan-500",
  },
  {
    title: "Simulation Temps Réel",
    description: "Calculs de bilan de liaison instantanés et visualisation de la zone de Fresnel lors du déplacement des sites.",
    icon: Zap,
    color: "text-yellow-500",
  },
  {
    title: "Rentabilité",
    description: "Modèle SaaS conçu pour réduire les coûts de planification pour les opérateurs locaux et les FAI.",
    icon: BarChart3,
    color: "text-green-500",
  },
  {
    title: "Conformité Réglementaire",
    description: "Intégration des normes ART (Cameroun) et UIT pour les interférences et les licences.",
    icon: ShieldCheck,
    color: "text-purple-500",
  },
  {
    title: "Interface Intuitive",
    description: "Fini les logiciels de bureau complexes. Des outils professionnels accessibles depuis n'importe quel navigateur.",
    icon: Layout,
    color: "text-pink-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section id="features" className="py-24 bg-white dark:bg-[#0a0a0a]">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Conçu pour le futur des Télécoms</h2>
          <p className="text-slate-500 text-lg">
            Ne perdez plus de temps avec des outils obsolètes. T.N.T offre un environnement 
            moderne et collaboratif pour les ingénieurs en radiocommunications.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="p-8 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:shadow-xl transition-shadow group"
            >
              <div className={`w-12 h-12 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
