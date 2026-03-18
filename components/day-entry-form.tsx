//day-entry-form.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Plus, Minus, X, Trash2, Users, Check, ChevronRight, Clock, Hammer, Package } from "lucide-react"
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
import { getNomesColaboradores } from "@/lib/colaboradores"
import { v4 as uuidv4 } from "uuid"

interface DayEntryFormProps {
  date: Date | null
  open: boolean
  onClose: () => void
}

interface Service {
  id: string
  obraNome: string
  descricao: string
  equipa: string[]
  materiais: string[]
  totalHoras?: number
}

function resolveExistingTaxa(entry: DayEntry): number | undefined {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  if (Array.isArray((entry as any).services) && (entry as any).services.length > 0) {
    const s0Taxa = (entry as any).services[0]?.taxaHoraria
    if (typeof s0Taxa === "number" && s0Taxa > 0) return s0Taxa
  }
  return undefined
}

function entryToServices(entry: DayEntry): Service[] {
  if (Array.isArray((entry as any).services) && (entry as any).services.length > 0) {
    return (entry as any).services.map((s: any) => ({
      id: s.id ?? uuidv4(),
      obraNome: typeof s.obraNome === "string" ? s.obraNome : "",
      descricao: typeof s.descricao === "string" ? s.descricao : "",
      equipa: Array.isArray(s.equipa) ? [...new Set(s.equipa.filter((m: any) => typeof m === "string"))] as string[] : [],
      materiais: Array.isArray(s.materiais) ? s.materiais.filter((m: any) => typeof m === "string") : [],
      totalHoras: typeof s.totalHoras === "number" ? s.totalHoras : undefined,
    }))
  }
  return [{
    id: uuidv4(),
    obraNome: "",
    descricao: typeof entry.descricao === "string" ? entry.descricao : "",
    equipa: Array.isArray(entry.equipa) ? [...new Set(entry.equipa.filter((m: any) => typeof m === "string"))] as string[] : [],
    materiais: Array.isArray(entry.materiais) ? entry.materiais.filter((m: any) => typeof m === "string") : [],
    totalHoras: undefined,
  }]
}

function servicesEqual(a: Service[], b: Service[]): boolean {
  if (a.length !== b.length) return false
  return a.every((sa, i) => {
    const sb = b[i]
    return (
      sa.obraNome === sb.obraNome &&
      sa.descricao === sb.descricao &&
      sa.totalHoras === sb.totalHoras &&
      sa.equipa.length === sb.equipa.length &&
      sa.equipa.every((e, j) => e === sb.equipa[j]) &&
      sa.materiais.length === sb.materiais.length &&
      sa.materiais.every((m, j) => m === sb.materiais[j])
    )
  })
}

