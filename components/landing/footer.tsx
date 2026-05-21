import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-16 bg-foreground text-background">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="mb-5 inline-flex rounded-md bg-white p-3">
              <Image
                src="/images/camrail-logo.png"
                alt="CAMRAIL"
                width={170}
                height={52}
                className="h-11 w-auto object-contain"
              />
            </div>
            <p className="max-w-md text-sm leading-relaxed text-background/70">
              CAMRAIL Connect est une base locale pour structurer la planification,
              la supervision et la documentation des transmissions utiles à l&apos;exploitation
              ferroviaire.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-5">Modules</h4>
            <ul className="space-y-3 text-sm text-background/70">
              <li><Link href="/dashboard/sites" className="hover:text-background transition-colors">Sites</Link></li>
              <li><Link href="/dashboard/links" className="hover:text-background transition-colors">Liaisons</Link></li>
              <li><Link href="/dashboard/inventory" className="hover:text-background transition-colors">Inventaire</Link></li>
              <li><Link href="/dashboard/reports" className="hover:text-background transition-colors">Rapports</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-5">Projet</h4>
            <ul className="space-y-3 text-sm text-background/70">
              <li><Link href="#features" className="hover:text-background transition-colors">Supervision</Link></li>
              <li><Link href="#about" className="hover:text-background transition-colors">CAMRAIL</Link></li>
              <li><Link href="#pricing" className="hover:text-background transition-colors">Déploiement</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-background/60">
          <p>© 2026 CAMRAIL Connect. Base locale de travail technique.</p>
          <p>Données stockées dans `db/camrail.sqlite`.</p>
        </div>
      </div>
    </footer>
  );
}
