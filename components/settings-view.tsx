//settings-view

"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Euro, Users, Trash2, HardHat, Info, Download, Upload, CheckCircle2, AlertCircle, Share, User, Lock } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import { MigrateLegacyDataButton } from "@/components/MigrateLegacyDataButton"
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


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
  const [username, setUsername] = useState<string>("");
  const [loadingUsername, setLoadingUsername] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [textoColado, setTextoColado] = useState("")
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)

  // Carrega o username do Firestore quando o user estiver disponível
  useEffect(() => {
    if (!user?.uid) {
      setLoadingUsername(false);
      return;
    }

    const fetchUsername = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          // Usa o campo 'username' que criaste no AuthProvider
          setUsername(data?.username || "");
        }
      } catch (err) {
        console.error("Erro ao carregar username:", err);
      } finally {
        setLoadingUsername(false);
      }
    };

    fetchUsername();
  }, [user?.uid]);

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  const handleSaveUsername = async () => {
    if (!user?.uid || !editedUsername.trim()) return;

    setSavingUsername(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { username: editedUsername.trim() }, { merge: true });

      setUsername(editedUsername.trim());
      setIsEditingUsername(false);
      alert("Nome atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao guardar username:", err);
      alert("Erro ao guardar o nome. Tenta novamente.");
    } finally {
      setSavingUsername(false);
    }
  };


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

  // ❌ REMOVIDO: handleTaxaChange - colaborador não pode mais editar

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

  const totalHoras = data.entries.reduce((sum, e) => sum + e.totalHoras, 0)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
            <HardHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">JBricolage - Settings</h1>
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
          <CardContent className="space-y-6">
            {user ? (
              <div className="space-y-6">
                <div className="p-5 bg-primary/5 rounded-lg border border-primary/20 space-y-5 text-sm">
                  {/* Nome / Utilizador - com edição */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-muted-foreground font-medium">Nome / Utilizador</p>
                      {!isEditingUsername && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setIsEditingUsername(true);
                            setEditedUsername(username || user.displayName || user.email?.split('@')[0] || "");
                          }}
                        >
                          Editar
                        </Button>
                      )}
                    </div>

                    {isEditingUsername ? (
                      <div className="space-y-3">
                        <Input
                          value={editedUsername}
                          onChange={(e) => setEditedUsername(e.target.value)}
                          placeholder="Nome visível na app"
                          className="bg-background"
                          autoFocus
                          disabled={savingUsername}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={handleSaveUsername}
                            disabled={savingUsername || !editedUsername.trim()}
                          >
                            {savingUsername ? "A guardar..." : "Guardar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setIsEditingUsername(false);
                              setEditedUsername("");
                            }}
                            disabled={savingUsername}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold">
                        {loadingUsername
                          ? "A carregar..."
                          : username || user.displayName || user.email?.split('@')[0] || "Utilizador"}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <p className="text-muted-foreground mb-1 font-medium">Email da conta</p>
                    <p className="font-medium break-all">
                      {user.email || "—"}
                    </p>
                  </div>

                  {/* UID abreviado */}
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">ID da conta (UID)</p>
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono bg-background/60 px-3 py-1.5 rounded border border-border/40 break-all flex-1">
                        {user.uid.slice(0, 4)}....{user.uid.slice(-2)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(user.uid);
                          alert("UID completo copiado!");
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-copy"
                        >
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </Button>
                    </div>
                  </div>
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
              <p className="text-sm text-muted-foreground text-center py-4">
                Não estás autenticado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Taxa horária - APENAS LEITURA */}
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              A Tua Taxa Horária
            </CardTitle>
            <CardDescription>
              Definida pela gestão da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display da taxa - Read Only */}
            <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">
                    Taxa Atual
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {data.settings.taxaHoraria.toFixed(2)} €/h
                  </p>
                </div>
                <div className="p-3 bg-background/60 rounded-full">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-900 dark:text-blue-200">
                A tua taxa horária é definida pela gestão. Se tiveres dúvidas sobre o valor, contacta o teu supervisor.
              </p>
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
                className={`flex items-start gap-3 p-4 rounded-lg text-sm border ${syncSuccess
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