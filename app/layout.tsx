import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Astrotools",
    template: "%s · Astrotools",
  },
  description:
    "Scientifically honest planning tools for astrophotography, beginning with field of view and image sampling.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#081019",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
