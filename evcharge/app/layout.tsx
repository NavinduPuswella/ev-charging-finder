import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/navbar";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChargeX - Find & Book EV Charging Stations",
  description:
    "Discover nearby EV charging stations, book slots, plan routes, and manage your electric vehicle charging experience seamlessly.",
  keywords: ["EV charging", "electric vehicle", "charging station", "slot booking", "trip planner"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("font-sans", geist.variable)}>
        <body className={`${inter.variable} antialiased`}>
          <Navbar />
          <main>{children}</main>
          <Toaster richColors position="top-right" />
          <Script
            src="https://www.payhere.lk/lib/payhere.js"
            strategy="beforeInteractive"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
