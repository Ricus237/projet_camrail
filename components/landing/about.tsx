"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const facts = [
  "Exploitation du réseau ferroviaire camerounais",
  "Transport voyageurs et marchandises",
  "Suivi technique pensé pour un usage local",
];

export function About() {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-7"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                CAMRAIL
              </p>
              <h2 className="mt-4 text-3xl md:text-5xl font-bold">
                Une plateforme alignée sur l&apos;exploitation ferroviaire
              </h2>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed">
              CAMRAIL exploite le chemin de fer camerounais avec des enjeux quotidiens
              de sécurité, disponibilité, coordination terrain et continuité des services.
              Cette application transforme la première maquette en outil local pour les
              équipes techniques.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              L&apos;objectif est simple: centraliser les sites, les liaisons radio, les
              équipements et les rapports dans une base locale maîtrisée, sans dépendre
              d&apos;un service externe pour travailler.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {facts.map((fact) => (
                <div key={fact} className="rail-soft rounded-md p-4 text-sm font-medium">
                  {fact}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative z-10 aspect-[4/3] rail-panel rounded-lg overflow-hidden">
              <Image
                src="/images/camrail-train-hero.jpg"
                alt="Train CAMRAIL"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 z-20 rail-panel rounded-lg p-4 flex items-center gap-3 max-w-xs">
              <Image
                src="/images/camrail-worker-icon.png"
                alt="Agent CAMRAIL"
                width={56}
                height={56}
                className="rounded-md object-cover"
              />
              <div>
                <p className="font-bold">Icône terrain</p>
                <p className="text-xs text-muted-foreground">Issue de la photo fournie</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
