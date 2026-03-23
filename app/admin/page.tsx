// app/admin/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import { useRouter } from "next/navigation"

import { AdminDashboardView }     from "@/components/admin/admin-dashboard-view"
import { AdminCollaboratorsView } from "@/components/admin/admin-collaborators-view"
import { AdminFinanceView }       from "@/components/admin/admin-finance-view"
import { AdminObrasView }         from "@/components/admin/admin-obras-view"
import { AdminReportsView }       from "@/components/admin/admin-reports-view"
import { AdminSettingsView }      from "@/components/admin/admin-settings-view"
import { AdminBottomNav, type AdminTabType } from "@/components/admin/admin-bottom-nav"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"
import { isAuthorizedAdmin } from "@/lib/admin-config"

function AdminContent() {
  const [activeTab, setActiveTab] = useState<AdminTabType>("dashboard")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const { isLoading } = useWorkTracker()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user && !isLoading) { router.push("/"); return }
    if (user) {
      if (!isAuthorizedAdmin(user.uid)) { router.push("/"); return }
      setIsCheckingAuth(false)
    }
  }, [user, isLoading, router])

  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-muted-foreground text-sm">A verificar permissões de administrador...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAuthorizedAdmin(user.uid)) {
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
                <p className="text-sm text-muted-foreground">
                  Não tens permissões para aceder ao painel de administração.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-16">
        {activeTab === "dashboard"     && <AdminDashboardView />}
        {activeTab === "collaborators" && <AdminCollaboratorsView />}
        {activeTab === "finance"       && <AdminFinanceView />}
        {activeTab === "obras"         && <AdminObrasView />}
        {activeTab === "reports"       && <AdminReportsView />}
        {activeTab === "settings"      && <AdminSettingsView />}
      </main>
      <AdminBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default function AdminPage() {
  return <AdminContent />
}