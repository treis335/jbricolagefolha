//settings-view

"use client"

import { useState, useEffect, useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Euro,
  Users,
  Trash2,
  HardHat,
  Info,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Share,
  User,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import { MigrateLegacyDataButton } from "@/components/MigrateLegacyDataButton"

// PWA install button
function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const checkStandalone = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true)
      }
    }
    checkStandalone()

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("focus", checkStandalone)
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("focus", checkStandalone)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") setIsInstalled(true)
      setDeferredPrompt(null)
    } else {
      alert(
        "Em desenvolvimento (localhost) o prompt pode não aparecer. Para instalar manualmente, usa o menu do navegador."
      )
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {isInstalled ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isInstalled ? "App Já Instalada" : "Instalar Aplicação"}
        </CardTitle>
        <CardDescription>
          {isInstalled
            ? "A aplicação já está instalada na tua tela inicial."
            : "Instala a app no teu telemóvel para usar offline e com ícone próprio."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isInstalled ? (
          <Button
            onClick={handleInstallClick}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Download className="h-5 w-5 mr-2" />
            Instalar agora
          </Button>
        ) : (
          <div className="text-center py-2 text-sm text-green-600 font-medium">
            Instalada com sucesso! 🚀
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SettingsView() {
  const { data, updateSettings, clearAllData, importData } = useWorkTracker()
  const { user, logout } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [textoColado, setTextoColado] = useState("")
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)

  // ✅ REMOVIDO: STORAGE_KEY já não é necessário

  // --- LOGOUT HANDLER ---
  const handleLogout = async () => {
    try {
      await logout()
      alert("Sessão terminada com sucesso!")
    } catch (err) {
      console.error(err)
      alert("Erro ao terminar a sessão. Tenta novamente.")
    }
  }

  // --- Taxa horária ---
  const handleTaxaChange = (value: string) => {
    const num = Number(value)
    if (!Number.isNaN(num) && num >= 0) {
      updateSettings({ taxaHoraria: num })
    }
  }

  // --- Adicionar/Remover membros da equipa ---
  const [newTeamMember, setNewTeamMember] = useState("")
  const addTeamMember = () => {
    if (
      newTeamMember.trim() &&
      !data.settings.equipaComum.includes(newTeamMember.trim())
    ) {
      updateSettings({
        equipaComum: [...data.settings.equipaComum, newTeamMember.trim()],
      })
      setNewTeamMember("")
    }
  }
  const removeTeamMember = (member: string) => {
    updateSettings({
      equipaComum: data.settings.equipaComum.filter((m) => m !== member),
    })
  }

  // --- Backup & Import ---
  const exportarDados = async () => {
    // Exporta os dados do state atual (que vem do Firebase)
    const conteudo = JSON.stringify(data)
    if (!conteudo) {
      setSyncMessage("Não existem dados para exportar.")
      setSyncSuccess(false)
      return
    }

    const blob = new Blob([conteudo], { type: "application/json" })
    const file = new File(
      [blob],
      `jbricolage-horas-backup-${new Date()
        .toISOString()
        .split("T")[0]}.json`,
      { type: "application/json" }
    )

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Backup JBricolage" })
        setSyncMessage("Partilhado com sucesso!")
        setSyncSuccess(true)
        return
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err)
      }
    }

    try {
      await navigator.clipboard.writeText(conteudo)
      setSyncMessage(
        "Copiado para área de transferência! Agora cola no outro dispositivo."
      )
      setSyncSuccess(true)
      return
    } catch (err) {
      console.error(err)
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
    setSyncMessage("Ficheiro de backup descarregado!")
    setSyncSuccess(true)
  }

  const importarDeArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        importData(parsed) // Atualiza state e Firebase
        setSyncMessage("Dados importados com sucesso!")
        setSyncSuccess(true)
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        setSyncMessage("Erro: ficheiro inválido.")
        setSyncSuccess(false)
      }
    }
    reader.readAsText(file)
  }

  const importarTextoColado = () => {
    if (!textoColado.trim()) {
      setSyncMessage("Por favor cola o JSON primeiro.")
      setSyncSuccess(false)
      return
    }

    try {
      const parsed = JSON.parse(textoColado.trim())
      importData(parsed) // Atualiza state e Firebase
      setSyncMessage("Dados importados com sucesso!")
      setSyncSuccess(true)
      setTextoColado("")
      setTimeout(() => window.location.reload(), 1000)
    } catch {
      setSyncMessage("JSON inválido.")
      setSyncSuccess(false)
    }
  }

  // ✅ REMOVIDO: clearLocalStorage - já não faz sentido com Firebase

  const totalHoras = data.entries.reduce((sum, e) => sum + e.totalHoras, 0)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
            <HardHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">JBricolage - Horas</h1>
          <p className="text-sm text-muted-foreground">Versão 1.0</p>
        </div>

        {/* Quem sou eu? / Logout */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Quem sou eu?
            </CardTitle>
            <CardDescription>
              Informação da tua conta atual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">
                    Utilizador atual
                  </p>
                  <p className="text-xl font-medium">
                    {user.displayName || user.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full"
                >
                  Terminar Sessão
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Não estás autenticado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Taxa horária */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Taxa Horária Única
            </CardTitle>
            <CardDescription>
              Defina a taxa para todas as horas (normais e extras)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxaHoraria">Taxa Horária (€/h)</Label>
              <Input
                id="taxaHoraria"
                type="number"
                value={data.settings.taxaHoraria}
                onChange={(e) => handleTaxaChange(e.target.value)}
                min={0}
                step={0.5}
                className="h-12 text-lg"
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                O valor é calculado automaticamente: Total Horas × Taxa Horária
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Total de registos</span>
              <span className="font-semibold">{data.entries.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Total de pagamentos</span>
              <span className="font-semibold">{data.payments.length}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">
                Horas totais registadas
              </span>
              <span className="font-semibold">{totalHoras}h</span>
            </div>
          </CardContent>
        </Card>

        {/* Backup & Import */}
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" />
              Backup & Sincronização
            </CardTitle>
            <CardDescription>
              Transfere os teus dados entre dispositivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={exportarDados} className="h-12">
                <Share className="h-4 w-4 mr-2" />
                Exportar Dados
              </Button>

              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={importarDeArquivo}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-12"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar de Ficheiro
              </Button>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label htmlFor="json-colado">
                Ou cola aqui o backup recebido:
              </Label>
              <Textarea
                id="json-colado"
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
                placeholder='Cole o JSON completo aqui (ex: {"entries":[...],"payments":[...],"settings":{...}})'
                className="min-h-[140px] font-mono text-sm resize-y"
              />
              <Button
                onClick={importarTextoColado}
                disabled={!textoColado.trim()}
                className="w-full sm:w-auto"
              >
                Importar Texto Colado
              </Button>
            </div>

            {syncMessage && (
              <div
                className={`flex items-start gap-3 p-4 rounded-lg text-sm border ${
                  syncSuccess
                    ? "bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-200 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800"
                }`}
              >
                {syncSuccess ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <span className="whitespace-pre-wrap leading-relaxed">
                  {syncMessage}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PWA & Migration */}
        <InstallPWAButton />
        <MigrateLegacyDataButton />

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>Ações irreversíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12">
                  Limpar Todos os Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá apagar permanentemente todos os registos,
                    pagamentos e definições. Não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, Apagar Tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
