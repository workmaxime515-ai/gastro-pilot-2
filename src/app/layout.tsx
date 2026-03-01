import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { SidebarNav } from "@/components/SidebarNav";
import { ContextPanel } from "@/components/ContextPanel";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UndoProvider } from "@/lib/undo";
import { UndoToast } from "@/components/UndoToast";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { I18nProvider } from "@/i18n";

export const metadata: Metadata = {
  title: "CoffeeFlow — Dein täglicher Entscheidungshelfer",
  description:
    "KI-gestütztes Management für Coffee Shops. Jeden Morgen klare Handlungsempfehlungen.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CoffeeFlow",
    statusBarStyle: "default",
  },
  icons: {
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1117" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <I18nProvider>
          <UndoProvider>
            {/* Desktop: 3-column layout */}
            <div className="lg:grid lg:grid-cols-[240px_1fr_280px] lg:min-h-screen">
              {/* Left sidebar — desktop only */}
              <SidebarNav />

              {/* Main content */}
              <main className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-6 lg:pb-6">
                {children}
              </main>

              {/* Right context panel — desktop only */}
              <ContextPanel />
            </div>

            {/* Mobile bottom nav — hidden on desktop */}
            <Navigation />
            <UndoToast />
            <ServiceWorkerRegister />
          </UndoProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
