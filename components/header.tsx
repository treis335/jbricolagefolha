// components/header.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/lib/AuthProvider"
import { isAuthorizedAdmin } from "@/lib/admin-config"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"
import { usePathname } from "next/navigation"

export function Header() {
  const { user } = useAuth()
  const pathname = usePathname()
  
  // Verificar se o user atual é admin
  const isAdmin = user ? isAuthorizedAdmin(user.uid) : false
  
  // Verificar se já está na página admin
  const isOnAdminPage = pathname?.startsWith("/admin")

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logotipo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image
              src="/icon-dark-32x32.png"
              alt="JBricolage Horas"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-bold text-primary">
            Folha de Serviços
          </span>
        </Link>

        {/* Área direita - Botão Admin (apenas para admins autorizados) */}
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link href={isOnAdminPage ? "/" : "/admin"}>
              <Button 
                variant={isOnAdminPage ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isOnAdminPage ? "App" : "Admin"}
                </span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}