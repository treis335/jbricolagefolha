//admin/collaborator/[id]/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft, Calendar as CalendarIcon, FileText, User,
  Euro, Clock, TrendingUp, Mail, AtSign, Layers,
  ChevronRight, ChevronLeft, Camera, ImageIcon, Loader2,
  Pencil, Check, X, Lock, LockOpen, ShieldAlert,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { uploadFotoObra } from "@/lib/obras-service"
import { cn } from "@/lib/utils"

import { CollaboratorCalendarView } from "@/components/admin/collaborator-calendar-view"
import { CollaboratorReportsView } from "@/components/admin/collaborator-reports-view"
import { CollaboratorOverview } from "@/components/admin/collaborator-overview"
import type { RateHistoryEntry } from "@/components/admin/collaborator-rate-manager"

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const s0Taxa = entry.services[0]?.taxaHoraria
    if (typeof s0Taxa === "number" && s0Taxa > 0) return s0Taxa
  }
  return currentRate
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ fotoUrl, nome, size = "lg" }: { fotoUrl: string; nome: string; size?: "sm" | "lg" }) {
  const initials = nome.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
  const dim = size === "lg" ? "w-16 h-16 md:w-20 md:h-20" : "w-10 h-10"
  const text = size === "lg" ? "text-xl md:text-2xl" : "text-base"

  if (fotoUrl) {
    return (
      <img key={fotoUrl} src={fotoUrl} alt={nome}
        className={cn(dim, "rounded-2xl object-cover ring-2 ring-primary/20 shadow-sm shrink-0")} />
    )
  }
  return (
    <div className={cn(dim, text, "rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary shadow-sm shrink-0")}>
      {initials || <User className="h-6 w-6 opacity-60" />}
    </div>
  )
}

// ── Photo Confirm Dialog ──────────────────────────────────────────────────────
function PhotoConfirmDialog({ previewUrl, onConfirm, onCancel, uploading, progress }: {
  previewUrl: string; onConfirm: () => void; onCancel: () => void
  uploading: boolean; progress: number
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={!uploading ? onCancel : undefined} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
        <div className="w-full max-w-sm rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
          <div className="relative bg-muted aspect-square max-h-64 overflow-hidden">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
                <div className="w-40 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-white text-sm font-semibold">{progress}%</p>
              </div>
            )}
          </div>
          <div className="p-5 space-y-3">
            <p className="text-center text-sm font-semibold">Usar esta foto de perfil?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onCancel} disabled={uploading}
                className="h-11 rounded-xl border border-border/50 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors active:scale-95 disabled:opacity-40">
                Escolher outra
              </button>
              <button onClick={onConfirm} disabled={uploading}
                className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors active:scale-95 disabled:opacity-40 shadow-sm shadow-primary/30 flex items-center justify-center gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {uploading ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Lock Row ──────────────────────────────────────────────────────────────────
function LockRow({ label, description, locked, onToggle, saving }: {
  label: string; description: string
  locked: boolean; onToggle: () => void; saving: boolean
}) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border transition-all",
      locked
        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50"
        : "bg-muted/30 border-border/30"
    )}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className={cn("text-xs mt-0.5", locked ? "text-red-500 dark:text-red-400" : "text-muted-foreground")}>
          {locked ? "Bloqueado — só admin pode alterar" : description}
        </p>
      </div>
      <button
        onClick={onToggle}
        disabled={saving}
        className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 active:scale-95 disabled:opacity-50",
          locked
            ? "bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/50"
            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
        )}
      >
        {saving
          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          : locked
            ? <Lock className="h-4 w-4 text-red-500" />
            : <LockOpen className="h-4 w-4 text-slate-400" />
        }
      </button>
    </div>
  )
}

