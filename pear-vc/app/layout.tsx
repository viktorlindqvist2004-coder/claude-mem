import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "pear. — seed capital for the long season",
  description:
    "Pear writes first cheques before revenue, charges no management fee, and answers within a week.",
  openGraph: {
    title: "pear.",
    description:
      "Seed capital for people building something slow and large. No management fee; we are paid out of what the company earns.",
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
