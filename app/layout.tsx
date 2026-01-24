import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Header } from '@/components/header'  // ← Importa o novo componente Header

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b5998',
}

export const metadata: Metadata = {
  title: 'JBricolage - Horas ',
  description: 'App para registo de horas, equipa e materiais',
  generator: 'v1',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-PT">
      <body className={`font-sans antialiased`}>
        <Header />  {/* ← Barra fixa no topo com logotipo */}

        {/* Conteúdo principal com padding para não sobrepor o header */}
        <div className="pt-16">
          {children}
        </div>

        <Analytics />
      </body>
    </html>
  )
}