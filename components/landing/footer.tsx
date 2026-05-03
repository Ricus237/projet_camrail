import Link from "next/link";
// import { Facebook, Twitter, Linkedin, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-20 bg-[#0f172a] text-white border-t border-white/5">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg">T</div>
              <span className="font-bold text-xl tracking-tight">T.N.T</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Propulser l'infrastructure télécom africaine avec des outils de planification 
              RF modernes et de précision.
            </p>
            <div className="flex gap-4">
              {/* <Link href="#" className="text-slate-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors"><Facebook className="w-5 h-5" /></Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors"><Github className="w-5 h-5" /></Link> */}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6">Produit</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#features" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
              <li><Link href="#services" className="hover:text-white transition-colors">Services</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Documentation API</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Entreprise</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#about" className="hover:text-white transition-colors">À propos</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Carrières</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Légal</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-white transition-colors">Confidentialité</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Conditions d'utilisation</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 T.N.T (Tsague & Ndouma Transmission). Tous droits réservés.</p>
          <p>Conçu avec précision pour les opérateurs de réseaux africains.</p>
        </div>
      </div>
    </footer>
  );
}
