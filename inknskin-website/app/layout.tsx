import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Cursor from "@/components/Cursor";
import Preloader from "@/components/Preloader";
import Nav from "@/components/Nav";
import ScrollProgress from "@/components/ScrollProgress";
import StructuredData from "@/components/StructuredData";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Ink N Skin — Tatueringsstudio i Trollhättan",
    template: "%s · Ink N Skin",
  },
  description: site.description,
  keywords: [
    "tatuering Trollhättan",
    "tatuerare Trollhättan",
    "tatueringsstudio",
    "fineline",
    "blackwork",
    "cover-up",
    "Ink N Skin",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    url: site.url,
    siteName: site.name,
    title: "Ink N Skin — Tatueringsstudio i Trollhättan",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Ink N Skin — Tatueringsstudio i Trollhättan",
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#060506",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv" className="scroll-smooth">
      <body className="grain bg-ink text-bone antialiased">
        <StructuredData />
        <Preloader />
        <SmoothScroll />
        <Cursor />
        <ScrollProgress />
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