export function DayEntryForm({ date, open, onClose }: DayEntryFormProps) {
  const { getEntry, addEntry, deleteEntry, data } = useWorkTracker()

  const [totalHoras, setTotalHoras] = useState(8)
  const [services, setServices] = useState<Service[]>([])
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null)
  const [newMaterialInput, setNewMaterialInput] = useState("")
  const [initialHoras, setInitialHoras] = useState(8)
  const [initialServices, setInitialServices] = useState<Service[]>([])
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [tempEquipa, setTempEquipa] = useState<string[]>([])
  const [teamFilter, setTeamFilter] = useState("")

  const todosColaboradores = useMemo(() => getNomesColaboradores(), [])
  const colaboradoresFiltrados = useMemo(() => {
    const filter = teamFilter.toLowerCase().trim()
    return todosColaboradores.filter(nome => nome.toLowerCase().includes(filter))
  }, [teamFilter, todosColaboradores])

  const meuNome = typeof window !== "undefined" ? localStorage.getItem("meuNome") : null
  const dateStr = date ? date.toISOString().split("T")[0] : ""
  const existingEntry = dateStr ? getEntry(dateStr) : undefined
  const isEditing = !!existingEntry

  const { normalHoras, extraHoras } = useMemo(() => {
    if (!dateStr) return { normalHoras: 0, extraHoras: 0 }
    return calculateHours(dateStr, totalHoras)
  }, [dateStr, totalHoras])

  const isWeekend = date ? (date.getDay() === 0 || date.getDay() === 6) : false

  const getDayTypeLabel = () => {
    if (!date) return ""
    const d = date.getDay()
    if (d === 0) return "Domingo · horas todas extra"
    if (d === 6) return "Sábado · horas todas extra"
    return "Seg – Sex · primeiras 8h normais"
  }

  const formatDateFull = (d: Date) =>
    d.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const formatDateShort = (d: Date) =>
    d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })

  useEffect(() => {
    if (!date || !open) return
    if (existingEntry) {
      const horas = typeof existingEntry.totalHoras === "number" && existingEntry.totalHoras >= 0 ? existingEntry.totalHoras : 8
      const loadedServices = entryToServices(existingEntry)
      setTotalHoras(horas)
      setServices(loadedServices)
      setActiveServiceId(loadedServices[0]?.id ?? null)
      setInitialHoras(horas)
      setInitialServices(JSON.parse(JSON.stringify(loadedServices)))
    } else {
      const newService: Service = { id: uuidv4(), obraNome: "", descricao: "", equipa: meuNome ? [meuNome] : [], materiais: [], totalHoras: undefined }
      setServices([newService])
      setActiveServiceId(newService.id)
      setTotalHoras(8)
      setInitialHoras(8)
      setInitialServices(JSON.parse(JSON.stringify([newService])))
    }
    setNewMaterialInput("")
  }, [date, open, existingEntry, meuNome])

  const hasChanges = useMemo(() => {
    if (totalHoras !== initialHoras) return true
    return !servicesEqual(services, initialServices)
  }, [totalHoras, initialHoras, services, initialServices])

  const hasAnyContent = useMemo(() => {
    if (!isEditing) {
      return totalHoras !== 8 || services.some(s =>
        s.obraNome.trim() !== "" || s.descricao.trim() !== "" ||
        s.materiais.length > 0 || s.equipa.filter(e => e !== meuNome).length > 0
      )
    }
    return true
  }, [isEditing, totalHoras, services, meuNome])

  const showSaveButton = isEditing ? hasChanges : hasAnyContent

  const activeService = useMemo(
    () => services.find(s => s.id === activeServiceId) ?? services[0],
    [services, activeServiceId]
  )

  const handleAddService = () => {
    const newService: Service = { id: uuidv4(), obraNome: "", descricao: "", equipa: meuNome ? [meuNome] : [], materiais: [], totalHoras: undefined }
    setServices(prev => [...prev, newService])
    setActiveServiceId(newService.id)
    setNewMaterialInput("")
  }

  const handleRemoveService = (id: string) => {
    if (services.length <= 1) return
    const newServices = services.filter(s => s.id !== id)
    setServices(newServices)
    setActiveServiceId(newServices[0]?.id ?? null)
    setNewMaterialInput("")
    if (!date) return
    const taxaHoraria = existingEntry ? (resolveExistingTaxa(existingEntry) ?? data.settings.taxaHoraria) : data.settings.taxaHoraria
    const { normalHoras: nh, extraHoras: eh } = calculateHours(dateStr, totalHoras)
    const mappedServices = newServices.map(s => {
      const service: any = { id: s.id, obraNome: s.obraNome, descricao: s.descricao, equipa: s.equipa ?? [], materiais: s.materiais ?? [] }
      if (s.totalHoras !== undefined && s.totalHoras !== null) service.totalHoras = s.totalHoras
      return service
    })
    addEntry({
      id: existingEntry?.id ?? uuidv4(), date: dateStr, totalHoras, normalHoras: nh, extraHoras: eh,
      services: mappedServices,
      descricao: newServices.length === 1 ? newServices[0].descricao : "Múltiplos serviços",
      equipa: newServices.flatMap(s => s.equipa ?? []),
      materiais: newServices.flatMap(s => s.materiais ?? []),
      taxaHoraria,
    })
    onClose()
  }

  const updateActiveService = (updates: Partial<Service>) => {
    setServices(prev => prev.map(s => (s.id === activeServiceId ? { ...s, ...updates } : s)))
  }

  const handleSave = () => {
    if (!date || services.length === 0) return
    const mappedServices = services.map(s => {
      const service: any = { id: s.id, obraNome: s.obraNome, descricao: s.descricao, equipa: s.equipa ?? [], materiais: s.materiais ?? [] }
      if (s.totalHoras !== undefined && s.totalHoras !== null) service.totalHoras = s.totalHoras
      return service
    })
    const taxaHoraria = existingEntry ? (resolveExistingTaxa(existingEntry) ?? data.settings.taxaHoraria) : data.settings.taxaHoraria
    addEntry({
      id: existingEntry?.id ?? uuidv4(), date: dateStr, totalHoras, normalHoras, extraHoras,
      services: mappedServices,
      descricao: services.length === 1 ? services[0].descricao : "Múltiplos serviços",
      equipa: services.flatMap(s => s.equipa ?? []),
      materiais: services.flatMap(s => s.materiais ?? []),
      taxaHoraria,
    })
    onClose()
  }

  const handleDelete = () => {
    if (dateStr) { deleteEntry(dateStr); onClose() }
  }

  const adjustHours = (delta: number) => setTotalHoras(prev => Math.max(0, prev + delta))

  const addMaterialToActive = () => {
    if (newMaterialInput.trim()) {
      updateActiveService({ materiais: [...(activeService?.materiais ?? []), newMaterialInput.trim()] })
      setNewMaterialInput("")
    }
  }

  const removeMaterialFromActive = (index: number) => {
    updateActiveService({ materiais: (activeService?.materiais ?? []).filter((_, i) => i !== index) })
  }

  const openTeamSelector = () => {
    setTempEquipa([...(activeService?.equipa ?? [])])
    setTeamFilter("")
    setShowTeamDialog(true)
  }

  const toggleTempMember = (nome: string) => {
    setTempEquipa(prev => prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome])
  }

  const confirmTeamSelection = () => {
    updateActiveService({ equipa: [...tempEquipa] })
    setShowTeamDialog(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={isOpen => !isOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 bg-background h-auto max-h-[94dvh] min-h-[50dvh] overflow-hidden p-0 shadow-2xl [&>button]:hidden"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>

          <div className="flex flex-col h-full overflow-hidden">

            {/* ── Header ── */}
            <div className="px-5 pt-2 pb-4 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Badge novo/editar */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      isEditing
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                    }`}>
                      {isEditing ? "Editar" : "Novo registo"}
                    </span>
                    {isWeekend && (
                      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                        Extra
                      </span>
                    )}
                  </div>
                  {date && (
                    <SheetTitle className="text-xl font-bold leading-tight capitalize text-foreground">
                      {formatDateShort(date)}
                    </SheetTitle>
                  )}
                  {date && (
                    <p className="text-xs text-muted-foreground capitalize mt-0.5 font-medium">
                      {date.toLocaleDateString("pt-PT", { weekday: "long" })}
                    </p>
                  )}
                </div>

                {/* Fechar */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center transition-all shadow-sm shrink-0 mt-0.5"
                  aria-label="Fechar"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* ── Scroll area ── */}
            <div className="flex-1 overflow-y-auto px-5 space-y-5 pb-10">

              {/* ── Horas do dia ── */}
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horas do dia</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustHours(-1)}
                      className="w-12 h-12 rounded-xl border border-border bg-background hover:bg-muted active:scale-95 flex items-center justify-center transition-all shadow-sm"
                    >
                      <Minus className="h-5 w-5 text-foreground/70" />
                    </button>
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        value={totalHoras}
                        onChange={e => {
                          const val = Number(e.target.value)
                          if (!isNaN(val)) setTotalHoras(Math.max(0, Math.floor(val)))
                        }}
                        className="h-12 text-center text-3xl font-black border-0 bg-transparent shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min={0} step={1}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustHours(1)}
                      className="w-12 h-12 rounded-xl border border-border bg-background hover:bg-muted active:scale-95 flex items-center justify-center transition-all shadow-sm"
                    >
                      <Plus className="h-5 w-5 text-foreground/70" />
                    </button>
                  </div>

                  {/* Pills normais/extras */}
                  <div className="flex items-center justify-center gap-2">
                    {totalHoras > 0 ? (
                      <>
                        {normalHoras > 0 && (
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            {normalHoras}h normais
                          </span>
                        )}
                        {extraHoras > 0 && (
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            {extraHoras}h extra
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                        Ausência / Ocorrência
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground/60 text-center">{getDayTypeLabel()}</p>
                </div>
              </div>

              {/* ── Serviços ── */}
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hammer className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Serviços
                      {services.length > 1 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{services.length}</span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </button>
                </div>

                {services.length > 0 && (
                  <Tabs value={activeServiceId || ""} onValueChange={setActiveServiceId} className="w-full">

                    {/* Tab list — só mostra se houver mais de 1 */}
                    {services.length > 1 && (
                      <div className="px-4 pt-3 overflow-x-auto">
                        <TabsList className="flex w-max gap-1.5 bg-transparent p-0 h-auto">
                          {services.map((s, index) => (
                            <TabsTrigger
                              key={s.id}
                              value={s.id}
                              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition-all
                                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm
                                hover:bg-muted/60"
                            >
                              {s.obraNome?.trim() || `Serviço ${index + 1}`}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    )}

                    {services.map(s => (
                      <TabsContent key={s.id} value={s.id} className="p-4 space-y-4 mt-0">

                        {/* Nome da obra */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Nome da Obra / Serviço
                          </label>
                          <Input
                            value={s.obraNome}
                            onChange={e => updateActiveService({ obraNome: e.target.value })}
                            placeholder="ex: Reabilitação Casa Sr. António"
                            className="h-11 bg-background border-border/60 rounded-xl text-sm focus-visible:ring-primary/30"
                          />
                        </div>

                        {/* Descrição */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Descrição
                          </label>
                          <Textarea
                            value={s.descricao}
                            onChange={e => updateActiveService({ descricao: e.target.value })}
                            placeholder="Descreva o trabalho realizado..."
                            className="min-h-[80px] bg-background border-border/60 rounded-xl text-sm resize-none focus-visible:ring-primary/30"
                          />
                        </div>

                        {/* Horas deste serviço */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Horas neste serviço <span className="normal-case font-normal">(opcional)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateActiveService({ totalHoras: Math.max(0, (s.totalHoras ?? 0) - 1) })}
                              className="w-10 h-10 rounded-xl border border-border/60 bg-background hover:bg-muted active:scale-95 flex items-center justify-center transition-all"
                            >
                              <Minus className="h-4 w-4 text-foreground/60" />
                            </button>
                            <Input
                              type="number"
                              value={s.totalHoras ?? ""}
                              onChange={e => updateActiveService({ totalHoras: e.target.value === "" ? undefined : Number(e.target.value) })}
                              placeholder="—"
                              className="flex-1 h-10 text-center font-bold bg-background border-border/60 rounded-xl text-sm focus-visible:ring-primary/30"
                              min={0} step={0.5}
                            />
                            <button
                              type="button"
                              onClick={() => updateActiveService({ totalHoras: (s.totalHoras ?? 0) + 1 })}
                              className="w-10 h-10 rounded-xl border border-border/60 bg-background hover:bg-muted active:scale-95 flex items-center justify-center transition-all"
                            >
                              <Plus className="h-4 w-4 text-foreground/60" />
                            </button>
                          </div>
                        </div>

                        {/* Equipa */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Users className="h-3 w-3" /> Equipa
                            </label>
                            <button
                              type="button"
                              onClick={openTeamSelector}
                              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                              Selecionar <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="min-h-[36px] flex flex-wrap gap-1.5">
                            {s.equipa.length === 0 ? (
                              <span className="text-xs text-muted-foreground/50 italic self-center">Nenhum colaborador selecionado</span>
                            ) : (
                              s.equipa.map(nome => (
                                <span key={nome} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/8 border border-primary/20 text-xs font-medium text-primary">
                                  {nome}
                                  <button
                                    type="button"
                                    onClick={() => updateActiveService({ equipa: s.equipa.filter(n => n !== nome) })}
                                    className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Materiais */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Package className="h-3 w-3" /> Materiais
                          </label>
                          <div className="flex gap-2">
                            <Input
                              value={newMaterialInput}
                              onChange={e => setNewMaterialInput(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addMaterialToActive())}
                              placeholder="ex: Tinta 15L, Isocril..."
                              className="flex-1 h-10 bg-background border-border/60 rounded-xl text-sm focus-visible:ring-primary/30"
                            />
                            <button
                              type="button"
                              onClick={addMaterialToActive}
                              className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 flex items-center justify-center transition-all shadow-sm"
                            >
                              <Plus className="h-4 w-4 text-primary-foreground" />
                            </button>
                          </div>
                          {s.materiais.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {s.materiais.map((m, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-muted border border-border/50 text-xs font-medium text-foreground/70">
                                  {m}
                                  <button
                                    type="button"
                                    onClick={() => removeMaterialFromActive(idx)}
                                    className="w-4 h-4 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ))}
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
                <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Remover serviço</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        "{activeService.obraNome?.trim() || `Serviço ${services.findIndex(s => s.id === activeServiceId) + 1}`}"
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive hover:text-white hover:border-destructive active:scale-95 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Apagar
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover serviço?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-1.5 text-sm text-muted-foreground">
                              <p>O serviço <strong className="text-foreground">"{activeService.obraNome?.trim() || `Serviço ${services.findIndex(s => s.id === activeServiceId) + 1}`}"</strong> e todos os seus dados serão removidos.</p>
                              <p className="text-destructive font-medium">Esta ação não pode ser desfeita.</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveService(activeServiceId!)} className="bg-destructive hover:bg-destructive/90 text-white">
                            Sim, remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {/* ── Apagar dia — zona discreta ── */}
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border/40 hover:border-destructive/25 hover:bg-destructive/[0.03] transition-all group"
                    >
                      <div className="text-left">
                        <p className="text-xs font-medium text-muted-foreground/70 group-hover:text-destructive/70 transition-colors">
                          Apagar registo do dia
                        </p>
                        <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                          Remove todas as horas e serviços
                        </p>
                      </div>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-destructive/50 transition-colors shrink-0" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-3">
                        <Trash2 className="h-6 w-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-center">Apagar registo do dia?</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-2.5 text-sm text-muted-foreground text-center">
                          <p>
                            Estás prestes a apagar <strong className="text-foreground">todo o registo</strong> de{" "}
                            <strong className="text-foreground capitalize">{date ? formatDateFull(date) : ""}</strong>.
                          </p>
                          <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-2.5 text-destructive font-semibold text-xs">
                            Esta ação não pode ser desfeita.
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
                        Sim, apagar registo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

            </div>

            {/* ── Footer — botão guardar ── */}
            {showSaveButton && (
              <div className="shrink-0 px-5 py-4 border-t border-border/40 bg-background/95 backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={services.length === 0}
                  className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-base transition-all shadow-lg shadow-emerald-600/25"
                >
                  <Check className="h-5 w-5" />
                  Guardar registo
                </button>
              </div>
            )}

          </div>
        </SheetContent>
      </Sheet>

      {/* ── Seletor de equipa ── */}
      <Sheet open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 max-h-[85vh] flex flex-col p-0 shadow-2xl [&>button]:hidden"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-0 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>

          <div className="shrink-0 px-5 pt-4 pb-3 space-y-3">
            <SheetHeader className="text-left space-y-0.5">
              <SheetTitle className="text-lg font-bold">Equipa</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Seleciona os colaboradores para este serviço
              </SheetDescription>
            </SheetHeader>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Filtrar colaboradores..."
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-muted/40 border-border/50 focus-visible:ring-primary/30"
                autoFocus
              />
            </div>
            {tempEquipa.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tempEquipa.map(nome => (
                  <span key={nome} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                    {nome}
                    <button type="button" onClick={() => toggleTempMember(nome)} className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto border-t border-border/30">
            {colaboradoresFiltrados.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Nenhum colaborador encontrado</div>
            ) : (
              colaboradoresFiltrados.map(nome => {
                const isSelected = tempEquipa.includes(nome)
                return (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => toggleTempMember(nome)}
                    className={`w-full text-left px-5 py-3.5 flex justify-between items-center transition-colors border-b border-border/20 last:border-0 ${
                      isSelected ? "bg-primary/8 text-primary font-semibold" : "hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <span className="text-sm">{nome}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-border/30 bg-background pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowTeamDialog(false)}
                className="flex-1 h-11 rounded-xl border border-border/60 bg-background hover:bg-muted text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmTeamSelection}
                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground text-sm font-bold transition-all shadow-sm"
              >
                Confirmar ({tempEquipa.length})
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}