"use client";

import { motion } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "Le logiciel supporte-t-il l'IA pour la planification des liaisons ?",
    answer: "Oui ! T.N.T intègre des algorithmes d'IA avancés pour la coordination automatisée des fréquences et l'optimisation de l'inclinaison, vous aidant à minimiser automatiquement les interférences.",
  },
  {
    question: "Quelles sont les normes supportées ?",
    answer: "Nous supportons un large éventail de normes internationales, notamment ITU-R P.530 pour l'affaiblissement de propagation et ITU-R P.838 pour l'atténuation due à la pluie, ainsi que les contraintes réglementaires locales africaines.",
  },
  {
    question: "Puis-je importer des données d'autres outils comme Atoll ou Planet ?",
    answer: "Oui, nous proposons des outils d'import/export CSV et JSON robustes pour assurer une transition fluide depuis vos anciens logiciels de planification de bureau.",
  },
  {
    question: "Existe-t-il une version mobile pour les ingénieurs de terrain ?",
    answer: "La plateforme est entièrement responsive et optimisée pour une utilisation sur tablette et mobile, permettant aux ingénieurs de terrain de vérifier les paramètres de liaison directement sur site.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 bg-white dark:bg-[#0a0a0a]">
      <div className="container max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Questions Fréquemment Posées</h2>
          <p className="text-slate-500 text-lg">
            Tout ce que vous devez savoir sur la plateforme T.N.T.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5"
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between font-bold text-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <span>{faq.question}</span>
                {openIndex === index ? <Minus className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5" />}
              </button>
              
              <motion.div
                initial={false}
                animate={{ height: openIndex === index ? "auto" : 0, opacity: openIndex === index ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-0 text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-white/10 mt-4">
                  {faq.answer}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
