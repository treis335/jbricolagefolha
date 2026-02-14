// app/admin/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import { useRouter } from "next/navigation"

// Views do Admin
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view"
import { AdminCollaboratorsView } from "@/components/admin/admin-collaborators-view"
import { AdminReportsView } from "@/components/admin/admin-reports-view"
import { AdminSettingsView } from "@/components/admin/admin-settings-view"

// Bottom Nav específico para Admin
import { AdminBottomNav, type AdminTabType } from "@/components/admin/admin-bottom-nav"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

// Configuração de admins autorizados
import { isAuthorizedAdmin } from "@/lib/admin-config"

function AdminContent() {
  const [activeTab, setActiveTab] = useState<AdminTabType>("dashboard")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const { isLoading } = useWorkTracker()
  const { user } = useAuth()
  const router = useRouter()

  // 🔒 Verificar permissões de admin
  useEffect(() => {
    // Esperar que o user carregue
    if (!user && !isLoading) {
      // User não está autenticado
      console.log("⛔ Acesso negado: User não autenticado")
      router.push("/")
      return
    }

    if (user) {
      // Verificar se o UID está autorizado
      const authorized = isAuthorizedAdmin(user.uid)
      
      if (!authorized) {
        console.log(`⛔ Acesso negado ao painel admin`)
        console.log(`   UID: ${user.uid}`)
        console.log(`   Email: ${user.email}`)
        router.push("/")
        return
      }

      console.log(`✅ Acesso autorizado ao painel admin`)
      console.log(`   Email: ${user.email}`)
      console.log(`   UID: ${user.uid}`)
      setIsCheckingAuth(false)
    }
  }, [user, isLoading, router])

  // Loading inicial (verificando autenticação)
  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-muted-foreground text-sm">
            A verificar permissões de administrador...
          </p>
        </div>
      </div>
    )
  }

  // Se não houver user (segurança extra)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
                <p className="text-sm text-muted-foreground">
                  Precisa de estar autenticado para aceder ao painel de administração.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar novamente se está autorizado (segurança extra)
  if (!isAuthorizedAdmin(user.uid)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Não tens permissões para aceder ao painel de administração.
                </p>
                <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded">
                  UID: {user.uid.slice(0, 8)}...
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Se achas que isto é um erro, contacta o administrador do sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ User autorizado - mostrar painel admin
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-16">
        {activeTab === "dashboard" && <AdminDashboardView />}
        {activeTab === "collaborators" && <AdminCollaboratorsView />}
        {activeTab === "reports" && <AdminReportsView />}
        {activeTab === "settings" && <AdminSettingsView />}
      </main>

      <AdminBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default function AdminPage() {
  return <AdminContent />
}