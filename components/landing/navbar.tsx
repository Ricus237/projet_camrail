"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-xl border-b border-border py-3"
    >
      <div className="container flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/camrail-logo.png"
            alt="CAMRAIL"
            width={150}
            height={46}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="hidden sm:inline text-sm font-semibold text-muted-foreground">
            Connect
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-primary transition-colors">
            Supervision
          </Link>
          <Link href="#services" className="hover:text-primary transition-colors">
            Exploitation
          </Link>
          <Link href="#about" className="hover:text-primary transition-colors">
            CAMRAIL
          </Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">
            Déploiement
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link href="/dashboard">Ouvrir le poste</Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}
