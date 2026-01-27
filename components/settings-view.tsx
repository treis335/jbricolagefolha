"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
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
import { 
  Euro, Users, Trash2, Plus, X, HardHat, Info, 
  Download, Upload, CheckCircle2, AlertCircle, Share 
} from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"

// Componente de Instalação PWA (mantido igual)
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
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("focus", checkStandalone)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } else {
      alert(
        "Em ambiente de desenvolvimento (localhost), o prompt automático pode não aparecer.\n\n" +
        "Para instalar manualmente:\n" +
        "1. No Chrome Android → menu ⋮ → 'Adicionar à tela inicial'\n" +
        "2. No iOS Safari → menu Compartilhar → 'Adicionar à Tela de Início'\n\n" +
        "Em produção (URL HTTPS), clica aqui para o prompt automático."
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
            ? "A aplicação já está instalada na tua tela inicial. Para remover, faz long-press no ícone e seleciona 'Remover' ou vai às definições do telemóvel."
            : "Instala a app no teu telemóvel para usar offline, ter ícone próprio e acesso rápido."}
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
            Instalada com sucesso! Abre diretamente da tela inicial 🚀
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SettingsView() {
  const { data, updateSettings, clearAllData } = useWorkTracker()
  const [newTeamMember, setNewTeamMember] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)
  const [textoColado, setTextoColado] = useState("")

  const STORAGE_KEY = "trabalhoDiario"

  const handleTaxaChange = (value: string) => {
    const num = Number(value)
    if (!Number.isNaN(num) && num >= 0) {
      updateSettings({ taxaHoraria: num })
    }
  }

  const addTeamMember = () => {
    if (newTeamMember.trim() && !data.settings.equipaComum.includes(newTeamMember.trim())) {
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

  const exportarDados = async () => {
    const conteudo = localStorage.getItem(STORAGE_KEY)
    if (!conteudo) {
      setSyncMessage("Não existem dados para exportar.")
      setSyncSuccess(false)
      return
    }

    const blob = new Blob([conteudo], { type: "application/json" })
    const file = new File(
      [blob],
      `jbricolage-horas-backup-${new Date().toISOString().split("T")[0]}.json`,
      { type: "application/json" }
    )

    // Tentativa principal: Web Share API
    const shareData = {
      files: [file],
      title: "Backup das Minhas Horas JBricolage",
      text: "Guarda este ficheiro para importar no teu outro telemóvel ou computador.",
    }

    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        setSyncMessage(
          "Partilhado! Envia para ti mesmo via WhatsApp, Telegram, Email...\n" +
          "Depois importa no outro dispositivo nas Definições."
        )
        setSyncSuccess(true)
        return
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Erro ao partilhar:", err)
        }
      }
    }

    // Fallback 1: Copiar para clipboard
    try {
      await navigator.clipboard.writeText(conteudo)
      setSyncMessage(
        "Copiado para a área de transferência!\n\n" +
        "Agora:\n" +
        "1. Cola num chat (WhatsApp/Telegram/Email) e envia para ti mesmo\n" +
        "2. No outro dispositivo: abre a app → Definições → cola no campo abaixo → Importar Texto Colado"
      )
      setSyncSuccess(true)
      return
    } catch (err) {
      console.error("Erro ao copiar texto:", err)
    }

    // Fallback 2: Download normal
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)

    setSyncMessage("Ficheiro de backup descarregado! Procura na pasta Downloads.")
    setSyncSuccess(true)
  }

  const importarDeArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const texto = ev.target?.result as string
        const parsed = JSON.parse(texto)

        if (!parsed || typeof parsed !== "object" ||
            (!("entries" in parsed) && !("payments" in parsed) && !("settings" in parsed))) {
          throw new Error("Formato inválido")
        }

        localStorage.setItem(STORAGE_KEY, texto)
        setSyncMessage("Dados importados com sucesso!\nA página vai recarregar em breve...")
        setSyncSuccess(true)
        setTimeout(() => window.location.reload(), 2200)
      } catch {
        setSyncMessage("Erro: o ficheiro não é um backup válido ou está corrompido.")
        setSyncSuccess(false)
      }
    }
    reader.readAsText(file)
  }

  const importarTextoColado = () => {
    if (!textoColado.trim()) {
      setSyncMessage("Por favor cola o texto JSON primeiro.")
      setSyncSuccess(false)
      return
    }

    try {
      const parsed = JSON.parse(textoColado.trim())

      if (!parsed || typeof parsed !== "object" ||
          (!("entries" in parsed) && !("payments" in parsed) && !("settings" in parsed))) {
        throw new Error("Formato inválido")
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      setSyncMessage("Dados importados do texto com sucesso!\nRecarregando a aplicação...")
      setSyncSuccess(true)
      setTextoColado("") // limpa o campo após sucesso
      setTimeout(() => window.location.reload(), 2200)
    } catch (err) {
      setSyncMessage("Erro: o texto colado não é um JSON válido.\nVerifica se copiaste tudo corretamente.")
      setSyncSuccess(false)
    }
  }

  const totalHoras = data.entries.reduce((sum, e) => sum + e.totalHoras, 0)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-6">
        {/* App Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
            <HardHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">JBricolage - Horas</h1>
          <p className="text-sm text-muted-foreground">Versão 1.0</p>
        </div>

        {/* Hourly Rate */}
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

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Equipa Frequente
            </CardTitle>
            <CardDescription>Adicione nomes para sugestões rápidas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTeamMember}
                onChange={(e) => setNewTeamMember(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTeamMember())}
                placeholder="Nome do membro..."
                className="h-12"
              />
              <Button onClick={addTeamMember} className="h-12 px-4">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            {data.settings.equipaComum.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.settings.equipaComum.map((member) => (
                  <Badge
                    key={member}
                    variant="secondary"
                    className="text-sm py-1.5 px-3 flex items-center gap-1"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum membro adicionado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
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
              <span className="text-muted-foreground">Horas totais registadas</span>
              <span className="font-semibold">{totalHoras}h</span>
            </div>
          </CardContent>
        </Card>

        {/* Backup & Sincronização - ATUALIZADO */}
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" />
              Backup & Sincronização
            </CardTitle>
            <CardDescription>
              Transfere os teus dados entre telemóvel e computador sem servidor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={exportarDados}
                className="h-12"
              >
                <Share className="h-4 w-4 mr-2" />
                Exportar para Mim Mesmo
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

            {/* Importar via texto colado */}
            <div className="space-y-3 pt-4 border-t">
              <Label htmlFor="json-colado">Ou cola aqui o backup recebido:</Label>
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
              <div className={`flex items-start gap-3 p-4 rounded-lg text-sm border ${
                syncSuccess
                  ? "bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-200 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800"
              }`}>
                {syncSuccess ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <span className="whitespace-pre-wrap leading-relaxed">{syncMessage}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Funciona offline. Envia o backup para ti mesmo por WhatsApp, Telegram, Email ou cabo USB.
            </p>
          </CardContent>
        </Card>

        {/* Secção Instalar PWA */}
        <InstallPWAButton />

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
                    Esta ação irá apagar permanentemente todos os registos, pagamentos e definições.
                    Esta ação não pode ser desfeita.
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

        {/* Info Note */}
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Dados guardados localmente</p>
            <p className="mt-1">
              Todos os dados ficam guardados no seu telemóvel. Não é necessária internet.
            </p>
          </div>
        </div>

        {/* Credits */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Desenvolvido por JoelReis</p>
        </div>
      </div>
    </ScrollArea>
  )
}