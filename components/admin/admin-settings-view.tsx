// components/admin/admin-settings-view.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, Shield, User, Database } from "lucide-react"
import { useAuth } from "@/lib/AuthProvider"
import { Button } from "@/components/ui/button"

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

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Definições Admin</h1>
          <p className="text-sm text-muted-foreground">
            Configurações do painel
          </p>
        </div>

        {/* Admin Info */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Informação da Conta Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nome</p>
                <p className="font-medium">
                  {user?.displayName || user?.email?.split('@')[0] || "Admin"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-medium break-all">{user?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tipo de Conta</p>
                <p className="font-medium text-primary">Administrador</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
              Terminar Sessão
            </Button>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Versão:</span>
              <span className="font-medium">1.0.0 (Admin)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base de Dados:</span>
              <span className="font-medium">Firebase</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Modo:</span>
              <span className="font-medium">Produção</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funcionalidades Futuras</CardTitle>
            <CardDescription>
              Em desenvolvimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">• Configurações da empresa</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">• Permissões de utilizadores</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">• Notificações e alertas</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">• Backup automático</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}