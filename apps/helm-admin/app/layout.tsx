import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Helm حلم — Admin",
  description: "Helm حلم — Step 2 skeleton",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, 'Times New Roman', serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
