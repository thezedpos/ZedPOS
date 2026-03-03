import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BusinessProvider } from "@/contexts/BusinessContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister"; // <--- ADDED THIS

const inter = Inter({ subsets: ["latin"] });

// --- ADDED VIEWPORT SETTINGS ---
// This prevents the screen from zooming in when cashiers tap buttons quickly
export const viewport: Viewport = {
  themeColor: "#10b981", // Emerald color to match your theme
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "ZedPOS - Smart Retail for Zambia",
  description: "Simple, tax-compliant Point of Sale for Zambian businesses.",
  manifest: "/manifest.json", 
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* --- ADDED SERVICE WORKER COMPONENT --- */}
        <ServiceWorkerRegister /> 
        
        <BusinessProvider>
          {children}
        </BusinessProvider>
      </body>
    </html>
  );
}