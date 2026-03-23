"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Euro, Info, Download, Upload,
  CheckCircle2, AlertCircle, Share, User, Lock,
  LogOut, Pencil, X, Check, Copy, Smartphone,
  DatabaseBackup, ChevronRight,
  Phone, CreditCard, Camera, Building2,
  Hash, Loader2, Zap, ZapOff, Settings2, ImageIcon,
} from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import { MigrateLegacyDataButton } from "@/components/MigrateLegacyDataButton"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { uploadFotoObra } from "@/lib/obras-service"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  username: string
  telemovel: string
  banco: string
  iban: string
  mbwayAtivo: boolean
  fotoUrl: string
}

const PROFILE_DEFAULTS: UserProfile = {
  username: "",
  telemovel: "",
  banco: "",
  iban: "",
  mbwayAtivo: false,
  fotoUrl: "",
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ fotoUrl, nome, size = "lg" }: { fotoUrl: string; nome: string; size?: "sm" | "lg" }) {
  const initials = nome.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
  const dim = size === "lg" ? "w-20 h-20" : "w-10 h-10"
  const text = size === "lg" ? "text-2xl" : "text-base"

  if (fotoUrl) {
    return (
      <img
        key={fotoUrl}
        src={fotoUrl}
        alt={nome}
        className={cn(dim, "rounded-3xl object-cover ring-2 ring-white/10 shadow-xl")}
      />
    )
  }
  return (
    <div className={cn(
      dim, text,
      "rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-xl ring-2 ring-white/10"
    )}>
      {initials || <User className="h-6 w-6 opacity-80" />}
    </div>
  )
}

// ── PWA Install ───────────────────────────────────────────────────────────────

function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const check = () => { if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true) }
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
    <Card icon={<Smartphone className="h-4.5 w-4.5" />} gradient="from-violet-500 to-purple-600" title="Instalar App">
      {isInstalled ? (
        <RowItem>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Aplicação instalada</p>
              <p className="text-xs text-muted-foreground">A correr em modo standalone</p>
            </div>
          </div>
        </RowItem>
      ) : (
        <RowItem>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Instalar no dispositivo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Acesso rápido e modo offline</p>
          </div>
          <Button
            size="sm"
            onClick={handleInstall}
            className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white h-9 px-4 rounded-xl shadow-sm shadow-violet-500/30"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />Instalar
          </Button>
        </RowItem>
      )}
    </Card>
  )
}

// ── Editable Field ────────────────────────────────────────────────────────────

