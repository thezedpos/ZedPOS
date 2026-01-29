import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BusinessProvider } from "@/contexts/BusinessContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZedPOS - Smart Retail for Zambia",
  description: "Simple, tax-compliant Point of Sale for Zambian businesses.",
  // --- ADDED THESE LINES ---
  manifest: "/manifest.json", 
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  // -------------------------
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BusinessProvider>
          {children}
        </BusinessProvider>
      </body>
    </html>
  );
}