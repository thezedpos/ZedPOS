import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BusinessProvider } from "@/contexts/BusinessContext";

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
    icon: "/icon-192.png",  // Updated to match the resized icon
    apple: "/icon-512.png", // Updated to match the big icon
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
        
        {/* THIS IS THE FIX: A raw script that runs before React even loads so PWABuilder's bot sees it instantly */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(reg) { console.log('SW registered!', reg.scope); })
                  .catch(function(err) { console.log('SW failed!', err); });
              }
            `,
          }}
        />

        <BusinessProvider>
          {children}
        </BusinessProvider>
      </body>
    </html>
  );
}