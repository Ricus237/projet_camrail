"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const pillars = ["Voyageurs", "Fret", "Maintenance", "Transmission", "Rapports"];

export function Logos() {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="flex items-center gap-5">
            <div className="rounded-md bg-white p-3">
              <Image
                src="/images/camrail-logo.png"
                alt="CAMRAIL"
                width={180}
                height={56}
                className="h-12 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-sm uppercase tracking-widest text-white/70">
                Identité entreprise
              </p>
              <h2 className="text-2xl font-bold">Rouge, blanc, terrain.</h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {pillars.map((pillar, index) => (
              <motion.span
                key={pillar}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold"
              >
                {pillar}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
