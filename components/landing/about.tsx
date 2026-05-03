"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function About() {
  return (
    <section id="about" className="py-24 bg-white dark:bg-[#0a0a0a]">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Notre Vision pour la Connectivité en Afrique</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-6 leading-relaxed">
              T.N.T (Tsague & Ndouma Transmission) a été fondé par des experts en télécoms qui 
              comprennent les défis uniques du développement des infrastructures en Afrique. 
              De l'atténuation par les pluies tropicales au relief varié, notre plateforme est 
              conçue pour résoudre les problèmes réels rencontrés quotidiennement par les ingénieurs.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-10 leading-relaxed">
              Nous nous engageons à fournir des outils accessibles et performants qui 
              permettent aux opérateurs locaux de construire des réseaux radio résilients et efficaces.
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex -space-x-4">
                {[1, 2].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white dark:border-[#0a0a0a] bg-slate-200 overflow-hidden">
                    {/* Placeholder for Tsague & Ndouma */}
                  </div>
                ))}
              </div>
              <div>
                <p className="font-bold">Tsague & Ndouma</p>
                <p className="text-sm text-slate-500">Partenaires Fondateurs</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="flex-1 relative"
          >
            <div className="relative z-10 w-full aspect-square bg-slate-100 dark:bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
               <Image 
                src="/images/about-tower.png" 
                alt="Transmission Tower" 
                fill 
                className="object-cover"
               />
            </div>
            {/* Decorative background circle */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl z-0" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
