"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 glass border-b border-white/10 py-4"
    >
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-xl text-white">
            T
          </div>
          <span className="font-bold text-xl tracking-tight text-white">T.N.T</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link href="#features" className="hover:text-primary transition-colors">Fonctionnalités</Link>
          <Link href="#services" className="hover:text-primary transition-colors">Services</Link>
          <Link href="#about" className="hover:text-primary transition-colors">À propos</Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">Tarifs</Link>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-white hover:bg-white/10" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link href="/dashboard">Commencer</Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}
