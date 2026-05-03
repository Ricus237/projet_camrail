"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const clients = [
  { name: "Camrail", logo: "/images/camrail.png" },
  { name: "Polyteli", logo: "/images/polyteli.png" },
  { name: "Université de Douala", logo: "/images/univ-douala.png" },
  { name: "MTN Cameroon", logo: "/images/mtn.png" },
  { name: "Orange", logo: "/images/orange.png" },
];

export function Logos() {
  return (
    <section className="py-20 bg-[#0f172a] border-y border-white/5">
      <div className="container">
        <p className="text-center text-sm font-medium text-slate-500 uppercase tracking-widest mb-12">
          Trusted by leading infrastructure operators
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all">
          {clients.map((client, index) => (
            <motion.div
              key={client.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-center"
            >
              {client.name === "Camrail" ? (
                <Image 
                  src="/images/download-2.png" 
                  alt="Camrail" 
                  width={150} 
                  height={50} 
                  className="h-10 w-auto object-contain brightness-0 invert" 
                />
              ) : (
                <span className="text-2xl font-bold text-white tracking-tighter uppercase">
                  {client.name}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
