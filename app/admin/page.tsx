// app/admin/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import { AdminBottomNav, type AdminTabType } from "@/components/admin/admin-bottom-nav"
import { AdminSideNav } from "@/components/admin/admin-side-nav"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { isAuthorizedAdmin } from "@/lib/admin-config"
import { cn } from "@/lib/utils"

const SkeletonView = () => (
  <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto animate-fade-in">
    <div className="skeleton h-8 w-48 rounded-xl" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
    <div className="skeleton h-64 rounded-2xl" />
    <div className="skeleton h-48 rounded-2xl" />
  </div>
)

const AdminDashboardView     = dynamic(() => import("@/components/admin/admin-dashboard-view").then(m => ({ default: m.AdminDashboardView })), { loading: SkeletonView })
const AdminCollaboratorsView = dynamic(() => import("@/components/admin/admin-collaborators-view").then(m => ({ default: m.AdminCollaboratorsView })), { loading: SkeletonView })
const AdminFinanceView       = dynamic(() => import("@/components/admin/admin-finance-view").then(m => ({ default: m.AdminFinanceView })), { loading: SkeletonView })
const AdminObrasView         = dynamic(() => import("@/components/admin/admin-obras-view").then(m => ({ default: m.AdminObrasView })), { loading: SkeletonView })
const AdminEscalasView       = dynamic(() => import("@/components/admin/admin-escalas-view").then(m => ({ default: m.AdminEscalasView })), { loading: SkeletonView })
const AdminReportsView       = dynamic(() => import("@/components/admin/admin-reports-view").then(m => ({ default: m.AdminReportsView })), { loading: SkeletonView })
const AdminSettingsView      = dynamic(() => import("@/components/admin/admin-settings-view").then(m => ({ default: m.AdminSettingsView })), { loading: SkeletonView })

// Keeps tabs mounted after first visit (no re-fetch)
function AdminTabPane({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [everActive, setEverActive] = useState(active)
  useEffect(() => { if (active) setEverActive(true) }, [active])
  if (!everActive) return null
  return (
    <div style={{
      display: active ? undefined : "none",
      animation: active ? "fade-in-up 0.25s cubic-bezier(0.16,1,0.3,1) both" : "none",
      overflowX: "hidden",
      width: "100%",
    }}>
      {children}
    </div>
  )
}

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
          <p className="text-muted-foreground text-sm">A verificar permissões…</p>
        </div>
      </div>
    )
  }

  if (!user || !isAuthorizedAdmin(user.uid)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/50 rounded-3xl">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
              <p className="text-sm text-muted-foreground">Não tens permissões para aceder ao painel de administração.</p>
            </div>
            <Link href="/"><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" />Voltar</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden w-full">

      {/* Desktop Sidebar */}
      <AdminSideNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 min-w-0 lg:pl-64" style={{overflowX:"hidden", maxWidth:"100%"}}>
        <main className="w-full pb-16 lg:pb-0" style={{overflowX:"hidden", minWidth:0}}>
          <AdminTabPane active={activeTab === "dashboard"}>
            <AdminDashboardView onTabChange={setActiveTab} />
          </AdminTabPane>
          <AdminTabPane active={activeTab === "collaborators"}>
            <AdminCollaboratorsView />
          </AdminTabPane>
          <AdminTabPane active={activeTab === "finance"}>
            <AdminFinanceView />
          </AdminTabPane>
          <AdminTabPane active={activeTab === "obras"}>
            <AdminObrasView />
          </AdminTabPane>
          <AdminTabPane active={activeTab === "escalas"}>
            <AdminEscalasView />
          </AdminTabPane>
          <AdminTabPane active={activeTab === "reports"}>
            <AdminReportsView />
          </AdminTabPane>
          <AdminTabPane active={activeTab === "settings"}>
            <AdminSettingsView />
          </AdminTabPane>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <AdminBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default function AdminPage() {
  return <AdminContent />
}
