// components/header.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/lib/AuthProvider"
import { isAuthorizedAdmin } from "@/lib/admin-config"
import { Button } from "@/components/ui/button"
import { ShieldCheck, LayoutDashboard } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { EscalaDoDia } from "@/components/escala-do-dia"
import { AlertaHorasButton } from "@/components/admin/alerta-horas-button"
import { AvisoEdicaoAdmin } from "@/components/aviso-edicao-admin"

export function Header() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [isOnline, setIsOnline] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  const isAdmin = user ? isAuthorizedAdmin(user.uid) : false
  const isOnAdminPage = pathname?.startsWith("/admin")

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    update()
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  const firstName = user?.displayName?.split(" ")[0] ?? ""

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        "border-b bg-card/85 backdrop-blur-xl",
        scrolled
          ? "border-border/60 shadow-sm shadow-black/5"
          : "border-border/30",
        "animate-fade-in"
      )}
      style={{ WebkitBackdropFilter: "blur(20px)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group press-effect focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl p-1 -ml-1 shrink-0"
        >
          <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-sm ring-1 ring-border/50 transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/apple-icon.png"
              alt="JBRICOLAGE"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black tracking-tight text-foreground">
              JBRICOLAGE
            </span>
            <span className="text-[9px] text-muted-foreground/50 font-semibold tracking-widest uppercase">
              Gestão de Obras
            </span>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Escala do dia — só do lado colaborador */}
          {!isOnAdminPage && <EscalaDoDia />}

          {/* Aviso de dias corrigidos pelo admin — só do lado colaborador */}
          {!isOnAdminPage && <AvisoEdicaoAdmin />}

          {/* Divergências de horas — só admin */}
          {isAdmin && <AlertaHorasButton />}

          {/* Greeting — hidden on very small screens */}
          {firstName && (
            <span className="hidden sm:block text-xs font-medium text-muted-foreground/70 mr-1">
              Olá, <span className="text-foreground font-semibold">{firstName}</span>
            </span>
          )}

          {/* Online/offline indicator */}
          <div className={cn(
            "hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold tracking-wide transition-all duration-500",
            isOnline
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isOnline ? "bg-emerald-500 animate-pulse-dot" : "bg-red-500"
            )} />
            <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
          </div>

          {/* Admin button */}
          {isAdmin && (
            <Link href={isOnAdminPage ? "/" : "/admin"}>
              <Button
                variant={isOnAdminPage ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-1.5 h-8 rounded-xl font-semibold text-xs press-effect",
                  !isOnAdminPage && "border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 hover:shadow-sm"
                )}
              >
                {isOnAdminPage ? (
                  <LayoutDashboard className="h-3.5 w-3.5" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
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
