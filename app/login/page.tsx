"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 900);
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[0.95fr_1.05fr] bg-background">
      <div className="relative hidden lg:block overflow-hidden">
        <Image
          src="/images/camrail-train-hero.jpg"
          alt="Train CAMRAIL"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <p className="text-sm uppercase tracking-widest text-white/70">CAMRAIL Connect</p>
          <h1 className="mt-3 text-4xl font-bold">Poste local de transmission</h1>
        </div>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour à l&apos;accueil
          </Link>

          <div className="rail-panel p-8 rounded-lg">
            <div className="flex flex-col items-center text-center mb-8">
              <Image
                src="/images/camrail-logo.png"
                alt="CAMRAIL"
                width={190}
                height={60}
                className="h-14 w-auto object-contain mb-6"
              />
              <div className="w-16 h-16 rounded-md overflow-hidden border border-border mb-5">
                <Image
                  src="/images/camrail-worker-icon.png"
                  alt="Agent CAMRAIL"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">Connexion locale</h1>
              <p className="text-muted-foreground">
                L&apos;authentification NextAuth sera branchée dans la passe sécurité.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@camrail.cm"
                    className="pl-11 bg-background border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Link href="#" className="text-xs text-primary hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-11 bg-background border-border"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                {isLoading ? "Ouverture du poste..." : "Accéder au dashboard"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border flex items-center gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Données de travail conservées localement.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
