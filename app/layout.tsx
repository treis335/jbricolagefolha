////app/layout.tsx
import React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import "./globals.css"
import { Header } from "@/components/header"

import { WorkTrackerProvider } from "@/lib/work-tracker-context"
import { AuthProvider } from "@/lib/AuthProvider"

const geist = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b5998",
}

export const metadata: Metadata = {
  title: "JBricolage - Horas",
  description: "App para registo de horas, equipa e materiais",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-PT">
      {/* Adicione aqui o <head> com o CSS do Leaflet via CDN */}
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>

      <body className={`${geist.className} antialiased`}>
        <AuthProvider>
          <WorkTrackerProvider>
            <Header />
            <div className="pt-16">{children}</div>
            <Analytics />
          </WorkTrackerProvider>
        </AuthProvider>
      </body>
    </html>
  )
}