import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Helm حلم · Discover",
  description: "Browse published Helm destinations — traveler Discover demo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c6b57",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body
        style={
          {
            ["--font-display"]: "var(--font-fraunces), serif",
            ["--font-body"]: "var(--font-outfit), sans-serif",
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
