// day-entry-form.tsx
"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatLocalDate } from "@/lib/date-utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Plus, Minus, X, Trash2, Users, Check,
  Clock, Hammer, Search, HardHat, MapPin,
  PenLine, AlertTriangle, Info, Maximize2,
  ChevronRight, ZoomIn,
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
import {
  getObras,
  ESTADO_LABELS,
  ESTADO_COLORS,
  getGoogleMapsUrl,
  getWazeUrl,
  formatMorada,
  type Obra,
} from "@/lib/obras-service"

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
    return (
      sa.obraNome === sb.obraNome &&
      sa.obraId === sb.obraId &&
      sa.descricao === sb.descricao &&
      sa.totalHoras === sb.totalHoras &&
      sa.equipa.length === sb.equipa.length &&
      sa.equipa.every((e, j) => e === sb.equipa[j]) &&
      sa.materiais.length === sb.materiais.length &&
      sa.materiais.every((m, j) => m === sb.materiais[j])
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
// PhotoLightbox
// ─────────────────────────────────────────────────────────────────────────────
function PhotoLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
        <X className="h-5 w-5 text-white" />
      </button>
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ObraPicker
// ─────────────────────────────────────────────────────────────────────────────
interface ObraPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (obra: Obra) => void
}

function ObraPicker({ open, onClose, onSelect }: ObraPickerProps) {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSearch("")
    getObras()
      .then(list => setObras(list.filter(o => o.estado === "ativa")))
      .catch(() => setObras([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return obras
    return obras.filter(o =>
      o.nome.toLowerCase().includes(q) ||
      o.moradaCidade?.toLowerCase().includes(q) ||
      o.moradaRua?.toLowerCase().includes(q)
    )
  }, [obras, search])

  return (
    <>
      {lightboxSrc && <PhotoLightbox src={lightboxSrc} alt="Obra" onClose={() => setLightboxSrc(null)} />}
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-background max-h-[92dvh] flex flex-col p-0 shadow-2xl [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/50" />
          </div>
          <div className="shrink-0 px-5 pt-4 pb-3 space-y-3">
            <SheetHeader className="text-left space-y-0">
              <SheetTitle className="text-xl font-bold">Selecionar Obra</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">Obras ativas</SheetDescription>
            </SheetHeader>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              <Input
                placeholder="Pesquisar por nome ou localização..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-primary/20 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto border-t border-border/15">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  A carregar...
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <HardHat className="h-7 w-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {obras.length === 0 ? "Nenhuma obra ativa" : "Nenhum resultado"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/10">
                {filtered.map(obra => {
                  const ec = ESTADO_COLORS[obra.estado]
                  const morada = [obra.moradaRua, obra.moradaCidade].filter(Boolean).join(", ")
                  return (
                    <button
                      key={obra.id}
                      type="button"
                      onClick={() => { onSelect(obra); onClose() }}
                      className="w-full text-left flex items-center gap-3.5 px-5 py-4 hover:bg-muted/25 active:bg-muted/40 transition-colors group"
                    >
                      <div
                        className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-border/25 shadow-sm"
                        style={{ backgroundColor: obra.cor + "18" }}
                        onClick={e => { if (obra.fotoUrl) { e.stopPropagation(); setLightboxSrc(obra.fotoUrl) } }}
                      >
                        {obra.fotoUrl ? (
                          <>
                            <img src={obra.fotoUrl} alt={obra.nome} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                              <ZoomIn className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity drop-shadow" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <HardHat className="h-7 w-7 opacity-20" style={{ color: obra.cor }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">{obra.nome}</p>
                        {morada && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />{morada}
                          </p>
                        )}
                        <span className={`inline-flex items-center gap-1 mt-1.5 rounded-full text-[10px] font-bold px-1.5 py-0.5 ${ec.bg} ${ec.text}`}>
                          <span className={`w-1 h-1 rounded-full ${ec.dot}`} />
                          {ESTADO_LABELS[obra.estado]}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-border group-hover:text-muted-foreground shrink-0 transition-colors" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="shrink-0 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-border/15 bg-background">
            <button type="button" onClick={onClose} className="w-full h-11 rounded-xl bg-muted/50 hover:bg-muted text-sm font-semibold text-foreground transition-colors">
              Cancelar
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ObraInfoSheet
// ─────────────────────────────────────────────────────────────────────────────
interface ObraInfoSheetProps {
  open: boolean
  onClose: () => void
  obra: Obra
}

function ObraInfoSheet({ open, onClose, obra }: ObraInfoSheetProps) {
  const morada = formatMorada(obra)
  const hasLocation = !!obra.localizacao
  const mapsUrl = hasLocation ? getGoogleMapsUrl(obra.localizacao!) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(morada)}`
  const wazeUrl = hasLocation ? getWazeUrl(obra.localizacao!) : `https://waze.com/ul?q=${encodeURIComponent(morada)}`

  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (!open || !hasLocation || !mapRef.current) return

    const initMap = () => {
      const L = (window as any).L
      if (!L || !mapRef.current || leafletMapRef.current) return
      const loc = obra.localizacao!
      const map = L.map(mapRef.current, {
        center: [loc.lat, loc.lng],
        zoom: 16,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        attributionControl: false,
      })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map)
      const icon = L.divIcon({
        html: `<div style="width:22px;height:22px;background:#2563eb;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(37,99,235,0.4);"></div>`,
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      })
      L.marker([loc.lat, loc.lng], { icon }).addTo(map)
      leafletMapRef.current = map
    }

    const load = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }
      if ((window as any).L) { initMap(); return }
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script")
        s.id = "leaflet-js"
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        s.onload = () => res()
        s.onerror = rej
        document.head.appendChild(s)
      })
      initMap()
    }
    load().catch(console.error)

    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null }
    }
  }, [open, hasLocation, obra])

  return (
    <>
      {lightboxOpen && obra.fotoUrl && <PhotoLightbox src={obra.fotoUrl} alt={obra.nome} onClose={() => setLightboxOpen(false)} />}
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-background max-h-[90dvh] flex flex-col p-0 shadow-2xl [&>button]:hidden overflow-hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="w-10 h-1 rounded-full bg-white/40" />
          </div>

          <div className="relative shrink-0 w-full overflow-hidden" style={{ height: "230px" }}>
            {obra.fotoUrl ? (
              <img src={obra.fotoUrl} alt={obra.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${obra.cor}28, ${obra.cor}08)` }}>
                <HardHat className="h-20 w-20 opacity-10" style={{ color: obra.cor }} />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 px-5 pb-4 z-10">
              <SheetTitle className="text-xl font-bold text-foreground drop-shadow-sm line-clamp-2 leading-tight">{obra.nome}</SheetTitle>
              {morada && (
                <SheetDescription className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{morada}</span>
                </SheetDescription>
              )}
            </div>
            {obra.fotoUrl && (
              <button type="button" onClick={() => setLightboxOpen(true)} className="absolute bottom-4 right-5 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white text-[11px] font-semibold transition-all active:scale-95">
                <Maximize2 className="h-3 w-3" />Ampliar
              </button>
            )}
            <button type="button" onClick={onClose} className="absolute top-8 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-colors">
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {hasLocation ? (
              <div className="mx-5 mt-4 rounded-2xl overflow-hidden border border-border/25 shadow-sm" style={{ height: "160px" }}>
                <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
              </div>
            ) : (
              <div className="mx-5 mt-4 rounded-xl border border-border/30 bg-muted/20 px-4 py-3 flex items-center gap-2.5">
                <Info className="h-4 w-4 text-muted-foreground/35 shrink-0" />
                <p className="text-xs text-muted-foreground/70">Sem GPS registado nesta obra.</p>
              </div>
            )}

            <div className="px-5 pt-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Abrir em</p>
              <div className="grid grid-cols-2 gap-2.5">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.97] shadow-md" style={{ background: "linear-gradient(135deg,#4285F4,#3367D6)" }}>
                  Google Maps
                </a>
                <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.97]" style={{ background: "linear-gradient(135deg,#05C8F7,#04a8d0)" }}>
                  Waze
                </a>
              </div>
            </div>

            {obra.descricao && (
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">Notas</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{obra.descricao}</p>
              </div>
            )}
            <div className="h-4" />
          </div>

          <div className="shrink-0 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-border/15 bg-background">
            <button type="button" onClick={onClose} className="w-full h-12 rounded-2xl bg-muted/50 hover:bg-muted text-sm font-semibold text-foreground transition-colors">
              Fechar
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ObraVinculadaCard
// ─────────────────────────────────────────────────────────────────────────────
function ObraVinculadaCard({
  obra,
  obraNome,
  onInfo,
  onUnlink,
}: {
  obra: Obra
  obraNome: string
  onInfo: () => void
  onUnlink: () => void
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const morada = [obra.moradaRua, obra.moradaCidade].filter(Boolean).join(", ")
  const ec = ESTADO_COLORS[obra.estado]

  return (
    <>
      {lightboxOpen && obra.fotoUrl && <PhotoLightbox src={obra.fotoUrl} alt={obra.nome} onClose={() => setLightboxOpen(false)} />}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] overflow-hidden">
        {obra.fotoUrl && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="relative w-full overflow-hidden group block"
            style={{ height: "110px" }}
          >
            <img src={obra.fotoUrl} alt={obra.nome} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-semibold">
                <ZoomIn className="h-3.5 w-3.5" />Ampliar foto
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
          </button>
        )}

        <div className="flex items-center gap-3 px-3.5 py-3">
          {!obra.fotoUrl && (
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border border-border/25" style={{ backgroundColor: obra.cor + "18" }}>
              <HardHat className="h-4.5 w-4.5 opacity-20" style={{ color: obra.cor }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate text-foreground leading-snug">{obraNome}</p>
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full text-[9px] font-bold px-1.5 py-0.5 ${ec.bg} ${ec.text}`}>
                <span className={`w-1 h-1 rounded-full ${ec.dot}`} />{ESTADO_LABELS[obra.estado]}
              </span>
            </div>
            {morada && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="h-2.5 w-2.5 shrink-0" />{morada}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onInfo}
            title="Morada e navegação"
            className="w-9 h-9 rounded-xl border border-border/40 bg-background hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30 dark:hover:border-blue-800/50 flex items-center justify-center transition-all shrink-0 group"
          >
            <MapPin className="h-4 w-4 text-muted-foreground/60 group-hover:text-blue-500 transition-colors" />
          </button>

          <button
            type="button"
            onClick={onUnlink}
            title="Desvincular obra"
            className="w-9 h-9 rounded-xl border border-border/40 bg-background hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/25 dark:hover:border-red-800/40 flex items-center justify-center transition-all shrink-0 group"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DayEntryForm
// ─────────────────────────────────────────────────────────────────────────────
export function DayEntryForm({ date, open, onClose }: DayEntryFormProps) {
  const { getEntry, addEntry, deleteEntry, data } = useWorkTracker()
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

  const showSaveButton = isEditing ? hasChanges : hasAnyContent

  // ── Team Selector ──
  const colaboradoresFiltrados = useMemo(() => {
    const f = teamFilter.toLowerCase().trim()
    if (!f) return allCollaborators
    return allCollaborators.filter(c => c.nome.toLowerCase().includes(f))
  }, [teamFilter, allCollaborators])

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
            <div className="px-5 pt-3 pb-4 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${isEditing ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"}`}>
                      {isEditing ? "Editar registo" : "Novo registo"}
                    </span>
                    {isWeekend && (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        Extra
                      </span>
                    )}
                  </div>
                  {date && <SheetTitle className="text-2xl font-bold leading-tight text-foreground">{fmtShort(date)}</SheetTitle>}
                  {date && <p className="text-xs text-muted-foreground/70 capitalize mt-0.5">{date.toLocaleDateString("pt-PT", { weekday: "long" })}</p>}
                </div>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-foreground/8 hover:bg-foreground/14 active:scale-95 flex items-center justify-center transition-all shrink-0 mt-0.5">
                  <X className="h-3.5 w-3.5 text-foreground/60" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-10">

              {/* ── Horas do dia ── */}
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/25 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Horas do dia</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => adjustHours(-1)} className="w-12 h-12 rounded-xl border border-border/40 bg-background hover:bg-muted active:scale-95 flex items-center justify-center transition-all">
                      <Minus className="h-5 w-5 text-foreground/50" />
                    </button>
                    <Input
                      type="number"
                      value={totalHoras}
                      onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) setTotalHoras(Math.max(0, Math.floor(v))) }}
                      className="flex-1 h-14 text-center text-4xl font-black border-0 bg-transparent shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min={0}
                      step={1}
                    />
                    <button type="button" onClick={() => adjustHours(1)} className="w-12 h-12 rounded-xl border border-border/40 bg-background hover:bg-muted active:scale-95 flex items-center justify-center transition-all">
                      <Plus className="h-5 w-5 text-foreground/50" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {totalHoras > 0 ? (
                      <>
                        {normalHoras > 0 && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">{normalHoras}h normais</span>}
                        {extraHoras > 0 && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">{extraHoras}h extra</span>}
                      </>
                    ) : (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">Ausência / Ocorrência</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/35 text-center">{dayTypeLabel()}</p>
                </div>
              </div>

              {/* ── Serviços ── */}
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hammer className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Serviços
                      {services.length > 1 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/12 text-primary text-[10px] font-bold">{services.length}</span>
                      )}
                    </span>
                  </div>
                  <button type="button" onClick={handleAddService} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/70 transition-colors">
                    <Plus className="h-3.5 w-3.5" />Adicionar
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
                      <TabsContent key={s.id} value={s.id} className="p-4 space-y-4 mt-0">

                        {/* ── Obra / Serviço — manual first, list as secondary action ── */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Obra / Serviço</label>

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
                            <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-primary/18 bg-primary/[0.02]">
                              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{s.obraNome}</p>
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
                                placeholder="Nome da obra ou serviço..."
                                className="flex-1 h-11 bg-background border-border/45 rounded-xl text-sm focus-visible:ring-primary/20"
                              />
                              <button
                                type="button"
                                onClick={() => { setActiveServiceId(s.id); setShowObraPicker(true) }}
                                title="Selecionar da lista de obras"
                                className="h-11 px-3 rounded-xl border border-border/45 bg-background hover:bg-primary/5 hover:border-primary/30 flex items-center gap-1.5 transition-all shrink-0 group"
                              >
                                <Search className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                <span className="text-xs font-semibold text-muted-foreground/60 group-hover:text-primary transition-colors hidden sm:inline">Lista</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* ── Descrição ── */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Descrição</label>
                          <Textarea
                            value={s.descricao}
                            onChange={e => updateService(s.id, { descricao: e.target.value })}
                            placeholder="Descreve o trabalho realizado..."
                            className="min-h-[80px] bg-background border-border/45 rounded-xl text-sm resize-none focus-visible:ring-primary/20"
                          />
                        </div>

                        {/* ── Equipa ── */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest flex items-center gap-1.5">
                              <Users className="h-3 w-3" /> Equipa
                            </label>
                            <button
                              type="button"
                              onClick={openTeamSelector}
                              disabled={loadingCollaborators}
                              className="text-xs font-semibold text-primary hover:text-primary/70 transition-colors flex items-center gap-0.5 disabled:opacity-50"
                            >
                              Gerir <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="min-h-[34px] flex flex-wrap gap-1.5">
                            {s.equipa.length === 0 ? (
                              <span className="text-xs text-muted-foreground/35 italic self-center">Ninguém selecionado</span>
                            ) : (
                              s.equipa.map((nome, index) => {
                                const uid = s.equipaUids?.[index]
                                const isLegacy = !uid
                                return (
                                  <span
                                    key={`${nome}-${index}`}
                                    className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium border ${
                                      isLegacy
                                        ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                        : "bg-primary/7 border-primary/15 text-primary"
                                    }`}
                                  >
                                    {nome}
                                    {isLegacy && <span className="text-[9px] opacity-70 ml-0.5">(manual)</span>}
                                    <button
                                      type="button"
                                      onClick={() => updateService(s.id, {
                                        equipa: s.equipa.filter((_, i) => i !== index),
                                        equipaUids: s.equipaUids?.filter((_, i) => i !== index)
                                      })}
                                      className="w-4 h-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors ml-0.5"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                )
                              })
                            )}
                          </div>
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
                  disabled={services.length === 0}
                  className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-base transition-all shadow-lg shadow-emerald-600/18"
                >
                  <Check className="h-5 w-5" />Guardar registo
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
              <SheetTitle className="text-xl font-bold">Equipa</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">Colaboradores neste serviço</SheetDescription>
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
                return (
                  <button
                    key={collab.nome}
                    type="button"
                    onClick={() => toggleTempMember(collab)}
                    className={`w-full text-left px-5 py-3.5 flex justify-between items-center transition-colors border-b border-border/10 last:border-0 ${
                      isSelected ? "bg-primary/5 text-primary font-semibold" : "hover:bg-muted/25 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{collab.nome}</span>
                      {collab.isLegacy && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">(manual)</span>}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
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