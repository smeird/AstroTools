import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://astrotools.smeird.com"),
  title: {
    default: "Astrotools",
    template: "%s · Astrotools",
  },
  description:
    "Searchable, scientifically honest astrophotography planning tools for optics, sampling, exposure, guiding, sky conditions and sessions.",
  openGraph: {
    type: "website",
    siteName: "Astrotools",
    title: "Astrotools · Astrophotography Planning Suite",
    description:
      "Specify one imaging train, then search and calculate every planning result from pixel scale to exposure and storage.",
    url: "https://astrotools.smeird.com",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#081019" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
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
