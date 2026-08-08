// day-entry-form.tsx
"use client"
import { useState, useEffect, useMemo } from "react"
import { ServiceFotos } from "@/components/forms/service-fotos"
import type { ServiceFoto } from "@/lib/types"
import { PhotoLightbox } from "@/components/forms/photo-lightbox"
import { ObraPicker } from "@/components/forms/obra-picker"
import { ObraInfoSheet } from "@/components/forms/obra-info-sheet"
import { ObraVinculadaCard } from "@/components/forms/obra-vinculada-card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatLocalDate } from "@/lib/date-utils"
import { fmt } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Plus, Minus, X, Trash2, Users, UserPlus, Check, Loader2,
  Clock, Hammer, Search, HardHat, MapPin, AlertTriangle, ChevronRight,
} from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { type DayEntry, calculateHours } from "@/lib/types"
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
import { v4 as uuidv4 } from "uuid"
import { getObras } from "@/lib/obras-service"
import type { Obra } from "@/lib/obras-service"

import { useActiveCollaborators } from "@/hooks/useActiveCollaborators"
import { getNomesColaboradores } from "@/lib/colaboradores"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface DayEntryFormProps {
  date: Date | null
  open: boolean
  onClose: () => void
}

interface Service {
  id: string
  obraNome: string
  obraId?: string
  obraObj?: Obra
  descricao: string
  equipa: string[]
  equipaUids?: string[]
  materiais: string[]
  totalHoras?: number
  fotos?: ServiceFoto[]     // retrocompatível — ausente em dados antigos
}

