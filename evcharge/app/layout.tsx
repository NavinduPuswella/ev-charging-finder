import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/navbar";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EVCharge - Find & Book EV Charging Stations",
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
      <html lang="en">
        <body className={`${inter.variable} antialiased`}>
          <Navbar />
          <main>{children}</main>
          <Script
            src="https://www.payhere.lk/lib/payhere.js"
            strategy="beforeInteractive"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
