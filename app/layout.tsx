import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAMRAIL Connect",
  description:
    "Plateforme locale de suivi et de planification des infrastructures CAMRAIL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