interface Collaborator {
  uid: string | null
  nome: string
  isLegacy?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function normalizeEquipe(equipa: any): string[] {
  if (!equipa) return []
  if (Array.isArray(equipa)) {
    return equipa.map(item =>
      typeof item === "string" ? item : (item?.nome || String(item))
    )
  }
  return []
}

function normalizeEquipeUids(equipaUids: any): string[] {
  if (!equipaUids) return []
  if (Array.isArray(equipaUids)) {
    return equipaUids.filter((uid): uid is string => typeof uid === "string" && uid.length > 0)
  }
  return []
}

function resolveExistingTaxa(entry: DayEntry): number | undefined {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  const svcs = (entry as any).services
  if (Array.isArray(svcs) && svcs.length > 0) {
    const t = svcs[0]?.taxaHoraria
    if (typeof t === "number" && t > 0) return t
  }
  return undefined
}

function entryToServices(entry: DayEntry): Service[] {
  const svcs = (entry as any).services
  if (Array.isArray(svcs) && svcs.length > 0) {
    return svcs.map((s: any) => ({
      id: s.id ?? uuidv4(),
      obraNome: typeof s.obraNome === "string" ? s.obraNome : "",
      obraId: typeof s.obraId === "string" ? s.obraId : undefined,
      obraObj: undefined,
      descricao: typeof s.descricao === "string" ? s.descricao : "",
      equipa: normalizeEquipe(s.equipa),
      equipaUids: normalizeEquipeUids(s.equipaUids),
      materiais: Array.isArray(s.materiais) ? s.materiais.filter((m: any) => typeof m === "string") : [],
      totalHoras: typeof s.totalHoras === "number" ? s.totalHoras : undefined,
      fotos: Array.isArray(s.fotos) ? s.fotos : [],   // retrocompatível
    }))
  }

  return [{
    id: uuidv4(),
    obraNome: "",
    obraId: undefined,
    obraObj: undefined,
    descricao: typeof entry.descricao === "string" ? entry.descricao : "",
    equipa: normalizeEquipe(entry.equipa),
    equipaUids: [],
    materiais: Array.isArray(entry.materiais) ? entry.materiais.filter((m: any) => typeof m === "string") : [],
    totalHoras: undefined,
  }]
}

function servicesEqual(a: Service[], b: Service[]): boolean {
  if (a.length !== b.length) return false
  return a.every((sa, i) => {
    const sb = b[i]
    const fotosA = sa.fotos ?? []
    const fotosB = sb.fotos ?? []
    return (
      sa.obraNome === sb.obraNome &&
      sa.obraId === sb.obraId &&
      sa.descricao === sb.descricao &&
      sa.totalHoras === sb.totalHoras &&
      sa.equipa.length === sb.equipa.length &&
      sa.equipa.every((e, j) => e === sb.equipa[j]) &&
      sa.materiais.length === sb.materiais.length &&
      sa.materiais.every((m, j) => m === sb.materiais[j]) &&
      fotosA.length === fotosB.length &&
      fotosA.every((f, j) => f.publicId === fotosB[j]?.publicId)
    )
  })
}

function serviceHasData(s: Service): boolean {
  return (
    s.descricao.trim() !== "" ||
    s.materiais.length > 0 ||
    s.equipa.length > 0 ||
    (s.totalHoras !== undefined && s.totalHoras > 0)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ObraPicker, ObraInfoSheet, ObraVinculadaCard — extracted to components/forms/
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Main DayEntryForm
// ─────────────────────────────────────────────────────────────────────────────
export function DayEntryForm({ date, open, onClose }: DayEntryFormProps) {
  const { getEntry, addEntry, deleteEntry, data } = useWorkTracker()
  const [isUploading, setIsUploading] = useState(false)
  const { activeCollaborators, loading: loadingCollaborators } = useActiveCollaborators()

  const nomesLegados = useMemo(() => getNomesColaboradores(), [])

  const allCollaborators = useMemo((): Collaborator[] => {
    const activeMap = new Map(activeCollaborators.map(c => [c.nome.toLowerCase().trim(), c]))

    const combined: Collaborator[] = activeCollaborators.map(c => ({
      uid: c.uid,
      nome: c.nome,
      isLegacy: false,
    }))

    nomesLegados.forEach(nome => {
      const nomeLower = nome.toLowerCase().trim()
      if (!activeMap.has(nomeLower)) {
        combined.push({ uid: null, nome, isLegacy: true })
      }
    })

    return combined.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [activeCollaborators, nomesLegados])

  const [totalHoras, setTotalHoras] = useState(8)
  const [services, setServices] = useState<Service[]>([])
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null)
  const [initialHoras, setInitialHoras] = useState(8)
  const [initialServices, setInitialServices] = useState<Service[]>([])
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [tempEquipa, setTempEquipa] = useState<Collaborator[]>([])
  const [teamFilter, setTeamFilter] = useState("")
  const [manualName, setManualName] = useState("")
  const [showObraPicker, setShowObraPicker] = useState(false)
  const [obraInfoSheet, setObraInfoSheet] = useState<Obra | null>(null)
  const [unlinkServiceId, setUnlinkServiceId] = useState<string | null>(null)

  const meuNome = typeof window !== "undefined" ? localStorage.getItem("meuNome") : null

  const dateStr = date ? formatLocalDate(date) : ""
  const existingEntry = dateStr ? getEntry(dateStr) : undefined
  const isEditing = !!existingEntry
  const isWeekend = date ? (date.getDay() === 0 || date.getDay() === 6) : false

  const { normalHoras, extraHoras } = useMemo(() =>
    dateStr ? calculateHours(dateStr, totalHoras) : { normalHoras: 0, extraHoras: 0 },
    [dateStr, totalHoras]
  )

  const fmtShort = (d: Date) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
  const fmtFull = (d: Date) => d.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const dayTypeLabel = () => {
    if (!date) return ""
    const d = date.getDay()
    if (d === 0) return "Domingo · todas as horas são extra"
    if (d === 6) return "Sábado · todas as horas são extra"
    return "Seg – Sex · primeiras 8h são normais"
  }

  const hydrateObras = async (svcs: Service[]) => {
    if (!svcs.some(s => s.obraId && !s.obraObj)) return svcs
    try {
      const obras = await getObras()
      return svcs.map(s => s.obraId ? { ...s, obraObj: obras.find(o => o.id === s.obraId) } : s)
    } catch { return svcs }
  }

  useEffect(() => {
    if (!date || !open) return

    if (existingEntry) {
      const h = typeof existingEntry.totalHoras === "number" && existingEntry.totalHoras >= 0 ? existingEntry.totalHoras : 8
      const loaded = entryToServices(existingEntry)
      setTotalHoras(h)
      setServices(loaded)
      setActiveServiceId(loaded[0]?.id ?? null)
      setInitialHoras(h)
      setInitialServices(JSON.parse(JSON.stringify(loaded)))
      hydrateObras(loaded).then(h => setServices(h))
    } else {
      const ns: Service = {
        id: uuidv4(),
        obraNome: "",
        obraId: undefined,
        obraObj: undefined,
        descricao: "",
        equipa: meuNome ? [meuNome] : [],
        equipaUids: [],
        materiais: [],
        totalHoras: undefined,
      }
      setServices([ns])
      setActiveServiceId(ns.id)
      setTotalHoras(8)
      setInitialHoras(8)
      setInitialServices(JSON.parse(JSON.stringify([ns])))
    }
  }, [date, open, existingEntry, meuNome])

  const activeService = useMemo(() => services.find(s => s.id === activeServiceId) ?? services[0], [services, activeServiceId])

  const updateService = (id: string, updates: Partial<Service>) =>
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))

  const updateActiveService = (updates: Partial<Service>) =>
    activeServiceId && updateService(activeServiceId, updates)

  const hasChanges = useMemo(() =>
    totalHoras !== initialHoras || !servicesEqual(services, initialServices),
    [totalHoras, initialHoras, services, initialServices]
  )

  const hasAnyContent = useMemo(() => {
    if (isEditing) return true
    return totalHoras !== 8 || services.some(s =>
      s.obraNome.trim() !== "" || s.descricao.trim() !== "" ||
      s.materiais.length > 0 || s.equipa.length > 0
    )
  }, [isEditing, totalHoras, services])

  const showSaveButton = isUploading || (isEditing ? hasChanges : hasAnyContent)

  // ── Team Selector ──
  const colaboradoresFiltrados = useMemo(() => {
    const f = teamFilter.toLowerCase().trim()
    if (!f) return allCollaborators
    return allCollaborators.filter(c => c.nome.toLowerCase().includes(f))
  }, [teamFilter, allCollaborators])

  const addManualMember = () => {
    const name = manualName.trim()
    if (!name) return
    const already = tempEquipa.some(m => m.nome.toLowerCase() === name.toLowerCase())
    if (!already) {
      setTempEquipa(prev => [...prev, { uid: null, nome: name, isLegacy: true }])
    }
    setManualName("")
  }

  const openTeamSelector = () => {
    const current: Collaborator[] = []
    if (activeService?.equipa) {
      activeService.equipa.forEach((nome, i) => {
        const uid = activeService.equipaUids?.[i] ?? null
        current.push({ uid: uid || null, nome, isLegacy: !uid })
      })
    }
    setTempEquipa(current)
    setTeamFilter("")
    setManualName("")
    setShowTeamDialog(true)
  }

  const toggleTempMember = (collab: Collaborator) => {
    setTempEquipa(prev =>
      prev.some(m => m.nome === collab.nome)
        ? prev.filter(m => m.nome !== collab.nome)
        : [...prev, collab]
    )
  }

  const confirmTeamSelection = () => {
    const nomes = tempEquipa.map(m => m.nome)
    const uids = tempEquipa.filter(m => m.uid !== null).map(m => m.uid!) as string[]
    updateActiveService({
      equipa: nomes,
      equipaUids: uids.length > 0 ? uids : undefined,
    })
    setShowTeamDialog(false)
  }

  const handleAddService = () => {
    const ns: Service = {
      id: uuidv4(),
      obraNome: "",
      obraId: undefined,
      obraObj: undefined,
      descricao: "",
      equipa: meuNome ? [meuNome] : [],
      equipaUids: [],
      materiais: [],
      totalHoras: undefined,
    }
    setServices(prev => [...prev, ns])
    setActiveServiceId(ns.id)
  }

  const handleRemoveService = (id: string) => {
    if (services.length <= 1) return
    const next = services.filter(s => s.id !== id)
    setServices(next)
    setActiveServiceId(next[0]?.id ?? null)
  }

  const handleObraSelect = (obra: Obra) =>
    updateActiveService({ obraNome: obra.nome, obraId: obra.id, obraObj: obra })

  const handleUnlinkAttempt = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId)
    if (!svc) return
    if (serviceHasData(svc)) {
      setUnlinkServiceId(serviceId)
    } else {
      updateService(serviceId, { obraNome: "", obraId: undefined, obraObj: undefined })
    }
  }

  const handleUnlinkDeleteService = () => {
    if (!unlinkServiceId) return
    const id = unlinkServiceId
    setUnlinkServiceId(null)
    if (services.length <= 1) {
      updateService(id, {
        obraNome: "",
        obraId: undefined,
        obraObj: undefined,
        descricao: "",
        materiais: [],
        equipa: meuNome ? [meuNome] : [],
        equipaUids: [],
        totalHoras: undefined,
      })
    } else {
      handleRemoveService(id)
    }
  }

  const adjustHours = (d: number) => setTotalHoras(prev => Math.max(0, prev + d))

  const unlinkService = unlinkServiceId ? services.find(s => s.id === unlinkServiceId) : null

  const handleSave = () => {
    if (!date || services.length === 0) return

    const taxa = existingEntry
      ? (resolveExistingTaxa(existingEntry) ?? data.settings.taxaHoraria)
      : data.settings.taxaHoraria

    addEntry({
      id: existingEntry?.id ?? uuidv4(),
      date: dateStr,
      totalHoras,
      normalHoras,
      extraHoras,
      services: services.map(s => ({
        id: s.id,
        obraNome: s.obraNome,
        obraId: s.obraId,
        descricao: s.descricao,
        equipa: s.equipa,
        equipaUids: s.equipaUids || [],
        materiais: s.materiais,       // preserved for retrocompatibility
        totalHoras: s.totalHoras,     // preserved for retrocompatibility
        fotos: s.fotos ?? [],         // fotos do serviço — retrocompatível
      })),
      descricao: services.length === 1 ? services[0].descricao : "Múltiplos serviços",
      equipa: services.flatMap(s => s.equipa),
      materiais: services.flatMap(s => s.materiais),
      taxaHoraria: taxa,
    })

    onClose()
  }

  const handleDelete = () => {
    if (dateStr) deleteEntry(dateStr)
    onClose()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={isOpen => !isOpen && onClose()}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-background h-auto max-h-[94dvh] min-h-[50dvh] overflow-hidden p-0 shadow-2xl [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="flex justify-center pt-3 pb-0.5 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/50" />
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-2.5 pb-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isEditing ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"}`}>
                      {isEditing ? "✏️ Editar" : "✨ Novo"}
                    </span>
                    {isWeekend && (
                      <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        🔆 Extra
                      </span>
                    )}
                  </div>
                  {date && <SheetTitle className="text-lg font-black leading-tight text-foreground capitalize">{date.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}</SheetTitle>}
                  {totalHoras > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      ≈ {fmt(totalHoras * data.settings.taxaHoraria)}
                    </p>
                  )}
                </div>
                <button type="button" onClick={onClose} className="w-9 h-9 rounded-2xl bg-muted/60 hover:bg-muted active:scale-90 flex items-center justify-center transition-all shrink-0 mt-0.5 press-effect">
                  <X className="h-4 w-4 text-foreground/50" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">

              {/* ── Horas do dia ── */}
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="px-3.5 py-2 border-b border-border/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Horas do dia</span>
                  </div>
                  {totalHoras > 0 && (
                    <div className="flex items-center gap-1.5">
                      {normalHoras > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">{normalHoras}h norm.</span>}
                      {extraHoras > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">{extraHoras}h extra</span>}
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2.5">
                  {/* Main stepper */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustHours(-1)}
                      className="w-11 h-11 rounded-2xl border-2 border-border/40 bg-background hover:bg-muted hover:border-border active:scale-90 flex items-center justify-center transition-all press-effect shadow-sm"
                    >
                      <Minus className="h-4 w-4 text-foreground/60" />
                    </button>
                    <div className="flex-1 flex flex-col items-center">
                      <Input
                        type="number"
                        value={totalHoras}
                        onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) setTotalHoras(Math.max(0, Math.floor(v))) }}
                        className="w-full h-12 text-center text-4xl font-black border-0 bg-transparent shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none tracking-tighter"
                        min={0}
                        step={1}
                      />
                      <p className="text-[10px] text-muted-foreground/40 -mt-1">
                        {totalHoras === 0 ? "Ausência / Ocorrência" : "horas"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustHours(1)}
                      className="w-11 h-11 rounded-2xl border-2 border-border/40 bg-background hover:bg-muted hover:border-border active:scale-90 flex items-center justify-center transition-all press-effect shadow-sm"
                    >
                      <Plus className="h-4 w-4 text-foreground/60" />
                    </button>
                  </div>
                  {/* Quick preset chips */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 4, 6, 8, 10].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setTotalHoras(h)}
                        className={`py-1.5 rounded-xl text-[11px] font-bold transition-all press-effect border ${totalHoras === h ? h === 0 ? 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400 shadow-sm' : 'bg-primary/10 border-primary/30 text-primary shadow-sm' : 'bg-background border-border/40 text-muted-foreground hover:bg-muted/60 hover:border-border'}`}
                      >
                        {h === 0 ? "Aus." : h + "h"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/30 text-center">{dayTypeLabel()}</p>
                </div>
              </div>

              {/* ── Serviços ── */}
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="px-3.5 py-2 border-b border-border/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hammer className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Serviços
                      {services.length > 1 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/12 text-primary text-[10px] font-bold">{services.length}</span>
                      )}
                    </span>
                  </div>
                  <button type="button" onClick={handleAddService} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/70 transition-colors px-2 py-1 rounded-lg hover:bg-primary/8 press-effect">
                    <Plus className="h-3 w-3" />Adicionar
                  </button>
                </div>

                {services.length > 0 && (
                  <Tabs value={activeServiceId || ""} onValueChange={id => setActiveServiceId(id)} className="w-full">
                    {services.length > 1 && (
                      <div className="px-4 pt-3 overflow-x-auto">
                        <TabsList className="flex w-max gap-1.5 bg-transparent p-0 h-auto">
                          {services.map((s, idx) => (
                            <TabsTrigger key={s.id} value={s.id} className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/40 bg-background/60 text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm hover:bg-muted/60">
                              {s.obraNome?.trim() || `Serviço ${idx + 1}`}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    )}

                    {services.map(s => (
                      <TabsContent key={s.id} value={s.id} className="px-3 py-3 space-y-3 mt-0">

                        {/* ── Obra / Serviço — manual first, list as secondary action ── */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.08em]">Obra</label>
                          

                          {s.obraId && s.obraObj ? (
                            // Obra vinculada
                            <ObraVinculadaCard
                              obra={s.obraObj}
                              obraNome={s.obraNome}
                              onInfo={() => setObraInfoSheet(s.obraObj!)}
                              onUnlink={() => handleUnlinkAttempt(s.id)}
                            />
                          ) : s.obraId && !s.obraObj ? (
                            // A carregar obra
                            <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-primary/18 bg-primary/[0.02]">
                              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold truncate">{s.obraNome}</p>
                                <p className="text-[11px] text-primary/40 mt-0.5">A carregar...</p>
                              </div>
                              <button type="button" onClick={() => handleUnlinkAttempt(s.id)} className="w-8 h-8 rounded-lg border border-border/35 bg-background hover:bg-red-50 flex items-center justify-center transition-all shrink-0">
                                <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                              </button>
                            </div>
                          ) : (
                            // Input manual — estado padrão, com botão de lista à direita
                            <div className="flex items-center gap-2">
                              <Input
                                value={s.obraNome}
                                onChange={e => updateService(s.id, { obraNome: e.target.value })}
                                placeholder="Nome da obra..."
                                className="flex-1 h-9 bg-background border-border/45 rounded-xl text-[13px] focus-visible:ring-primary/20"
                                autoFocus={false}
                              />
                              <button
                                type="button"
                                onClick={() => { setActiveServiceId(s.id); setShowObraPicker(true) }}
                                title="Escolher da lista de obras"
                                className="h-9 px-2.5 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 flex items-center gap-1.5 transition-all shrink-0 group press-effect"
                              >
                                <Search className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                                <span className="text-xs font-bold text-primary/60 group-hover:text-primary transition-colors">Lista</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* ── Descrição ── */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.08em]">Descrição</label>
                          <Textarea
                            value={s.descricao}
                            onChange={e => updateService(s.id, { descricao: e.target.value })}
                            placeholder="O que foi feito..."
                            className="min-h-[72px] bg-background border-border/45 rounded-xl text-[13px] resize-none focus-visible:ring-primary/20 leading-relaxed"
                          />
                        </div>

                        {/* ── Fotos do Serviço ── */}
                        <ServiceFotos
                          serviceId={s.id}
                          fotos={s.fotos ?? []}
                          onChange={fotos => updateService(s.id, { fotos })}
                          onUploadingChange={setIsUploading}
                        />

                        {/* ── Equipa ── */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.08em] flex items-center gap-1">
                              <Users className="h-3 w-3" /> Equipa
                            </label>
                            {s.equipa.length > 0 && (
                              <button
                                type="button"
                                onClick={openTeamSelector}
                                disabled={loadingCollaborators}
                                className="text-[9px] font-semibold text-primary hover:text-primary/70 transition-colors flex items-center gap-0.5 disabled:opacity-50 px-1.5 py-0.5 rounded-lg hover:bg-primary/8"
                              >
                                Editar <ChevronRight className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                          {s.equipa.length === 0 ? (
                            <button
                              type="button"
                              onClick={openTeamSelector}
                              disabled={loadingCollaborators}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all text-[12px] text-muted-foreground/50 hover:text-muted-foreground"
                            >
                              <Users className="h-4 w-4" />
                              <span>Tocar para selecionar equipa…</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              {s.equipa.map((nome, index) => {
                                const uid = s.equipaUids?.[index]
                                const isLegacy = !uid
                                const colors = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-pink-500","bg-teal-500"]
                                const colorIdx = nome.charCodeAt(0) % colors.length
                                const initials = nome.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join("")
                                return (
                                  <div
                                    key={`${nome}-${index}`}
                                    className={`inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl text-xs font-semibold border ${
                                      isLegacy
                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                        : "bg-primary/7 border-primary/15 text-primary"
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded-md shrink-0 flex items-center justify-center text-white text-[8px] font-bold ${colors[colorIdx]}`}>
                                      {initials || "?"}
                                    </div>
                                    {nome}
                                    <button
                                      type="button"
                                      onClick={() => updateService(s.id, {
                                        equipa: s.equipa.filter((_, i) => i !== index),
                                        equipaUids: s.equipaUids?.filter((_, i) => i !== index)
                                      })}
                                      className="w-4 h-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                )
                              })}
                              <button
                                type="button"
                                onClick={openTeamSelector}
                                disabled={loadingCollaborators}
                                className="w-7 h-7 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 flex items-center justify-center transition-all"
                                title="Editar equipa"
                              >
                                <Plus className="h-3.5 w-3.5 text-primary/60" />
                              </button>
                            </div>
                          )}
                        </div>

                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </div>

              {/* ── Remover serviço ── */}
              {services.length > 1 && activeService && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-destructive/12 hover:border-destructive/25 hover:bg-destructive/[0.025] transition-all group">
                      <div className="text-left">
                        <p className="text-xs font-semibold text-muted-foreground/50 group-hover:text-destructive/65 transition-colors">Remover serviço</p>
                        <p className="text-[11px] text-muted-foreground/35 truncate mt-0.5">"{activeService.obraNome?.trim() || `Serviço ${services.findIndex(s => s.id === activeServiceId) + 1}`}"</p>
                      </div>
                      <Trash2 className="h-4 w-4 text-muted-foreground/20 group-hover:text-destructive/45 transition-colors shrink-0" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover serviço?</AlertDialogTitle>
                      <AlertDialogDescription>O serviço será eliminado permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemoveService(activeServiceId!)} className="bg-destructive hover:bg-destructive/90 text-white">Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* ── Apagar dia ── */}
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border/25 hover:border-destructive/18 hover:bg-destructive/[0.018] transition-all group">
                      <div className="text-left">
                        <p className="text-xs font-medium text-muted-foreground/45 group-hover:text-destructive/55 transition-colors">Apagar registo do dia</p>
                        <p className="text-[10px] text-muted-foreground/28 mt-0.5">Remove todas as horas e serviços</p>
                      </div>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-destructive/38 transition-colors shrink-0" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-3">
                        <Trash2 className="h-6 w-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-center">Apagar registo?</AlertDialogTitle>
                      <AlertDialogDescription>Todos os dados de <strong>{date ? fmtFull(date) : ""}</strong> serão apagados permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">Apagar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {showSaveButton && (
              <div className="shrink-0 px-5 py-4 border-t border-border/20 bg-background/95 backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={services.length === 0 || isUploading}
                  className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-base transition-all shadow-xl shadow-emerald-600/25 press-effect"
                >
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {isUploading ? "A carregar fotos…" : isEditing ? "Guardar alterações" : "Guardar registo"}
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Team Selector ── */}
      <Sheet open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 max-h-[85dvh] flex flex-col p-0 shadow-2xl [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/50" />
          </div>

          <div className="shrink-0 px-5 pt-4 pb-3 space-y-3">
            <SheetHeader className="text-left space-y-0">
              <SheetTitle className="text-xl font-black">Selecionar Equipa</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {tempEquipa.length === 0 ? "Toca para selecionar os colaboradores" : `${tempEquipa.length} selecionado${tempEquipa.length !== 1 ? "s" : ""}`}
              </SheetDescription>
            </SheetHeader>
            <div className="relative">
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/45 pointer-events-none" />
              <Input
                placeholder="Filtrar colaboradores..."
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-primary/20 text-sm"
              />
            </div>

            {/* ── Adicionar membro manual ── */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                <Input
                  placeholder="Nome manual (ex: João Silva)..."
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addManualMember()}
                  className="pl-10 h-11 rounded-xl bg-amber-50/60 dark:bg-amber-950/15 border-amber-200/60 dark:border-amber-800/40 focus-visible:ring-amber-400/20 text-sm placeholder:text-muted-foreground/40"
                />
              </div>
              <button
                type="button"
                onClick={addManualMember}
                disabled={!manualName.trim()}
                className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold transition-all active:scale-95 shrink-0"
              >
                + Adicionar
              </button>
            </div>

            {tempEquipa.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tempEquipa.map(member => (
                  <span key={member.nome} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium border ${
                    member.isLegacy
                      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                      : "bg-primary/10 border-primary/18 text-primary"
                  }`}>
                    {member.nome}
                    {member.isLegacy && <span className="text-[9px] opacity-70">(manual)</span>}
                    <button type="button" onClick={() => toggleTempMember(member)} className="w-4 h-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center ml-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto border-t border-border/12">
            {colaboradoresFiltrados.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground/60">Nenhum resultado encontrado</div>
            ) : (
              colaboradoresFiltrados.map((collab) => {
                const isSelected = collab.uid
                  ? tempEquipa.some(m => m.uid === collab.uid)
                  : tempEquipa.some(m => m.nome === collab.nome)
                const initials = collab.nome.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join("")
                const colors = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-pink-500","bg-teal-500"]
                const colorIdx = collab.nome.charCodeAt(0) % colors.length
                return (
                  <button
                    key={collab.nome}
                    type="button"
                    onClick={() => toggleTempMember(collab)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all border-b border-border/10 last:border-0 press-effect ${
                      isSelected ? "bg-primary/6" : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold ${colors[colorIdx]} ${isSelected ? "ring-2 ring-primary/40 ring-offset-1" : ""} transition-all`}>
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${isSelected ? "text-primary font-semibold" : "text-foreground"}`}>{collab.nome}</span>
                      {collab.isLegacy && <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium">Adicionado manualmente</span>}
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? "bg-primary border-primary shadow-sm" : "border-border/60"}`}>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-border/12 bg-background pb-[calc(1.25rem+env(safe-area-inset-bottom))] flex gap-2.5">
            <button type="button" onClick={() => setShowTeamDialog(false)} className="flex-1 h-11 rounded-xl border border-border/45 bg-background hover:bg-muted text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={confirmTeamSelection} className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/88 active:scale-[0.98] text-primary-foreground text-sm font-bold transition-all">
              Confirmar ({tempEquipa.length})
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Obra Picker ── */}
      <ObraPicker open={showObraPicker} onClose={() => setShowObraPicker(false)} onSelect={handleObraSelect} />

      {/* ── Obra Info Sheet ── */}
      {obraInfoSheet && <ObraInfoSheet open={!!obraInfoSheet} onClose={() => setObraInfoSheet(null)} obra={obraInfoSheet} />}

      {/* ── Unlink Confirm ── */}
      <AlertDialog open={!!unlinkServiceId} onOpenChange={o => !o && setUnlinkServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/30 mx-auto mb-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-center">Dados já preenchidos</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center space-y-2.5 text-sm text-muted-foreground">
                <p>O serviço <strong className="text-foreground">"{unlinkService?.obraNome}"</strong> já tem dados preenchidos.</p>
                <p>Para desvincular a obra, o serviço tem de ser eliminado e recriado.</p>
                <div className="bg-amber-50 dark:bg-amber-950/18 border border-amber-200/45 dark:border-amber-800/35 rounded-xl px-4 py-2.5 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                  Os dados deste serviço serão perdidos.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter como está</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkDeleteService} className="bg-destructive hover:bg-destructive/90 text-white">
              {services.length <= 1 ? "Limpar serviço" : "Eliminar serviço"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}