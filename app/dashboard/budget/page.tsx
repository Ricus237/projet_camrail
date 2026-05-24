import { BarChart3, Calculator, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLinks } from "@/lib/local-db";
import { exportBudgetAction, recalculateBudgetAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const [link] = await getLinks(1);
  const cableLossTotal = link ? link.cableLossDb * 2 : 0;
  const atmosphericLossDb = 0.5;
  const txPower = link?.txPowerDbm ?? 0;
  const antennaGain = link?.antennaGainDbi ?? 0;
  const fspl = link?.fsplDb ?? 0;
  const rsl = link ? link.rslDbm - atmosphericLossDb : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calculateur de Bilan de Liaison</h1>
          <p className="text-muted-foreground">
            Détails précis des gains et pertes de signal sur le trajet radio.
          </p>
        </div>
        {link ? (
          <form action={exportBudgetAction}>
            <input type="hidden" name="linkId" value={link.id} />
            <Button type="submit" className="bg-primary text-primary-foreground">
              <Download className="w-4 h-4 mr-2" /> Exporter le Bilan
            </Button>
          </form>
        ) : (
          <Button className="bg-primary text-primary-foreground" disabled>
            <Download className="w-4 h-4 mr-2" /> Exporter le Bilan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-3xl border border-border space-y-6">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Paramètres</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fréquence d&apos;Opération (GHz)</Label>
                <Input type="number" defaultValue={link?.frequencyGhz ?? 0} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Distance de la Liaison (km)</Label>
                <Input type="number" defaultValue={link?.distanceKm ?? 0} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Puissance d&apos;Émission (dBm)</Label>
                <Input type="number" defaultValue={txPower} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Gain Antenne TX (dBi)</Label>
                <Input type="number" defaultValue={antennaGain} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Gain Antenne RX (dBi)</Label>
                <Input type="number" defaultValue={antennaGain} readOnly />
              </div>
            </div>

            <form action={recalculateBudgetAction}>
              <Button
                type="submit"
                className="w-full mt-4 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
              >
                Recalculer
              </Button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8">
            <h3 className="font-bold mb-8 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Décomposition du Bilan {link ? `(${link.id})` : ""}
            </h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase font-bold">Gains (+)</p>
                <BudgetRow label="Puissance Émetteur" value={`+${txPower.toFixed(1)} dBm`} tone="gain" />
                <BudgetRow label="Gain Antenne TX" value={`+${antennaGain.toFixed(1)} dBi`} tone="gain" />
                <BudgetRow label="Gain Antenne RX" value={`+${antennaGain.toFixed(1)} dBi`} tone="gain" />
              </div>

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase font-bold">Pertes (-)</p>
                <BudgetRow label="Free Space Path Loss (FSL)" value={`-${fspl.toFixed(1)} dB`} tone="loss" />
                <BudgetRow label="Pertes Câbles & Connecteurs" value={`-${cableLossTotal.toFixed(1)} dB`} tone="loss" />
                <BudgetRow label="Atténuation Atmosphérique" value={`-${atmosphericLossDb.toFixed(1)} dB`} tone="loss" />
              </div>

              <div className="h-px bg-muted my-8" />

              <div className="flex items-center justify-between p-6 bg-primary/10 border border-primary/20 rounded-3xl">
                <div>
                  <p className="font-bold text-lg">Niveau de Réception Total (RSL)</p>
                  <p className="text-sm text-muted-foreground">
                    Calculé depuis la liaison locale {link ? `${link.siteAName} - ${link.siteBName}` : ""}.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{rsl.toFixed(1)} dBm</p>
                  <p className="text-xs text-emerald-500 font-bold mt-1">
                    Conforme aux objectifs
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-bold text-amber-500">Attention :</span> ce premier
              calcul local ne prend pas encore en compte le fading dû à la pluie. Ce modèle
              est prêt pour l&apos;ajout des courbes climatiques locales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gain" | "loss";
}) {
  const isGain = tone === "gain";

  return (
    <div
      className={
        isGain
          ? "flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl"
          : "flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl"
      }
    >
      <span>{label}</span>
      <span className={isGain ? "font-mono text-emerald-500" : "font-mono text-rose-500"}>
        {value}
      </span>
    </div>
  );
}
