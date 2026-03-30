"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft, Calendar as CalendarIcon, FileText, User,
  Euro, Clock, TrendingUp, Mail, AtSign, Layers,
  ChevronRight, Camera, ImageIcon, Loader2,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { uploadFotoObra } from "@/lib/obras-service"
import { cn } from "@/lib/utils"

import { CollaboratorCalendarView } from "@/components/admin/collaborator-calendar-view"
import { CollaboratorReportsView } from "@/components/admin/collaborator-reports-view"
import { CollaboratorOverview } from "@/components/admin/collaborator-overview"
import type { RateHistoryEntry } from "@/components/admin/collaborator-rate-manager"

function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0)
    return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const s0Taxa = entry.services[0]?.taxaHoraria
    if (typeof s0Taxa === "number" && s0Taxa > 0) return s0Taxa
  }
  return currentRate
}

// ── Avatar (igual ao SettingsView) ───────────────────────────────────────────
function Avatar({ fotoUrl, nome, size = "lg" }: { fotoUrl: string; nome: string; size?: "sm" | "lg" }) {
  const initials = nome.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
  const dim = size === "lg" ? "w-16 h-16 md:w-20 md:h-20" : "w-10 h-10"
  const text = size === "lg" ? "text-xl md:text-2xl" : "text-base"

  if (fotoUrl) {
    return (
      <img
        key={fotoUrl}
        src={fotoUrl}
        alt={nome}
        className={cn(dim, "rounded-2xl object-cover ring-2 ring-primary/20 shadow-sm shrink-0")}
      />
    )
  }
  return (
    <div className={cn(
      dim, text,
      "rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary shadow-sm shrink-0"
    )}>
      {initials || <User className="h-6 w-6 opacity-60" />}
    </div>
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

  // ── Photo state ──
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

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

      let totalHoursThisMonth = 0, totalHoursAllTime = 0, costThisMonth = 0
      const now = new Date()

      entries.forEach((entry: any) => {
        const h = entry.totalHoras || 0
        totalHoursAllTime += h
        if (entry.date) {
          const [year, month] = entry.date.split("-").map(Number)
          if (year === now.getFullYear() && month - 1 === now.getMonth()) {
            totalHoursThisMonth += h
            costThisMonth += h * resolveEntryTaxa(entry, currentRate)
          }
        }
      })

      setCollaborator({
        id: collaboratorId,
        name: userData.name || userData.username || "Sem nome",
        username: userData.username || "",
        email: userData.email || "",
        fotoUrl: userData.fotoUrl || "",
        currentRate,
        totalHoursThisMonth,
        totalHoursAllTime,
        costThisMonth,
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

  const handleRateUpdated = useCallback((newRate: number, newHistory: RateHistoryEntry[]) => {
    setCollaborator((prev: any) => ({ ...prev, currentRate: newRate, rateHistory: newHistory }))
  }, [])

  // ── Photo upload (mesmo padrão do SettingsView) ──
  // Inputs SEMPRE no DOM — fora de condicionais — para funcionar no Android
  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !collaboratorId) return

    setShowPhotoOptions(false)
    setUploadingPhoto(true)
    setUploadProgress(0)
    try {
      const uploadId = `perfil_${collaboratorId}_${Date.now()}`
      const { url, publicId } = await uploadFotoObra(file, uploadId, p => setUploadProgress(p))
      await setDoc(doc(db, "users", collaboratorId), { fotoUrl: url, fotoPublicId: publicId }, { merge: true })
      setCollaborator((prev: any) => ({ ...prev, fotoUrl: url }))
    } catch (err) {
      console.error("Erro ao carregar foto", err)
    } finally {
      setUploadingPhoto(false)
      setUploadProgress(0)
    }
  }

  /* ── Loading ── */
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

  /* ── Error ── */
  if (error || !collaborator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <User className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <p className="font-semibold">{error || "Colaborador não encontrado"}</p>
            <p className="text-sm text-muted-foreground mt-1">Verifique o ID e tente novamente.</p>
          </div>
          <Button onClick={() => router.push("/admin")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Admin
          </Button>
        </div>
      </div>
    )
  }

  const isAdmin = collaborator.role === "admin"

  const kpis = [
    { icon: Euro,      label: "Taxa Horária",    value: `${collaborator.currentRate.toFixed(2)} €`,        sub: "por hora",          color: "blue" },
    { icon: Clock,     label: "Horas este Mês",  value: `${collaborator.totalHoursThisMonth.toFixed(1)}`,  sub: "horas trabalhadas", color: "violet" },
    { icon: TrendingUp,label: "Custo Mensal",    value: `${collaborator.costThisMonth.toFixed(2)} €`,      sub: "custo acumulado",   color: "emerald" },
    { icon: Layers,    label: "Total Histórico", value: `${collaborator.totalHoursAllTime.toFixed(1)}`,    sub: "horas totais",      color: "amber" },
  ]

  const colorMap: Record<string, { card: string; icon: string; iconBg: string }> = {
    blue:    { card: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40",       icon: "text-blue-600 dark:text-blue-400",    iconBg: "bg-blue-100 dark:bg-blue-900/50" },
    violet:  { card: "bg-violet-50/60 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40", icon: "text-violet-600 dark:text-violet-400", iconBg: "bg-violet-100 dark:bg-violet-900/50" },
    emerald: { card: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40", icon: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-900/50" },
    amber:   { card: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",   icon: "text-amber-600 dark:text-amber-400",   iconBg: "bg-amber-100 dark:bg-amber-900/50" },
  }

  const tabs = [
    { value: "overview", label: "Visão Geral", Icon: User },
    { value: "calendar", label: "Calendário",  Icon: CalendarIcon },
    { value: "reports",  label: "Relatórios",  Icon: FileText },
  ]

  return (
    <>
      {/* ── Inputs de foto — SEMPRE no DOM, fora de condicionais (Android) ── */}
      <input
        id="admin-foto-selfie"
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        onChange={handleFileChosen}
      />
      <input
        id="admin-foto-galeria"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChosen}
      />

      <div className="min-h-screen bg-background">
        <ScrollArea className="h-screen">
          <div className="max-w-6xl mx-auto">

            {/* ── Top Bar ── */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b">
              <div className="flex items-center gap-3 px-4 py-3 md:px-8">
                <button
                  onClick={() => router.push("/admin")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">Colaboradores</span>
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="text-sm font-medium truncate">{collaborator.name}</span>
              </div>
            </div>

            {/* ── Hero ── */}
            <div className="px-4 pt-8 pb-6 md:px-8 md:pt-10">
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">

                {/* Avatar + botão câmara */}
                <div className="relative shrink-0">
                  <Avatar fotoUrl={collaborator.fotoUrl} nome={collaborator.name} size="lg" />

                  {/* Overlay de progresso */}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center gap-1 pointer-events-none">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                      <span className="text-[10px] font-bold text-white">{uploadProgress}%</span>
                    </div>
                  )}

                  {/* Botão câmara (admin) */}
                  <button
                    type="button"
                    onClick={() => !uploadingPhoto && setShowPhotoOptions(true)}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 w-7 h-7 md:w-8 md:h-8 rounded-xl bg-primary hover:bg-primary/90 border-2 border-background flex items-center justify-center transition-all shadow-md active:scale-90 disabled:opacity-60"
                  >
                    <Camera className="h-3 w-3 md:h-3.5 md:w-3.5 text-white" />
                  </button>

                  {/* Barra de progresso abaixo do avatar */}
                  {uploadingPhoto && (
                    <div className="absolute -bottom-5 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{collaborator.name}</h1>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        isAdmin
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                      )}
                    >
                      {isAdmin ? "Administrador" : "Colaborador"}
                    </Badge>
                    {collaborator.migrated && (
                      <Badge variant="outline" className="text-xs">Migrado</Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {collaborator.email && (
                      <a
                        href={`mailto:${collaborator.email}`}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>{collaborator.email}</span>
                      </a>
                    )}
                    {collaborator.username && (
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground w-fit">
                        <AtSign className="h-3.5 w-3.5 shrink-0" />
                        <span>{collaborator.username}</span>
                      </span>
                    )}
                  </div>
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
                      <div className={cn("inline-flex p-2 rounded-xl mb-3", c.iconBg)}>
                        <Icon className={cn("h-4 w-4", c.icon)} />
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
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="flex items-center gap-2 rounded-lg h-9 px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xs:inline sm:inline">{label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview" className="focus-visible:outline-none mt-0">
                  <CollaboratorOverview collaborator={collaborator} onRateUpdated={handleRateUpdated} />
                </TabsContent>
                <TabsContent value="calendar" className="focus-visible:outline-none mt-0">
                  <CollaboratorCalendarView
                    collaboratorId={collaborator.id}
                    collaboratorName={collaborator.name}
                    currentRate={collaborator.currentRate}
                    entries={collaborator.entries}
                  />
                </TabsContent>
                <TabsContent value="reports" className="focus-visible:outline-none mt-0">
                  <CollaboratorReportsView collaborator={collaborator} />
                </TabsContent>
              </Tabs>
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* ── Bottom Sheet de escolha de foto (igual ao SettingsView) ── */}
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
                <label
                  htmlFor="admin-foto-selfie"
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all active:scale-95 cursor-pointer select-none"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 pointer-events-none">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center pointer-events-none">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Tirar foto</p>
                    <p className="text-[11px] text-blue-500/70 mt-0.5">Câmara frontal</p>
                  </div>
                </label>
                <label
                  htmlFor="admin-foto-galeria"
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all active:scale-95 cursor-pointer select-none"
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
    </>
  )
}