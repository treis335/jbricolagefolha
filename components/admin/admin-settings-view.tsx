// components/admin/admin-settings-view.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, Shield, Database, LogOut, ChevronRight, Bell, Lock, Building2, HardDrive } from "lucide-react"
import { useAuth } from "@/lib/AuthProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FirebaseExportButton } from "@/components/admin/FirebaseExportButton"

export function AdminSettingsView() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      alert("Sessão terminada com sucesso!")
    } catch (err) {
      console.error(err)
      alert("Erro ao terminar a sessão.")
    }
  }

  const futureFeatures = [
    { icon: <Building2 className="h-4 w-4" />, label: "Configurações da empresa", desc: "Dados e informações organizacionais" },
    { icon: <Lock className="h-4 w-4" />, label: "Permissões de utilizadores", desc: "Gestão de acessos e funções" },
    { icon: <Bell className="h-4 w-4" />, label: "Notificações e alertas", desc: "Configurar alertas automáticos" },
    { icon: <HardDrive className="h-4 w-4" />, label: "Backup automático", desc: "Cópias de segurança dos dados" },
    
  ]

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 md:p-8 md:pb-12 space-y-8 max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl border border-primary/20">
            <Settings className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Definições</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configurações do painel de administração</p>
          </div>
        </div>

        {/* ── Desktop: 2-column layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Admin Account Card */}
          <Card className="md:row-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Conta de Administrador
              </CardTitle>
              <CardDescription>Informações da sua sessão atual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar placeholder */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 text-primary font-bold text-xl shrink-0">
                  {(user?.displayName || user?.email || "A")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {user?.displayName || user?.email?.split("@")[0] || "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || "—"}</p>
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    <Shield className="h-2.5 w-2.5 mr-1" />
                    Administrador
                  </Badge>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-1">
                {[
                  { label: "Nome", value: user?.displayName || user?.email?.split("@")[0] || "Admin" },
                  { label: "Email", value: user?.email || "—" },
                  { label: "Tipo de Conta", value: "Administrador" },
                  { label: "Estado", value: "Sessão ativa" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2.5 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium truncate max-w-[55%] text-right">{item.value}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Terminar Sessão
              </Button>
            </CardContent>
          </Card>

          {/* System Info Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Sistema
              </CardTitle>
              <CardDescription>Informações técnicas da aplicação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: "Versão", value: "1.0.0", badge: "Admin" },
                { label: "Base de Dados", value: "Firebase Firestore" },
                { label: "Ambiente", value: "Produção", highlight: true },
                { label: "Autenticação", value: "Firebase Auth" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2.5 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <Badge variant="outline" className="text-xs">{item.badge}</Badge>
                    )}
                    <span className={`text-sm font-medium ${item.highlight ? "text-green-600 dark:text-green-400" : ""}`}>
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Future Features Card */}
          <Card>

            <FirebaseExportButton />
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Funcionalidades Futuras
              </CardTitle>
              <CardDescription>Em desenvolvimento — brevemente disponíveis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {futureFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-3 py-2.5 border-b last:border-0 opacity-60 cursor-not-allowed"
                >
                  <div className="p-1.5 bg-muted rounded-lg text-muted-foreground shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">Brevemente</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </ScrollArea>
  )
}