////app/layout.tsx
import React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import "./globals.css"
import { Header } from "@/components/header"

import { WorkTrackerProvider } from "@/lib/work-tracker-context"
import { AuthProvider } from "@/lib/AuthProvider"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f0f14" },
  ],
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "JBricolage - Horas",
  description: "App para registo de horas, equipa e materiais",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JBricolage",
  },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png",  media: "(prefers-color-scheme: dark)"  },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geist.className} antialiased`}>
        <AuthProvider>
          <WorkTrackerProvider>
            {/* Header: mobile only (lg+ usa a sidebar) */}
            <div className="lg:hidden">
              <Header />
            </div>
            {/* Top padding only on mobile (header height) */}
            <div className="lg:pt-0 pt-16">
              {children}
            </div>
            <Analytics />
            {/* Force SW update + clear old caches for all users */}
            <script dangerouslySetInnerHTML={{ __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => {
                  regs.forEach(reg => {
                    reg.update();
                  });
                });
                caches.keys().then(keys => {
                  keys.forEach(key => {
                    if (!key.includes('v3')) {
                      caches.delete(key);
                    }
                  });
                });
              }
            ` }} />
          </WorkTrackerProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
