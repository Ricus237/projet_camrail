import { getSetting, getUserProfile, localDbPath } from "@/lib/local-db";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [
    profile,
    twoFactorEnabled,
    passwordUpdatedAt,
    emailAlertsEnabled,
    spectrumAlertsEnabled,
    defaultRegion,
    distanceUnit,
  ] = await Promise.all([
    getUserProfile(),
    getSetting("twoFactorEnabled"),
    getSetting("passwordUpdatedAt"),
    getSetting("emailAlertsEnabled"),
    getSetting("spectrumAlertsEnabled"),
    getSetting("defaultRegion"),
    getSetting("distanceUnit"),
  ]);

  return (
    <SettingsClient
      profile={
        profile ?? {
          id: "USR-LOCAL-001",
          name: "Paul Tsague",
          email: "paul.tsague@local.camrail",
          role: "RF Planning Engineer",
          location: "Douala, Cameroun",
        }
      }
      dbPath={localDbPath}
      settings={{
        twoFactorEnabled: twoFactorEnabled === "true",
        passwordUpdatedAt,
        emailAlertsEnabled: emailAlertsEnabled !== "false",
        spectrumAlertsEnabled: spectrumAlertsEnabled !== "false",
        defaultRegion: defaultRegion ?? "Littoral",
        distanceUnit: distanceUnit ?? "km",
      }}
    />
  );
}
