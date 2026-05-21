"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

const faqs = [
  {
    question: "Les données sortent-elles de la machine ?",
    answer:
      "Non. La base actuelle est un fichier SQLite local dans le dossier db. Les pages branchées lisent directement ce fichier.",
  },
  {
    question: "Le thème CAMRAIL est-il modifiable ?",
    answer:
      "Oui. Le thème clair rouge et blanc est prioritaire, et un mode sombre reste disponible depuis le bouton de thème.",
  },
  {
    question: "Qu'est-ce qui reste à connecter ?",
    answer:
      "Les liaisons avancées, l'analyse d'interférence, l'authentification et certains exports restent à brancher progressivement.",
  },
  {
    question: "Pourquoi garder NextAuth pour plus tard ?",
    answer:
      "L'authentification mérite une passe dédiée: sessions locales, rôles, protection des routes et intégration propre avec la base.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-background">
      <div className="container max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Questions clés
          </p>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            Une base claire avant la suite
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="rail-panel rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-lg hover:bg-muted/40 transition-colors"
              >
                <span>{faq.question}</span>
                {openIndex === index ? (
                  <Minus className="w-5 h-5 text-primary" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: openIndex === index ? "auto" : 0,
                  opacity: openIndex === index ? 1 : 0,
                }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
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
