import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "Licitaciones: alertas de compras del Estado para tu empresa",
    template: "%s · Licitaciones",
  },
  description:
    "Cada mañana, las licitaciones de SEACE que tu empresa puede ganar, por WhatsApp y correo, con el precio y el ganador de la última compra similar.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-PE" className={`${publicSans.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
