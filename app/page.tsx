"use client";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Logos } from "@/components/landing/logos";
import { Features } from "@/components/landing/features";
import { Services } from "@/components/landing/services";
import { About } from "@/components/landing/about";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { motion, useScroll, useSpring } from "framer-motion";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <main className="relative min-h-screen">
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-[60] origin-left"
        style={{ scaleX }}
      />

      <Navbar />
      
      <Hero />
      
      <Logos />
      
      <Features />
      
      <Services />
      
      <About />
      
      <Pricing />
      
      <FAQ />
      
      <Footer />
    </main>
  );
}