// ── Admin Edit Modal ──────────────────────────────────────────────────────────
function AdminEditModal({ collaborator, onClose, onNameSaved, onLockChanged }: {
  collaborator: any
  onClose: () => void
  onNameSaved: (name: string) => void
  onLockChanged: (locks: { fotoLocked: boolean; nomeLocked: boolean }) => void
}) {
  const [draftName, setDraftName] = useState(collaborator.name)
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [fotoLocked, setFotoLocked] = useState(collaborator.fotoLocked ?? false)
  const [nomeLocked, setNomeLocked] = useState(collaborator.nomeLocked ?? false)
  const [savingFotoLock, setSavingFotoLock] = useState(false)
  const [savingNomeLock, setSavingNomeLock] = useState(false)

  const saveName = async () => {
    if (!draftName.trim() || draftName.trim() === collaborator.name) return
    setSavingName(true)
    try {
      await setDoc(doc(db, "users", collaborator.id), { username: draftName.trim(), name: draftName.trim() }, { merge: true })
      onNameSaved(draftName.trim())
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch { alert("Erro ao guardar nome.") }
    finally { setSavingName(false) }
  }

  const toggleFotoLock = async () => {
    setSavingFotoLock(true)
    const next = !fotoLocked
    try {
      await setDoc(doc(db, "users", collaborator.id), { fotoLocked: next }, { merge: true })
      setFotoLocked(next)
      onLockChanged({ fotoLocked: next, nomeLocked })
    } catch { alert("Erro ao alterar bloqueio.") }
    finally { setSavingFotoLock(false) }
  }

  const toggleNomeLock = async () => {
    setSavingNomeLock(true)
    const next = !nomeLocked
    try {
      await setDoc(doc(db, "users", collaborator.id), { nomeLocked: next }, { merge: true })
      setNomeLocked(next)
      onLockChanged({ fotoLocked, nomeLocked: next })
    } catch { alert("Erro ao alterar bloqueio.") }
    finally { setSavingNomeLock(false) }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — bottom sheet em mobile, centrado em desktop */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4 pb-0 sm:pb-0">
        <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

          {/* Handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4 sm:pt-5 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0">
                <ShieldAlert className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">Editar Colaborador</p>
                <p className="text-xs text-muted-foreground">{collaborator.name}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-5 max-h-[70dvh] overflow-y-auto">

            {/* Nome */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 font-bold flex items-center gap-1.5">
                <User className="h-3 w-3 opacity-60" />Nome / Username
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={draftName}
                  onChange={e => { setDraftName(e.target.value); setNameSaved(false) }}
                  placeholder="Nome do colaborador"
                  className="h-10 text-sm flex-1 bg-muted/40 border-border/40 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                  onKeyDown={e => { if (e.key === "Enter") saveName() }}
                />
                <button
                  onClick={saveName}
                  disabled={savingName || !draftName.trim() || draftName.trim() === collaborator.name}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40 shadow-sm",
                    nameSaved
                      ? "bg-emerald-500 text-white"
                      : "bg-primary hover:bg-primary/90 text-white"
                  )}
                >
                  {savingName
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : nameSaved
                      ? <Check className="h-4 w-4" />
                      : <Check className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {/* Bloqueios */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 font-bold flex items-center gap-1.5">
                <Lock className="h-3 w-3 opacity-60" />Permissões do User
              </p>
              <div className="space-y-2">
                <LockRow
                  label="Nome"
                  description="User pode alterar livremente"
                  locked={nomeLocked}
                  onToggle={toggleNomeLock}
                  saving={savingNomeLock}
                />
                <LockRow
                  label="Foto de Perfil"
                  description="User pode alterar livremente"
                  locked={fotoLocked}
                  onToggle={toggleFotoLock}
                  saving={savingFotoLock}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border/20 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              onClick={onClose}
              className="w-full h-11 rounded-2xl bg-muted hover:bg-muted/80 text-sm font-semibold text-foreground transition-colors active:scale-[0.98]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CollaboratorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const collaboratorId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [collaborator, setCollaborator] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const goToPrevMonth = () => setSelectedMonth(prev =>
    prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
  )
  const goToNextMonth = () => setSelectedMonth(prev =>
    prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
  )
  const isCurrentMonth = selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth()

  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (!previewUrl) return
    return () => { URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const fetchCollaborator = useCallback(async () => {
    if (!collaboratorId) return
    try {
      setLoading(true)
      const userSnap = await getDoc(doc(db, "users", collaboratorId))
      if (!userSnap.exists()) { setError("Colaborador não encontrado"); return }

      const userData = userSnap.data()
      const entries = userData.workData?.entries || []
      const currentRate = userData.workData?.settings?.taxaHoraria || 0
      const rateHistory: RateHistoryEntry[] = userData.rateHistory || []

      let totalHoursAllTime = 0
      entries.forEach((entry: any) => { totalHoursAllTime += entry.totalHoras || 0 })

      setCollaborator({
        id: collaboratorId,
        name: userData.name || userData.username || "Sem nome",
        username: userData.username || "",
        email: userData.email || "",
        fotoUrl: userData.fotoUrl || "",
        fotoLocked: userData.fotoLocked ?? false,
        nomeLocked: userData.nomeLocked ?? false,
        currentRate,
        totalHoursAllTime,
        entries,
        role: userData.role || "worker",
        createdAt: userData.createdAt,
        migrated: userData.migrated || false,
        rateHistory,
      })
    } catch (err) {
      console.error(err)
      setError("Erro ao carregar dados do colaborador")
    } finally {
      setLoading(false)
    }
  }, [collaboratorId])

  useEffect(() => { fetchCollaborator() }, [fetchCollaborator])

  const { totalHoursThisMonth, costThisMonth } = useMemo(() => {
    if (!collaborator) return { totalHoursThisMonth: 0, costThisMonth: 0 }
    let hours = 0, cost = 0
    collaborator.entries.forEach((entry: any) => {
      if (entry.date) {
        const [year, month] = entry.date.split("-").map(Number)
        if (year === selectedMonth.year && month - 1 === selectedMonth.month) {
          const h = entry.totalHoras || 0
          hours += h
          cost += h * resolveEntryTaxa(entry, collaborator.currentRate)
        }
      }
    })
    return { totalHoursThisMonth: hours, costThisMonth: cost }
  }, [collaborator, selectedMonth])

  const handleRateUpdated = useCallback((newRate: number, newHistory: RateHistoryEntry[]) => {
    setCollaborator((prev: any) => ({ ...prev, currentRate: newRate, rateHistory: newHistory }))
  }, [])

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setShowPhotoOptions(false)
    const localUrl = URL.createObjectURL(file)
    setPendingFile(file)
    setPreviewUrl(localUrl)
  }

  const handleConfirmUpload = async () => {
    if (!pendingFile || !collaboratorId) return
    setUploadingPhoto(true)
    setUploadProgress(0)
    try {
      const uploadId = `perfil_${collaboratorId}_${Date.now()}`
      const { url, publicId } = await uploadFotoObra(pendingFile, uploadId, p => setUploadProgress(p))
      await setDoc(doc(db, "users", collaboratorId), { fotoUrl: url, fotoPublicId: publicId }, { merge: true })
      setCollaborator((prev: any) => ({ ...prev, fotoUrl: url }))
    } catch (err) {
      console.error("Erro ao carregar foto", err)
      alert("Erro ao guardar a foto. Tenta novamente.")
    } finally {
      setUploadingPhoto(false)
      setUploadProgress(0)
      setPendingFile(null)
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    }
  }

  const handleCancelPreview = () => {
    setPendingFile(null)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Spinner className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">A carregar</p>
            <p className="text-xs text-muted-foreground mt-0.5">Dados do colaborador...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !collaborator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <User className="h-7 w-7 text-destructive" />
          </div>
          <p className="font-semibold">{error || "Colaborador não encontrado"}</p>
          <Button onClick={() => router.push("/admin")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Admin
          </Button>
        </div>
      </div>
    )
  }

  const isAdmin = collaborator.role === "admin"

  const MonthNavigator = () => (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button onClick={goToPrevMonth}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-90">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="text-[10px] font-semibold text-muted-foreground min-w-[90px] text-center leading-tight">
        {MONTH_NAMES_PT[selectedMonth.month]}<br />
        <span className="text-[9px] font-normal">{selectedMonth.year}</span>
      </span>
      <button onClick={goToNextMonth} disabled={isCurrentMonth}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  const kpis = [
    { icon: Euro,       label: "Taxa Horária",   value: `${collaborator.currentRate.toFixed(2)} €`,     sub: "por hora",          color: "blue",    nav: false },
    { icon: Clock,      label: "Horas este Mês", value: `${totalHoursThisMonth.toFixed(1)}`,            sub: "horas trabalhadas", color: "violet",  nav: true  },
    { icon: TrendingUp, label: "Custo Mensal",   value: `${costThisMonth.toFixed(2)} €`,                sub: "custo acumulado",   color: "emerald", nav: true  },
    { icon: Layers,     label: "Total Histórico",value: `${collaborator.totalHoursAllTime.toFixed(1)}`, sub: "horas totais",      color: "amber",   nav: false },
  ]

  const colorMap: Record<string, { card: string; icon: string; iconBg: string }> = {
    blue:    { card: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40",             icon: "text-blue-600 dark:text-blue-400",     iconBg: "bg-blue-100 dark:bg-blue-900/50" },
    violet:  { card: "bg-violet-50/60 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40",     icon: "text-violet-600 dark:text-violet-400",  iconBg: "bg-violet-100 dark:bg-violet-900/50" },
    emerald: { card: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40", icon: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-900/50" },
    amber:   { card: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",         icon: "text-amber-600 dark:text-amber-400",    iconBg: "bg-amber-100 dark:bg-amber-900/50" },
  }

  const tabs = [
    { value: "overview", label: "Visão Geral", Icon: User },
    { value: "calendar", label: "Calendário",  Icon: CalendarIcon },
    { value: "reports",  label: "Relatórios",  Icon: FileText },
  ]

  return (
    <>
      {/* ── Inputs SEMPRE no DOM (Android) ── */}
      <input id="admin-foto-selfie" type="file" accept="image/*" capture="user" className="sr-only" onChange={handleFileChosen} />
      <input id="admin-foto-galeria" type="file" accept="image/*" className="sr-only" onChange={handleFileChosen} />

      {/* ── Preview + Confirmação ── */}
      {previewUrl && (
        <PhotoConfirmDialog
          previewUrl={previewUrl}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancelPreview}
          uploading={uploadingPhoto}
          progress={uploadProgress}
        />
      )}

      <div className="min-h-screen bg-background">
        <ScrollArea className="h-screen">
          <div className="max-w-6xl mx-auto">

            {/* ── Top Bar ── */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b">
              <div className="flex items-center gap-3 px-4 py-3 md:px-8">
                <button onClick={() => router.push("/admin")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">Colaboradores</span>
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="text-sm font-medium truncate">{collaborator.name}</span>
              </div>
            </div>

            {/* ── Hero ── */}
            <div className="px-4 pt-6 pb-5 md:px-8 md:pt-8">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Avatar fotoUrl={collaborator.fotoUrl} nome={collaborator.name} size="lg" />
                  <button
                    type="button"
                    onClick={() => setShowPhotoOptions(true)}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary hover:bg-primary/90 border-2 border-background flex items-center justify-center transition-all shadow-md active:scale-90 disabled:opacity-60"
                  >
                    <Camera className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <h1 className="text-lg md:text-2xl font-bold tracking-tight leading-tight truncate">{collaborator.name}</h1>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-medium shrink-0",
                      isAdmin
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                    )}>
                      {isAdmin ? "Admin" : "Colaborador"}
                    </Badge>
                    {collaborator.migrated && <Badge variant="outline" className="text-[10px] shrink-0">Migrado</Badge>}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {collaborator.email && (
                      <a href={`mailto:${collaborator.email}`}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit max-w-full">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{collaborator.email}</span>
                      </a>
                    )}
                    {collaborator.username && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground w-fit">
                        <AtSign className="h-3 w-3 shrink-0" />
                        <span>{collaborator.username}</span>
                      </span>
                    )}
                  </div>

                  {/* Botão editar (admin) */}
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 text-primary text-xs font-semibold transition-all active:scale-95"
                  >
                    <ShieldAlert className="h-3 w-3" />
                    Editar (Admin)
                  </button>
                </div>
              </div>
            </div>

            {/* ── KPI Grid ── */}
            <div className="px-4 pb-6 md:px-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpis.map((kpi) => {
                  const c = colorMap[kpi.color]
                  const Icon = kpi.icon
                  return (
                    <div key={kpi.label} className={cn("relative rounded-2xl border p-4 md:p-5 transition-all hover:shadow-sm", c.card)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("inline-flex p-2 rounded-xl", c.iconBg)}>
                          <Icon className={cn("h-4 w-4", c.icon)} />
                        </div>
                        {kpi.nav && <MonthNavigator />}
                      </div>
                      <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1">{kpi.label}</p>
                      <p className="text-xl md:text-2xl font-bold tracking-tight">{kpi.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="px-4 pb-10 md:px-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-11 rounded-xl bg-muted/50 p-1 mb-6">
                  {tabs.map(({ value, label, Icon }) => (
                    <TabsTrigger key={value} value={value}
                      className="flex items-center gap-2 rounded-lg h-9 px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xs:inline sm:inline">{label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="overview" className="focus-visible:outline-none mt-0">
                  <CollaboratorOverview collaborator={collaborator} onRateUpdated={handleRateUpdated}
                    selectedMonth={selectedMonth} onPrevMonth={goToPrevMonth} onNextMonth={goToNextMonth} isCurrentMonth={isCurrentMonth} />
                </TabsContent>
                <TabsContent value="calendar" className="focus-visible:outline-none mt-0">
                  <CollaboratorCalendarView collaboratorId={collaborator.id} collaboratorName={collaborator.name}
                    currentRate={collaborator.currentRate} entries={collaborator.entries} />
                </TabsContent>
                <TabsContent value="reports" className="focus-visible:outline-none mt-0">
                  <CollaboratorReportsView collaborator={collaborator} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ── Admin Edit Modal ── */}
      {showEditModal && (
        <AdminEditModal
          collaborator={collaborator}
          onClose={() => setShowEditModal(false)}
          onNameSaved={(name) => setCollaborator((prev: any) => ({ ...prev, name, username: name }))}
          onLockChanged={(locks) => setCollaborator((prev: any) => ({ ...prev, ...locks }))}
        />
      )}

      {/* ── Bottom Sheet foto ── */}
      {showPhotoOptions && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowPhotoOptions(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-xl mx-auto px-3 pb-5 animate-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>
              <p className="text-center text-sm font-bold text-muted-foreground pb-3 pt-1">
                Alterar foto de {collaborator.name.split(" ")[0]}
              </p>
              <div className="grid grid-cols-2 gap-2 px-3 pb-4">
                <label htmlFor="admin-foto-selfie"
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all active:scale-95 cursor-pointer select-none"
                  onClick={() => setShowPhotoOptions(false)}>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 pointer-events-none">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center pointer-events-none">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Tirar foto</p>
                    <p className="text-[11px] text-blue-500/70 mt-0.5">Câmara frontal</p>
                  </div>
                </label>
                <label htmlFor="admin-foto-galeria"
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all active:scale-95 cursor-pointer select-none"
                  onClick={() => setShowPhotoOptions(false)}>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/20 pointer-events-none">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center pointer-events-none">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Galeria</p>
                    <p className="text-[11px] text-slate-500/70 mt-0.5">Escolher foto</p>
                  </div>
                </label>
              </div>
              <button onClick={() => setShowPhotoOptions(false)}
                className="w-full py-4 text-sm font-semibold text-muted-foreground border-t border-border/30 hover:bg-muted/40 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}