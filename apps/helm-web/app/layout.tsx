import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Fraunces, IBM_Plex_Sans_Arabic, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HELM | حِلْم · Discover",
  description: "Browse published HELM destinations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0C1B2A",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${arabic.variable}`}
    >
      <body
        style={
          {
            ["--font-display"]: "var(--font-fraunces), serif",
            ["--font-body"]: "var(--font-outfit), sans-serif",
            ["--font-arabic"]: "var(--font-plex-arabic), sans-serif",
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