function EditableField({
  label, value, placeholder, type = "text", icon, onSave, sensitive,
}: {
  label: string; value: string; placeholder: string; type?: string
  icon?: React.ReactNode; onSave: (v: string) => Promise<void>; sensitive?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  const handleSave = async () => {
    setSaving(true); await onSave(draft.trim()); setSaving(false); setEditing(false)
  }

  const masked = sensitive && value && !editing
    ? value.slice(0, 4) + " ···· ···· " + value.slice(-4)
    : value

  return (
    <div className="px-4 py-3.5">
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 font-bold mb-2">
        {icon && <span className="opacity-50">{icon}</span>}
        {label}
      </label>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            type={type}
            className="h-10 text-sm flex-1 bg-muted/40 border-border/40 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500"
            disabled={saving}
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter") handleSave()
              if (e.key === "Escape") { setEditing(false); setDraft(value) }
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-50 shadow-sm shadow-emerald-500/30 active:scale-95"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { setEditing(false); setDraft(value) }}
            disabled={saving}
            className="w-10 h-10 rounded-xl border border-border/40 hover:bg-muted text-muted-foreground flex items-center justify-center transition-all shrink-0 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 group">
          <p className={cn(
            "text-sm font-medium truncate transition-colors",
            !value && "text-muted-foreground/35 italic font-normal"
          )}>
            {masked || placeholder}
          </p>
          <button
            onClick={() => { setEditing(true); setDraft(value) }}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center transition-all shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── MBway Toggle ──────────────────────────────────────────────────────────────

function MBwayToggle({
  enabled, telemovel, iban, onToggle,
}: {
  enabled: boolean; telemovel: string; iban: string; onToggle: (v: boolean) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const canEnable = !!telemovel && !!iban

  const handleToggle = async () => {
    if (!canEnable && !enabled) return
    setSaving(true); await onToggle(!enabled); setSaving(false)
  }

  return (
    <div className="px-4 py-4">
      <div className={cn(
        "rounded-2xl border p-4 transition-all duration-300",
        enabled
          ? "bg-gradient-to-br from-blue-500/8 to-indigo-500/8 border-blue-400/30"
          : "bg-muted/30 border-border/30"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
              enabled ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30" : "bg-muted"
            )}>
              {enabled
                ? <Zap className="h-4.5 w-4.5 text-white" />
                : <ZapOff className="h-4.5 w-4.5 text-muted-foreground/50" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">MBway</p>
              <p className="text-xs text-muted-foreground truncate">
                {enabled && telemovel
                  ? `Ativo · ${telemovel}`
                  : !canEnable ? "Preenche o IBAN e telemovel" : "Desativado"
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving || (!canEnable && !enabled)}
            className={cn(
              "relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              enabled ? "bg-blue-500 shadow-md shadow-blue-500/40" : "bg-muted-foreground/20"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300",
              enabled ? "left-6.5" : "left-0.5"
            )}>
              {saving && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-2.5 w-2.5 text-muted-foreground animate-spin" />
                </span>
              )}
            </span>
          </button>
        </div>

        {enabled && (
          <div className="mt-3 pt-3 border-t border-blue-400/20 grid grid-cols-2 gap-2">
            <div className="bg-white/50 dark:bg-white/5 rounded-xl px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-0.5">Número</p>
              <p className="text-xs font-semibold truncate">{telemovel || "—"}</p>
            </div>
            <div className="bg-white/50 dark:bg-white/5 rounded-xl px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-0.5">IBAN</p>
              <p className="text-xs font-semibold truncate font-mono">
                {iban ? iban.slice(0, 6) + "···" + iban.slice(-4) : "—"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SettingsView() {
  const { data, importData } = useWorkTracker()
  const { user, logout } = useAuth()

  const [profile, setProfile] = useState<UserProfile>(PROFILE_DEFAULTS)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [editedUsername, setEditedUsername] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)
  const [copiedUid, setCopiedUid] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [textoColado, setTextoColado] = useState("")
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)

  // ── Load profile ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) { setLoadingProfile(false); return }
    getDoc(doc(db, "users", user.uid))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data()
          setProfile({
            username: d.username || "",
            telemovel: d.telemovel || "",
            banco: d.banco || "",
            iban: d.iban || "",
            mbwayAtivo: d.mbwayAtivo || false,
            fotoUrl: d.fotoUrl || "",
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false))
  }, [user?.uid])

  // ── Save field ────────────────────────────────────────────────────────────

  const saveField = async (field: keyof UserProfile, value: string | boolean) => {
    if (!user?.uid) return
    setProfile(prev => ({ ...prev, [field]: value }))
    await setDoc(doc(db, "users", user.uid), { [field]: value }, { merge: true })
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  //
  // REGRA iOS Safari: o browser só abre o file picker se o <input type="file">
  // for ativado SINCRONAMENTE por um gesto do utilizador.
  // Qualquer await/setTimeout/Promise antes do .click() quebra a cadeia.
  //
  // SOLUÇÃO: usar <label htmlFor="input-id"> a envolver o botão visual.
  // O toque no <label> ativa o <input> nativamente, sem JavaScript.
  // O handler onChange é assíncrono e faz o upload normalmente.

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // reset para permitir re-selecionar o mesmo ficheiro
    if (!file || !user?.uid) return

    setShowPhotoOptions(false)
    setUploadingPhoto(true)
    setUploadProgress(0)
    try {
      const uploadId = `perfil_${user.uid}_${Date.now()}`
      const { url, publicId } = await uploadFotoObra(file, uploadId, p => setUploadProgress(p))
      await setDoc(doc(db, "users", user.uid), { fotoUrl: url, fotoPublicId: publicId }, { merge: true })
      setProfile(prev => ({ ...prev, fotoUrl: url }))
    } catch (err) {
      console.error("Erro ao carregar foto", err)
    } finally {
      setUploadingPhoto(false)
      setUploadProgress(0)
    }
  }

  // ── Username ──────────────────────────────────────────────────────────────

  const handleSaveUsername = async () => {
    if (!user?.uid || !editedUsername.trim()) return
    setSavingUsername(true)
    try { await saveField("username", editedUsername.trim()); setIsEditingUsername(false) }
    catch { alert("Erro ao guardar o nome.") }
    finally { setSavingUsername(false) }
  }

  const handleCopyUid = () => {
    if (!user?.uid) return
    navigator.clipboard.writeText(user.uid); setCopiedUid(true)
    setTimeout(() => setCopiedUid(false), 2000)
  }

  const handleLogout = async () => {
    try { await logout() } catch { alert("Erro ao terminar a sessão.") }
  }

  // ── Backup ────────────────────────────────────────────────────────────────

  const exportarDados = async () => {
    const conteudo = JSON.stringify(data)
    if (!conteudo) { setSyncMessage("Não há dados para exportar."); setSyncSuccess(false); return }
    const blob = new Blob([conteudo], { type: "application/json" })
    const file = new File([blob], `jbricolage-backup-${new Date().toISOString().split("T")[0]}.json`, { type: "application/json" })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Backup JBricolage" })
        setSyncMessage("Partilhado com sucesso!"); setSyncSuccess(true); return
      } catch (e: any) { if (e.name !== "AbortError") console.error(e) }
    }
    try { await navigator.clipboard.writeText(conteudo); setSyncMessage("Copiado para a área de transferência!"); setSyncSuccess(true); return } catch {}
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url)
    setSyncMessage("Ficheiro descarregado!"); setSyncSuccess(true)
  }

  const importarDeArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        importData(JSON.parse(ev.target?.result as string))
        setSyncMessage("Importado com sucesso!"); setSyncSuccess(true)
        setTimeout(() => window.location.reload(), 1000)
      } catch { setSyncMessage("Ficheiro inválido."); setSyncSuccess(false) }
    }
    reader.readAsText(file)
  }

  const importarTextoColado = () => {
    if (!textoColado.trim()) { setSyncMessage("Cola o JSON primeiro."); setSyncSuccess(false); return }
    try {
      importData(JSON.parse(textoColado.trim()))
      setSyncMessage("Importado com sucesso!"); setSyncSuccess(true)
      setTextoColado(""); setTimeout(() => window.location.reload(), 1000)
    } catch { setSyncMessage("JSON inválido."); setSyncSuccess(false) }
  }

  const displayName = loadingProfile
    ? "A carregar..."
    : profile.username || user?.displayName || user?.email?.split("@")[0] || "Utilizador"

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900">
        <div className="pb-28 md:pb-16 max-w-xl mx-auto">

          {/* ── Hero ── */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-5 pt-10 pb-8">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                <Settings2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Definições</h1>
                <p className="text-sm text-slate-400 mt-0.5">JBricolage · v1.0</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 pt-5">

            {/* ── PERFIL ── */}
            <Card
              icon={<User className="h-4.5 w-4.5" />}
              gradient="from-blue-500 to-indigo-600"
              title="Perfil"
            >
              {user ? (
                <>
                  {/* ── Foto + Nome ── */}
                  <div className="px-4 py-5 flex items-center gap-4 border-b border-border/20">
                    <div className="relative shrink-0">
                      <Avatar fotoUrl={profile.fotoUrl} nome={displayName} size="lg" />

                      {uploadingPhoto && (
                        <div className="absolute inset-0 rounded-3xl bg-black/50 flex flex-col items-center justify-center gap-1 pointer-events-none">
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                          <span className="text-[10px] font-bold text-white">{uploadProgress}%</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => !uploadingPhoto && setShowPhotoOptions(true)}
                        disabled={uploadingPhoto}
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl bg-blue-600 hover:bg-blue-500 border-2 border-background flex items-center justify-center transition-all shadow-md active:scale-90 disabled:opacity-60"
                      >
                        <Camera className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold truncate">{displayName}</p>
                      {uploadingPhoto ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-200"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-blue-500 tabular-nums shrink-0">{uploadProgress}%</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email || "—"}</p>
                      )}
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────
                    PHOTO OPTIONS BOTTOM SHEET
                    
                    Os dois inputs de foto ficam SEMPRE no DOM (fora do sheet),
                    para garantir que existem quando os labels são clicados.
                    Cada botão é um <label htmlFor="..."> que aponta para o
                    seu <input>. O toque no label abre o picker nativamente
                    em iOS/Android sem nenhum .click() ou setTimeout.
                  ───────────────────────────────────────────────────────── */}

                  {/* Inputs sempre presentes no DOM */}
                  <input
                    id="foto-perfil-selfie"
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="sr-only"
                    onChange={handleFileChosen}
                  />
                  <input
                    id="foto-perfil-galeria"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChosen}
                  />

                  {showPhotoOptions && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowPhotoOptions(false)}
                      />

                      {/* Sheet */}
                      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-xl mx-auto px-4 pb-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden">

                          <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                          </div>
                          <p className="text-center text-sm font-bold text-muted-foreground pb-3 pt-1">
                            Alterar foto de perfil
                          </p>

                          <div className="grid grid-cols-2 gap-3 px-4 pb-5">

                            {/*
                              SELFIE — label aponta para input com capture="user".
                              Em iOS abre diretamente a câmara frontal.
                              Em Android mostra opções câmara/galeria.
                              NUNCA usar onClick + .click() — quebra em iOS.
                            */}
                            <label
                              htmlFor="foto-perfil-selfie"
                              className="flex flex-col items-center gap-3 py-5 px-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all active:scale-95 cursor-pointer select-none"
                            >
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 pointer-events-none">
                                <Camera className="h-6 w-6 text-white" />
                              </div>
                              <div className="text-center pointer-events-none">
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Tirar selfie</p>
                                <p className="text-[11px] text-blue-500/70 mt-0.5">Câmara frontal</p>
                              </div>
                            </label>

                            {/*
                              GALERIA — label aponta para input sem capture.
                              Abre o seletor de ficheiros/galeria do sistema.
                            */}
                            <label
                              htmlFor="foto-perfil-galeria"
                              className="flex flex-col items-center gap-3 py-5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all active:scale-95 cursor-pointer select-none"
                            >
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/20 pointer-events-none">
                                <ImageIcon className="h-6 w-6 text-white" />
                              </div>
                              <div className="text-center pointer-events-none">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Galeria</p>
                                <p className="text-[11px] text-slate-500/70 mt-0.5">Escolher foto</p>
                              </div>
                            </label>

                          </div>

                          <button
                            onClick={() => setShowPhotoOptions(false)}
                            className="w-full py-4 text-sm font-semibold text-muted-foreground border-t border-border/30 hover:bg-muted/40 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Nome ── */}
                  <div className="border-b border-border/20 px-4 py-3.5">
                    <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 font-bold flex items-center gap-1.5 mb-2">
                      <User className="h-3 w-3 opacity-50" />Nome
                    </label>
                    {isEditingUsername ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editedUsername}
                          onChange={e => setEditedUsername(e.target.value)}
                          placeholder="O teu nome"
                          className="h-10 text-sm flex-1 bg-muted/40 border-border/40 rounded-xl"
                          disabled={savingUsername}
                          autoFocus
                          onKeyDown={e => e.key === "Enter" && handleSaveUsername()}
                        />
                        <button onClick={handleSaveUsername} disabled={savingUsername || !editedUsername.trim()}
                          className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-50 active:scale-95 shadow-sm shadow-emerald-500/30">
                          {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setIsEditingUsername(false)} disabled={savingUsername}
                          className="w-10 h-10 rounded-xl border border-border/40 hover:bg-muted flex items-center justify-center transition-all shrink-0 active:scale-95">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 group">
                        <p className={cn("text-sm font-medium truncate", !profile.username && "text-muted-foreground/35 italic font-normal")}>
                          {profile.username || "Sem nome definido"}
                        </p>
                        <button
                          onClick={() => {
                            setIsEditingUsername(true)
                            setEditedUsername(profile.username || user.displayName || user.email?.split("@")[0] || "")
                          }}
                          className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center transition-all shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Telemovel */}
                  <div className="border-b border-border/20">
                    <EditableField
                      label="Telemovel"
                      value={profile.telemovel}
                      placeholder="Sem número definido"
                      type="tel"
                      icon={<Phone className="h-3 w-3" />}
                      onSave={v => saveField("telemovel", v)}
                    />
                  </div>

                  {/* Email read-only */}
                  <div className="border-b border-border/20 px-4 py-3.5">
                    <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 font-bold mb-2 block">Email</label>
                    <p className="text-sm text-muted-foreground truncate">{user.email || "—"}</p>
                  </div>

                  {/* UID */}
                  <div className="border-b border-border/20">
                    <RowItem>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 font-bold mb-1">ID da conta</p>
                        <p className="text-xs font-mono text-muted-foreground">{user.uid.slice(0, 8)}…{user.uid.slice(-4)}</p>
                      </div>
                      <button
                        className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted transition-all shrink-0 active:scale-95"
                        onClick={handleCopyUid}
                      >
                        {copiedUid
                          ? <Check className="h-4 w-4 text-emerald-500" />
                          : <Copy className="h-4 w-4 text-muted-foreground/50" />
                        }
                      </button>
                    </RowItem>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-4 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors active:scale-[0.99] group"
                  >
                    <div className="w-9 h-9 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                      <LogOut className="h-4 w-4 text-red-500" />
                    </div>
                    Terminar sessão
                    <ChevronRight className="h-4 w-4 ml-auto opacity-30" />
                  </button>
                </>
              ) : (
                <RowItem><p className="text-sm text-muted-foreground py-2">Não estás autenticado.</p></RowItem>
              )}
            </Card>

            {/* ── INFORMAÇÃO DE PAGAMENTO ── */}
            {user && (
              <Card
                icon={<CreditCard className="h-4.5 w-4.5" />}
                gradient="from-emerald-500 to-teal-600"
                title="Informação de Pagamento"
              >
                <div className="px-4 pt-3 pb-1">
                  <div className="flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3.5 py-3 rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                    <span className="font-medium">Dados privados — visíveis apenas para a gestão.</span>
                  </div>
                </div>

                <div className="border-t border-border/20 mt-3">
                  <EditableField
                    label="Banco"
                    value={profile.banco}
                    placeholder="ex: Caixa Geral de Depósitos"
                    icon={<Building2 className="h-3 w-3" />}
                    onSave={v => saveField("banco", v)}
                  />
                </div>

                <div className="border-t border-border/20">
                  <EditableField
                    label="IBAN"
                    value={profile.iban}
                    placeholder="ex: PT50 0000 0000 0000 0000 0000 0"
                    icon={<Hash className="h-3 w-3" />}
                    onSave={v => saveField("iban", v)}
                    sensitive
                  />
                </div>

                <div className="border-t border-border/20">
                  <MBwayToggle
                    enabled={profile.mbwayAtivo}
                    telemovel={profile.telemovel}
                    iban={profile.iban}
                    onToggle={v => saveField("mbwayAtivo", v)}
                  />
                </div>
              </Card>
            )}

            {/* ── TAXA HORÁRIA ── */}
            <Card
              icon={<Euro className="h-4.5 w-4.5" />}
              gradient="from-amber-500 to-orange-500"
              title="Taxa Horária"
            >
              <RowItem>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 font-bold mb-1.5">Taxa atual</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tabular-nums text-foreground">
                      {data.settings.taxaHoraria.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold text-muted-foreground">€</span>
                    <span className="text-sm text-muted-foreground/60 ml-0.5">/hora</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-muted/60 flex items-center justify-center shrink-0">
                  <Lock className="h-4.5 w-4.5 text-muted-foreground/40" />
                </div>
              </RowItem>
              <div className="px-4 pb-4">
                <div className="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3 rounded-2xl border border-amber-200/50 dark:border-amber-800/50">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span className="font-medium">Definida pela gestão. Contacta o supervisor para alterações.</span>
                </div>
              </div>
            </Card>

            {/* ── BACKUP & SYNC ── */}
            <Card
              icon={<DatabaseBackup className="h-4.5 w-4.5" />}
              gradient="from-violet-500 to-purple-600"
              title="Backup & Sincronização"
            >
              <ActionRow
                icon={<Share className="h-4 w-4" />}
                iconGradient="from-violet-500 to-purple-600"
                label="Exportar dados"
                description="Partilhar ou guardar backup"
                onClick={exportarDados}
              />

              <div className="h-px bg-border/20 mx-4" />

              <ActionRow
                icon={<Upload className="h-4 w-4" />}
                iconGradient="from-violet-500 to-purple-600"
                label="Importar de ficheiro"
                description="Carregar backup .json"
                onClick={() => fileInputRef.current?.click()}
              />
              <input type="file" accept=".json" ref={fileInputRef} onChange={importarDeArquivo} className="hidden" />

              <div className="px-4 pb-4 pt-3 border-t border-border/20 space-y-3 mt-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
                  Ou cola o JSON de backup:
                </p>
                <Textarea
                  value={textoColado}
                  onChange={e => setTextoColado(e.target.value)}
                  placeholder='{"entries":[...],"payments":[...],...}'
                  className="min-h-[90px] font-mono text-xs resize-none bg-muted/30 border-border/40 rounded-2xl"
                />
                <Button
                  onClick={importarTextoColado}
                  disabled={!textoColado.trim()}
                  variant="secondary"
                  className="w-full h-10 rounded-xl font-semibold"
                >
                  Importar texto colado
                </Button>
              </div>

              {syncMessage && (
                <div className={cn(
                  "mx-4 mb-4 flex items-start gap-3 px-4 py-3.5 rounded-2xl text-sm border font-medium",
                  syncSuccess
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40"
                    : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200/60 dark:border-red-800/40"
                )}>
                  {syncSuccess
                    ? <CheckCircle2 className="h-4.5 w-4.5 mt-0.5 shrink-0 text-emerald-500" />
                    : <AlertCircle className="h-4.5 w-4.5 mt-0.5 shrink-0 text-red-500" />
                  }
                  <span>{syncMessage}</span>
                </div>
              )}
            </Card>

            {/* ── PWA & Migration ── */}
            <InstallPWAButton />
            <MigrateLegacyDataButton />

          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

// ── UI Primitives ─────────────────────────────────────────────────────────────

function Card({
  icon, gradient, title, children,
}: {
  icon: React.ReactNode; gradient: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30">
        <div className={cn(
          "w-9 h-9 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm",
          gradient
        )}>
          <span className="text-white">{icon}</span>
        </div>
        <p className="text-sm font-bold tracking-tight">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

function RowItem({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 px-4 py-3.5">{children}</div>
}

function ActionRow({
  icon, iconGradient, label, description, onClick,
}: {
  icon: React.ReactNode; iconGradient: string; label: string; description: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 text-sm hover:bg-muted/40 transition-colors active:scale-[0.99] group"
    >
      <div className={cn(
        "w-9 h-9 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm",
        iconGradient
      )}>
        <span className="text-white">{icon}</span>
      </div>
      <div className="flex-1 text-left">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}