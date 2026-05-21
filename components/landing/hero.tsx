"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Gauge, MapPin, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Stagiare en Transmissions", value: "Vanessa" },
  { label: "Stagiare en Transmissions", value: "Leslie" },
  { label: "Base locale", value: "Camrail" },
];

export function Hero() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden flex items-end pt-24">
      <Image
        src="/images/camrail-train-hero.jpg"
        alt="Train CAMRAIL sur le réseau ferroviaire camerounais"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 camrail-hero-overlay" />

      <div className="container relative z-10 pb-16 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl text-white"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
            <RadioTower className="w-4 h-4 text-primary" />
            Supervision locale des transmissions ferroviaires
          </div>

          <h1 className="mt-8 text-5xl md:text-7xl font-bold tracking-tight">
            CAMRAIL Connect
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl leading-relaxed text-white/86">
            Un poste de travail local pour suivre les sites radio, simuler les liaisons,
            contrôler les équipements et préparer les rapports techniques du réseau
            ferroviaire CAMRAIL.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="h-12 px-8 text-base font-semibold group" asChild>
              <Link href="/dashboard">
                Ouvrir le dashboard
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base font-semibold bg-white/10 text-white border-white/30 hover:bg-white/20"
              asChild
            >
              <Link href="#about">Découvrir CAMRAIL</Link>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-white/20 bg-white/12 p-4 backdrop-blur-md"
              >
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-white/70">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-5 right-5 z-10 hidden md:flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg">
        <Gauge className="w-4 h-4 text-primary" />
        Version 1.0.1
      </div>
      <div className="absolute bottom-5 left-5 z-10 hidden xl:flex items-center gap-2 text-xs text-white/70">
        <MapPin className="w-4 h-4" />
        Réseau national du Cameroun
      </div>
    </section>
  );
}
