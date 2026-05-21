"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const services = [
  {
    title: "Supervision des transmissions",
    description:
      "Un tableau de bord pour suivre les sites critiques, les liaisons actives, les pertes moyennes et la disponibilité par région.",
    features: ["KPIs alimentés par SQLite", "Statuts de liaisons", "Lecture locale sans cloud"],
    image: "/images/camrail-train-hero.jpg",
    reverse: false,
  },
  {
    title: "Planification radio terrain",
    description:
      "Les équipes peuvent préparer les bilans de liaison, comparer les distances et documenter les hypothèses techniques avant intervention.",
    features: ["Free Space Path Loss", "RSL calculé", "Base d'équipements locale"],
    image: "/images/whitespace-ref.png",
    reverse: true,
  },
  {
    title: "Documentation CAMRAIL",
    description:
      "Les rapports techniques et inventaires sont structurés pour accompagner l'exploitation ferroviaire, la maintenance et le suivi interne.",
    features: ["Rapports locaux", "Historique par liaison", "Export prévu PDF/CSV"],
    image: "/images/wireframe-1.jpeg",
    reverse: false,
  },
];

export function Services() {
  return (
    <section id="services" className="py-24 bg-muted/40">
      <div className="container space-y-24">
        {services.map((service, index) => (
          <div
            key={service.title}
            className={`flex flex-col ${service.reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12`}
          >
            <motion.div
              initial={{ opacity: 0, x: service.reverse ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex-1"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-5">{service.title}</h2>
              <p className="text-muted-foreground text-lg mb-7 leading-relaxed">
                {service.description}
              </p>
              <ul className="space-y-3 mb-8">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" variant={index === 0 ? "default" : "outline"}>
                Voir le module
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex-1 w-full aspect-[16/10] rail-panel rounded-lg overflow-hidden relative"
            >
              <Image
                src={service.image}
                alt={service.title}
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
