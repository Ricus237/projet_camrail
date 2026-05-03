"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Signal, Zap } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden hero-gradient">
      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-400 mb-6"
            >
              <Zap className="w-4 h-4" />
              <span>Planification de Transmission Nouvelle Génération</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
            >
              T.N.T: Planification <span className="text-primary">RF de Précision</span> <br />
              pour les Réseaux Africains
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-xl text-lg text-slate-400 mb-10"
            >
              Simulez vos liaisons hertziennes, analysez les interférences et optimisez votre 
              infrastructure de transmission avec la plateforme d'ingénierie RF la plus avancée. 
              Adapté aux défis locaux.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Button size="lg" className="h-12 px-8 text-base font-semibold group w-full sm:w-auto" asChild>
                <Link href="/dashboard">
                  Commencer <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold text-white border-white/20 hover:bg-white/5 w-full sm:w-auto" asChild>
                <Link href="#demo">Voir la Démo</Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
            <div className="relative glass p-4 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              <img 
                src="/images/about-tower.png" 
                alt="Telecom Tower Planning" 
                className="rounded-2xl w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Decorative Wave/Mesh */}
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-[#0f172a] to-transparent" />
    </section>
  );
}
