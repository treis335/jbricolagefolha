//settings-view.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Euro, Trash2, HardHat, Info, Download, Upload,
  CheckCircle2, AlertCircle, Share, User, Lock,
  LogOut, Pencil, X, Check, Copy, Smartphone,
  ShieldAlert, DatabaseBackup, ChevronRight,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import { MigrateLegacyDataButton } from "@/components/MigrateLegacyDataButton"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"

// ── PWA Install ──────────────────────────────────────────────────────────────
function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const check = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true)
    }
    check()
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("focus", check)
    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("focus", check)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") setIsInstalled(true)
      setDeferredPrompt(null)
    } else {
      alert("Para instalar, usa o menu do navegador.")
    }
  }

  return (
    <Section icon={<Smartphone className="h-5 w-5" />} iconColor="text-violet-600 dark:text-violet-400" iconBg="bg-violet-100 dark:bg-violet-950/50" title="Instalar App">
      {isInstalled ? (
        <Row>
          <div className="flex items-center gap-3 py-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Aplicação já instalada</span>
          </div>
        </Row>
      ) : (
        <Row>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Instalar no dispositivo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Acesso rápido e modo offline</p>
          </div>
          <Button size="sm" onClick={handleInstall} className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white h-9 px-4">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Instalar
          </Button>
        </Row>
      )}
    </Section>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function SettingsView() {
  const { data, clearAllData, importData } = useWorkTracker()
  const { user, logout } = useAuth()
  const [username, setUsername] = useState("")
  const [loadingUsername, setLoadingUsername] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [textoColado, setTextoColado] = useState("")
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [editedUsername, setEditedUsername] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)
  const [copiedUid, setCopiedUid] = useState(false)

  useEffect(() => {
    if (!user?.uid) { setLoadingUsername(false); return }
    getDoc(doc(db, "users", user.uid))
      .then((snap) => { if (snap.exists()) setUsername(snap.data()?.username || "") })
      .catch(console.error)
      .finally(() => setLoadingUsername(false))
  }, [user?.uid])

  const handleSaveUsername = async () => {
    if (!user?.uid || !editedUsername.trim()) return
    setSavingUsername(true)
    try {
      await setDoc(doc(db, "users", user.uid), { username: editedUsername.trim() }, { merge: true })
      setUsername(editedUsername.trim())
      setIsEditingUsername(false)
    } catch { alert("Erro ao guardar o nome.") }
    finally { setSavingUsername(false) }
  }

  const handleCopyUid = () => {
    if (!user?.uid) return
    navigator.clipboard.writeText(user.uid)
    setCopiedUid(true)
    setTimeout(() => setCopiedUid(false), 2000)
  }

  const handleLogout = async () => {
    try { await logout() } catch { alert("Erro ao terminar a sessão.") }
  }

  const exportarDados = async () => {
    const conteudo = JSON.stringify(data)
    if (!conteudo) { setSyncMessage("Não há dados para exportar."); setSyncSuccess(false); return }
    const blob = new Blob([conteudo], { type: "application/json" })
    const file = new File([blob], `jbricolage-backup-${new Date().toISOString().split("T")[0]}.json`, { type: "application/json" })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Backup JBricolage" }); setSyncMessage("Partilhado!"); setSyncSuccess(true); return }
      catch (e: any) { if (e.name !== "AbortError") console.error(e) }
    }
    try { await navigator.clipboard.writeText(conteudo); setSyncMessage("Copiado para a área de transferência!"); setSyncSuccess(true); return } catch {}
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url)
    setSyncMessage("Ficheiro descarregado!"); setSyncSuccess(true)
  }

  const importarDeArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try { importData(JSON.parse(ev.target?.result as string)); setSyncMessage("Importado com sucesso!"); setSyncSuccess(true); setTimeout(() => window.location.reload(), 1000) }
      catch { setSyncMessage("Ficheiro inválido."); setSyncSuccess(false) }
    }
    reader.readAsText(file)
  }

  const importarTextoColado = () => {
    if (!textoColado.trim()) { setSyncMessage("Cola o JSON primeiro."); setSyncSuccess(false); return }
    try { importData(JSON.parse(textoColado.trim())); setSyncMessage("Importado com sucesso!"); setSyncSuccess(true); setTextoColado(""); setTimeout(() => window.location.reload(), 1000) }
    catch { setSyncMessage("JSON inválido."); setSyncSuccess(false) }
  }

  const displayName = loadingUsername
    ? "A carregar..."
    : username || user?.displayName || user?.email?.split("@")[0] || "Utilizador"

  return (
    <ScrollArea className="h-full bg-muted/20">
      <div className="pb-28 md:pb-16 max-w-xl mx-auto">

        {/* ── Hero header ── */}
        <div className="bg-card border-b px-5 pt-8 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <HardHat className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Definições</h1>
              <p className="text-sm text-muted-foreground mt-0.5">JBricolage · v1.0</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 pt-4">

          {/* ── Account section ── */}
          <Section
            icon={<User className="h-5 w-5" />}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-950/50"
            title="A minha conta"
          >
            {user ? (
              <>
                {/* Name */}
                <Row>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">Nome</p>
                    {isEditingUsername ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={editedUsername}
                          onChange={(e) => setEditedUsername(e.target.value)}
                          placeholder="O teu nome"
                          className="h-9 text-sm flex-1"
                          autoFocus
                          disabled={savingUsername}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveUsername()}
                        />
                        <Button size="icon" className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveUsername} disabled={savingUsername || !editedUsername.trim()}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setIsEditingUsername(false)} disabled={savingUsername}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold truncate">{displayName}</p>
                    )}
                  </div>
                  {!isEditingUsername && (
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0"
                      onClick={() => { setIsEditingUsername(true); setEditedUsername(username || user.displayName || user.email?.split("@")[0] || "") }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </Row>

                <Divider />

                {/* Email */}
                <Row>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">Email</p>
                    <p className="text-sm font-medium truncate">{user.email || "—"}</p>
                  </div>
                </Row>

                <Divider />

                {/* UID */}
                <Row>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">ID da conta</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {user.uid.slice(0, 8)}…{user.uid.slice(-4)}
                    </p>
                  </div>
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0"
                    onClick={handleCopyUid}
                  >
                    {copiedUid
                      ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                      : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </button>
                </Row>

                <Divider />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors active:scale-[0.99]"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Terminar sessão
                  <ChevronRight className="h-4 w-4 ml-auto opacity-40" />
                </button>
              </>
            ) : (
              <Row>
                <p className="text-sm text-muted-foreground py-2">Não estás autenticado.</p>
              </Row>
            )}
          </Section>

          {/* ── Hourly rate (read-only) ── */}
          <Section
            icon={<Euro className="h-5 w-5" />}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-950/50"
            title="Taxa Horária"
          >
            <Row>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">Taxa atual</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {data.settings.taxaHoraria.toFixed(2)} €
                  <span className="text-sm font-normal text-muted-foreground ml-0.5">/h</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4 text-muted-foreground/60" />
              </div>
            </Row>

            <div className="mx-4 mb-3">
              <div className="flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Definida pela gestão. Contacta o supervisor se tiveres dúvidas.</span>
              </div>
            </div>
          </Section>

          {/* ── Backup & Sync ── */}
          <Section
            icon={<DatabaseBackup className="h-5 w-5" />}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-100 dark:bg-amber-950/50"
            title="Backup & Sincronização"
          >
            {/* Export */}
            <button onClick={exportarDados} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-muted/60 transition-colors active:scale-[0.99]">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <Share className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Exportar dados</p>
                <p className="text-xs text-muted-foreground">Partilhar ou guardar backup</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </button>

            <Divider />

            {/* Import from file */}
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-muted/60 transition-colors active:scale-[0.99]">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Importar de ficheiro</p>
                <p className="text-xs text-muted-foreground">Carregar backup .json</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={importarDeArquivo} className="hidden" />

            {/* Paste JSON */}
            <div className="px-4 pb-4 pt-2 border-t border-border/40 space-y-3 mt-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Ou cola o JSON de backup:</p>
              <Textarea
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
                placeholder='{"entries":[...],"payments":[...],...}'
                className="min-h-[90px] font-mono text-xs resize-none bg-muted/30 border-border/50"
              />
              <Button
                onClick={importarTextoColado}
                disabled={!textoColado.trim()}
                variant="secondary"
                className="w-full h-10"
              >
                Importar texto colado
              </Button>
            </div>

            {/* Status */}
            {syncMessage && (
              <div className={cn(
                "mx-4 mb-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-sm border",
                syncSuccess
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200/60 dark:border-emerald-800/60"
                  : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200/60 dark:border-red-800/60"
              )}>
                {syncSuccess
                  ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                  : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                }
                <span className="leading-snug">{syncMessage}</span>
              </div>
            )}
          </Section>

          {/* ── PWA & Migration ── */}
          <InstallPWAButton />
          <MigrateLegacyDataButton />

          {/* ── Danger zone ── */}
          <Section
            icon={<ShieldAlert className="h-5 w-5" />}
            iconColor="text-red-600 dark:text-red-400"
            iconBg="bg-red-100 dark:bg-red-950/50"
            title="Zona de Perigo"
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors active:scale-[0.99]">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                    <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Limpar todos os dados</p>
                    <p className="text-xs text-muted-foreground">Apaga registos, pagamentos e definições</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-400/50 shrink-0" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] rounded-2xl">
                <AlertDialogHeader>
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/40 mx-auto mb-2">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <AlertDialogTitle className="text-center text-lg">Tens a certeza?</AlertDialogTitle>
                  <AlertDialogDescription className="text-center">
                    Todos os registos, pagamentos e definições serão apagados permanentemente. <strong>Esta ação não pode ser desfeita.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-3 mt-2">
                  <AlertDialogCancel className="flex-1 h-11 rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllData} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white">
                    Apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Section>

        </div>
      </div>
    </ScrollArea>
  )
}

// ── UI Primitives ─────────────────────────────────────────────────────────────

function Section({
  icon, iconColor, iconBg, title, children,
}: {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="text-sm font-bold">{title}</p>
      </div>
      {/* Body */}
      <div className="divide-y divide-border/30">
        {children}
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border/30 mx-4" />
}