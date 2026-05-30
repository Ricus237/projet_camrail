"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronRight,
  Database,
  Download,
  Globe,
  Lock,
  Save,
  Settings as SettingsIcon,
  Shield,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/local-db";
import {
  saveNotificationsAction,
  saveSystemPreferencesAction,
  toggleTwoFactorAction,
  updatePasswordAction,
  updateProfileAction,
} from "./actions";

type SettingsClientProps = {
  profile: UserProfile;
  dbPath: string;
  settings: {
    twoFactorEnabled: boolean;
    passwordUpdatedAt?: string;
    emailAlertsEnabled: boolean;
    spectrumAlertsEnabled: boolean;
    defaultRegion: string;
    distanceUnit: string;
    googleMapsApiKey?: string;
  };
};

const settingsSections = [
  { id: "profile", label: "Profil Utilisateur", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Securite", icon: Shield },
  { id: "data", label: "Gestion des Donnees", icon: Database },
  { id: "system", label: "Preferences Systeme", icon: Globe },
] as const;

type SettingsSection = (typeof settingsSections)[number]["id"];

export function SettingsClient({ profile, dbPath, settings }: SettingsClientProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parametres</h1>
        <p className="text-muted-foreground">
          Gere le compte local, les exports et les preferences CAMRAIL Connect.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-lg transition-all",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border",
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{section.label}</span>
              </div>
              <ChevronRight
                className={cn("w-4 h-4 transition-transform", activeSection === section.id && "rotate-90")}
              />
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <div className="glass p-8 rounded-lg border border-border min-h-[500px] relative">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {activeSection === "profile" && (
                <ProfileSection profile={profile} initials={initials} />
              )}
              {activeSection === "security" && <SecuritySection settings={settings} />}
              {activeSection === "notifications" && <NotificationsSection settings={settings} />}
              {activeSection === "data" && <DataSection dbPath={dbPath} />}
              {activeSection === "system" && <SystemSection settings={settings} />}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ profile, initials }: { profile: UserProfile; initials: string }) {
  return (
    <form action={updateProfileAction} className="space-y-6">
      <div className="flex items-center gap-6 pb-8 border-b border-border">
        <div className="w-24 h-24 rounded-full bg-muted border-4 border-border flex items-center justify-center text-3xl font-bold">
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile.name}</h2>
          <p className="text-muted-foreground text-sm">{profile.role}</p>
          <p className="text-xs text-muted-foreground mt-2">
            L&apos;avatar public reste local via l&apos;icone CAMRAIL du dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Nom Complet" name="name" defaultValue={profile.name} />
        <Field label="Email" name="email" type="email" defaultValue={profile.email} />
        <Field label="Role" name="role" defaultValue={profile.role} />
        <Field label="Localisation" name="location" defaultValue={profile.location ?? ""} />
      </div>

      <div className="pt-6 flex justify-end">
        <Button type="submit" className="bg-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" /> Enregistrer les modifications
        </Button>
      </div>
    </form>
  );
}

function SecuritySection({ settings }: { settings: SettingsClientProps["settings"] }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-6">Securite du Compte</h2>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">Mot de passe</p>
                <p className="text-xs text-muted-foreground">
                  {settings.passwordUpdatedAt
                    ? `Derniere modification: ${new Date(settings.passwordUpdatedAt).toLocaleString("fr-FR")}`
                    : "Aucune modification locale enregistree."}
                </p>
              </div>
            </div>
            <form action={updatePasswordAction}>
              <Button type="submit" variant="outline" size="sm" className="h-8 text-xs border-border bg-muted/50">
                Mettre a jour
              </Button>
            </form>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-md flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="font-bold text-sm">Double Authentification (2FA)</p>
                <p className="text-xs text-muted-foreground">
                  Etat local: {settings.twoFactorEnabled ? "activee" : "desactivee"}.
                </p>
              </div>
            </div>
            <form action={toggleTwoFactorAction}>
              <input
                type="hidden"
                name="enabled"
                value={settings.twoFactorEnabled ? "false" : "true"}
              />
              <Button type="submit" className="h-8 text-xs">
                {settings.twoFactorEnabled ? "Desactiver" : "Activer"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSection({ settings }: { settings: SettingsClientProps["settings"] }) {
  return (
    <form action={saveNotificationsAction} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Ces preferences sont stockees localement pour preparer les alertes futures.
        </p>
      </div>
      <ToggleRow
        name="emailAlertsEnabled"
        title="Alertes email locales"
        description="Activer les notifications de rapports et changements critiques."
        defaultChecked={settings.emailAlertsEnabled}
      />
      <ToggleRow
        name="spectrumAlertsEnabled"
        title="Alertes spectre"
        description="Marquer les conflits detectes comme prioritaires dans le dashboard."
        defaultChecked={settings.spectrumAlertsEnabled}
      />
      <div className="flex justify-end">
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" /> Enregistrer
        </Button>
      </div>
    </form>
  );
}

function DataSection({ dbPath }: { dbPath: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Gestion des Donnees</h2>
        <p className="text-sm text-muted-foreground">
          Rien ne sort du projet : la base active est un fichier SQLite local.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-xs uppercase text-muted-foreground">Base locale</p>
        <p className="mt-1 font-mono text-sm break-all">{dbPath}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard/sites/export">
            <Download className="w-4 h-4 mr-2" /> Sites CSV
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/links/export">
            <Download className="w-4 h-4 mr-2" /> Liaisons CSV
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/inventory/export">
            <Download className="w-4 h-4 mr-2" /> Inventaire CSV
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SystemSection({ settings }: { settings: SettingsClientProps["settings"] }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("camrail_google_maps_api_key", settings.googleMapsApiKey || "googleMapsApiKey");
    }
  }, [settings.googleMapsApiKey]);

  return (
    <form action={saveSystemPreferencesAction} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Preferences Systeme</h2>
        <p className="text-sm text-muted-foreground">
          Preferences applicatives conservees dans la table app_settings.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="space-y-2">
          <span className="text-sm font-medium">Region par defaut</span>
          <select
            name="defaultRegion"
            defaultValue={settings.defaultRegion}
            className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="Littoral">Littoral</option>
            <option value="Centre">Centre</option>
            <option value="Ouest">Ouest</option>
            <option value="Nord">Nord</option>
            <option value="Sud">Sud</option>
            <option value="Sud-Ouest">Sud-Ouest</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Unite de distance</span>
          <select
            name="distanceUnit"
            defaultValue={settings.distanceUnit}
            className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="km">Kilometres</option>
            <option value="miles">Miles</option>
          </select>
        </label>
      </div>
      <div className="space-y-2">
        <label htmlFor="googleMapsApiKey" className="text-sm font-medium">Clé API Google Maps (facultative)</label>
        <Input
          id="googleMapsApiKey"
          name="googleMapsApiKey"
          type="password"
          placeholder="AIzaSy..."
          defaultValue={settings.googleMapsApiKey}
          className="bg-background border-border"
        />
        <p className="text-xs text-muted-foreground">
          Utilisée pour l&apos;intégration des fonds de carte Google Maps. Si vide, des serveurs de tuiles libres ou le mode schématique seront utilisés.
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="submit">
          <SettingsIcon className="w-4 h-4 mr-2" /> Enregistrer
        </Button>
      </div>
    </form>
  );
}

function ToggleRow({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between gap-4">
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
