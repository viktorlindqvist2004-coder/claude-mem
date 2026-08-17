import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "pear. — The seed stage VC for founders who build the future",
  description:
    "Pear backs founders at the very beginning. No management fees, a share of the upside, and a decision within a week.",
  openGraph: {
    title: "pear.",
    description:
      "The seed stage VC for founders who build the future. No fees. A share of the upside.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2575fc",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
