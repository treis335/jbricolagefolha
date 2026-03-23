// components/admin/admin-obras-view.tsx
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useAuth } from "@/lib/AuthProvider"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import {
  getObras, createObra, updateObra, deleteObra,
  uploadFotoObra, geocodeMorada, formatMorada,
  getGoogleMapsUrl, getWazeUrl,
  ESTADO_LABELS, ESTADO_COLORS,
  type Obra, type ObraEstado, type ObraLocalizacao,
} from "@/lib/obras-service"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  HardHat, Plus, Search, MapPin, Clock, Users, ChevronRight,
  Pencil, Trash2, X, Check, RefreshCw, Building2,
  Calendar, ArrowLeft, BarChart3, Camera, ImagePlus,
  Euro, Activity, MapIcon, LocateFixed, Loader2,
  BookOpen, Package, FileText,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

// ── Tipos ─────────────────────────────────────────────────────────────────

interface DiaryEntry {
  date: string
  colaborador: string
  totalHoras: number
  normalHoras: number
  extraHoras: number
  services: {
    obraNome: string
    obraId?: string
    descricao: string
    equipa: string[]
    materiais: string[]
    totalHoras?: number
  }[]
}

interface ObraStats {
  totalHoras: number
  totalCusto: number
  colaboradores: string[]
  ultimaAtividade: string | null
  totalEntradas: number
  diario: DiaryEntry[]
  todosMateriais: string[]
}

type View = "list" | "detail" | "create" | "edit"

// Cor automática por estado
const COR_POR_ESTADO: Record<string, string> = {
  ativa:     "#10b981",
  pausada:   "#f59e0b",
  concluida: "#64748b",
}

// ── EstadoBadge ───────────────────────────────────────────────────────────

function EstadoBadge({ estado, size = "sm" }: { estado: ObraEstado; size?: "xs" | "sm" }) {
  const ec = ESTADO_COLORS[estado]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold shrink-0 ${ec.bg} ${ec.text} ${
      size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
    }`}>
      <span className={`rounded-full shrink-0 ${ec.dot} ${size === "xs" ? "w-1 h-1" : "w-1.5 h-1.5"}`} />
      {ESTADO_LABELS[estado]}
    </span>
  )
}

// ── FotoUploader ──────────────────────────────────────────────────────────

function FotoUploader({ previewUrl, uploading, progress, onFileSelected, onRemove }: {
  previewUrl?: string; uploading: boolean; progress: number
  onFileSelected: (f: File) => void; onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-1.5 w-full min-w-0">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
        <Camera className="h-3 w-3 shrink-0" /> Foto
      </label>
      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden bg-muted border border-border/50 w-full" style={{ height: "160px" }}>
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2.5 px-4">
              <div className="w-full max-w-[140px] h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-white text-xs font-bold tracking-wide">{progress}%</p>
            </div>
          )}
          {!uploading && (
            <div className="absolute top-2 right-2 flex gap-1">
              <button type="button" onClick={() => inputRef.current?.click()}
                className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-colors">
                <Camera className="h-3.5 w-3.5 text-white" />
              </button>
              <button type="button" onClick={onRemove}
                className="w-7 h-7 rounded-lg bg-black/40 hover:bg-red-500/80 backdrop-blur-sm flex items-center justify-center transition-colors">
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/[0.02] transition-all group">
          <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
            <ImagePlus className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-none">Adicionar foto</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">JPG, PNG, WEBP</p>
          </div>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f); e.target.value = "" }} />
    </div>
  )
}

// ── MapaObra com Leaflet + pin draggable ──────────────────────────────────

interface MapaObraProps {
  localizacao: ObraLocalizacao
  nomeMorada: string
  onLocationUpdate?: (updates: {
    rua: string; cp: string; cidade: string; localizacao: ObraLocalizacao
  }) => void
}

function MapaObra({ localizacao, nomeMorada, onLocationUpdate }: MapaObraProps) {
  const mapsUrl = getGoogleMapsUrl(localizacao)
  const wazeUrl = getWazeUrl(localizacao)

  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onLocationUpdateRef = useRef(onLocationUpdate)
  const [editMode, setEditMode] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [reverseGeocoding, setReverseGeocoding] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { onLocationUpdateRef.current = onLocationUpdate }, [onLocationUpdate])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return
    if (editMode) {
      marker.dragging?.enable()
      const el = marker.getElement()?.querySelector("div")
      if (el) el.style.cursor = "grab"
    } else {
      marker.dragging?.disable()
      const el = marker.getElement()?.querySelector("div")
      if (el) el.style.cursor = "default"
    }
  }, [editMode])

  const doReverseGeocode = async (lat: number, lng: number) => {
    setReverseGeocoding(true); setSaved(false)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "pt" } }
      )
      const data = await res.json()
      const addr = data.address ?? {}
      const rua = [addr.road ?? addr.pedestrian ?? addr.footway ?? "", addr.house_number ?? ""].filter(Boolean).join(" ")
      const cp = addr.postcode ?? ""
      const cidade = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? ""
      const moradaCompleta = data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      onLocationUpdateRef.current?.({ rua, cp, cidade, localizacao: { lat, lng, moradaCompleta } })
      setSaved(true); setEditMode(false)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      onLocationUpdateRef.current?.({ rua: "", cp: "", cidade: "", localizacao: { lat, lng, moradaCompleta: `${lat.toFixed(6)}, ${lng.toFixed(6)}` } })
    } finally { setReverseGeocoding(false) }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    const initMap = () => {
      const L = (window as any).L
      if (!L || !mapRef.current || leafletMapRef.current) return

      const map = L.map(mapRef.current, { center: [localizacao.lat, localizacao.lng], zoom: 17, zoomControl: true, scrollWheelZoom: false })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map)

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#2563eb;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(37,99,235,0.5);cursor:default;"></div>`,
        className: "", iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -32],
      })

      const marker = L.marker([localizacao.lat, localizacao.lng], { icon, draggable: false }).addTo(map)
      marker.on("dragstart", () => setDragging(true))
      marker.on("dragend", async (e: any) => {
        setDragging(false)
        const { lat, lng } = e.target.getLatLng()
        await doReverseGeocode(lat, lng)
      })

      leafletMapRef.current = map
      markerRef.current = marker
    }

    const loadLeaflet = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"; link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }
      if ((window as any).L) { initMap(); return }
      if (document.getElementById("leaflet-js")) {
        const wait = setInterval(() => { if ((window as any).L) { clearInterval(wait); initMap() } }, 50)
        return
      }
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.id = "leaflet-js"; script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.onload = () => resolve(); script.onerror = () => reject()
        document.head.appendChild(script)
      })
      initMap()
    }

    loadLeaflet().catch(console.error)
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; markerRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([localizacao.lat, localizacao.lng])
      leafletMapRef.current?.setView([localizacao.lat, localizacao.lng], 17)
    }
  }, [localizacao.lat, localizacao.lng])

  return (
    <div className={`rounded-2xl border bg-card overflow-hidden w-full min-w-0 transition-all ${editMode ? "border-primary/50 ring-2 ring-primary/20" : "border-border/60"}`}>
      <div className="relative w-full" style={{ height: "200px" }}>
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

        {(dragging || reverseGeocoding || saved) && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none w-max max-w-[85vw]">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border backdrop-blur-sm ${saved ? "bg-emerald-500/90 text-white border-emerald-400/50" : "bg-background/95 text-foreground border-border/60"}`}>
              {reverseGeocoding && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
              {saved && <Check className="h-3 w-3 shrink-0" />}
              <span className="truncate">{dragging ? "Solta para confirmar…" : reverseGeocoding ? "A obter morada…" : "Morada atualizada ✓"}</span>
            </div>
          </div>
        )}

        {editMode && !dragging && !reverseGeocoding && !saved && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none w-max max-w-[85vw]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shadow-lg">
              <LocateFixed className="h-3 w-3 shrink-0" />
              <span>Arrasta o pin para o local correto</span>
            </div>
          </div>
        )}

        {onLocationUpdate && !dragging && !reverseGeocoding && (
          <div className="absolute top-2 right-2 z-[1000]">
            {editMode ? (
              <button onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/90 hover:bg-background backdrop-blur-sm border border-border/60 text-[11px] font-semibold text-muted-foreground hover:text-foreground shadow-sm transition-all active:scale-95">
                <X className="h-3 w-3 shrink-0" />Cancelar
              </button>
            ) : (
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/90 hover:bg-primary hover:text-primary-foreground backdrop-blur-sm border border-border/60 text-[11px] font-semibold text-foreground shadow-sm transition-all active:scale-95">
                <Pencil className="h-3 w-3 shrink-0" />Ajustar local
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5 w-full min-w-0">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed break-words min-w-0">{nomeMorada}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] active:scale-95 text-white text-xs font-bold transition-all shadow-sm min-w-0 overflow-hidden">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="truncate">Google Maps</span>
          </a>
          <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-[#05C8F7] hover:bg-[#04b0d9] active:scale-95 text-white text-xs font-bold transition-all shadow-sm min-w-0 overflow-hidden">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.003 2C6.477 2 2 6.477 2 12.003c0 2.41.868 4.617 2.301 6.332L3.5 21.5l3.289-.786A9.962 9.962 0 0 0 12.003 22C17.53 22 22 17.53 22 12.003S17.53 2 12.003 2zm4.398 13.538c-.19.538-.956 1.007-1.558 1.14-.415.09-.957.162-2.782-.597-2.337-.976-3.844-3.36-3.96-3.515-.112-.155-.944-1.258-.944-2.4s.59-1.703.8-1.937c.21-.233.458-.29.61-.29l.44.008c.14.006.33-.053.517.394.193.457.653 1.6.71 1.716.057.116.095.252.019.407-.077.155-.116.252-.23.387-.116.135-.243.302-.347.406-.115.116-.235.242-.1.474.134.232.596.984 1.28 1.593.88.784 1.622 1.027 1.854 1.142.232.116.367.097.502-.058.135-.155.578-.673.733-.905.154-.232.309-.193.52-.116.212.077 1.346.634 1.578.75.232.116.386.174.443.27.058.097.058.56-.132 1.1z"/>
            </svg>
            <span className="truncate">Waze</span>
          </a>
        </div>
      </div>
    </div>
  )
}

// ── ObraDetailTabs — Resumo + Diário + Materiais ──────────────────────────

function ObraDetailTabs({
  stats,
  fmtDate,
  fmtEur,
}: {
  stats: ObraStats
  fmtDate: (iso: string) => string
  fmtEur: (v: number) => string
}) {
  const [tab, setTab] = useState<"resumo" | "diario" | "materiais">("resumo")
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  const diarioAgrupado = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>()
    stats.diario.forEach(e => {
      const existing = map.get(e.date) ?? []
      map.set(e.date, [...existing, e])
    })
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [stats.diario])

  const materiaisContagem = useMemo(() => {
    const map = new Map<string, number>()
    stats.diario.forEach(e =>
      e.services.forEach(s =>
        s.materiais.forEach(m => map.set(m, (map.get(m) ?? 0) + 1))
      )
    )
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [stats.diario])

  return (
    <div className="space-y-3 min-w-0">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl border border-border/60 bg-background w-full">
        {([
          { id: "resumo",    label: "Resumo",    icon: BarChart3 },
          { id: "diario",    label: "Diário",    icon: BookOpen  },
          { id: "materiais", label: "Materiais", icon: Package   },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-semibold transition-all ${
              tab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: RESUMO ── */}
      {tab === "resumo" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { icon: Clock,    label: "Horas",         value: `${stats.totalHoras.toFixed(1)}h`, color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-950/25",      border: "border-blue-100 dark:border-blue-900/40"      },
              { icon: Euro,     label: "Custo",         value: fmtEur(stats.totalCusto),          color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/25", border: "border-emerald-100 dark:border-emerald-900/40" },
              { icon: Users,    label: "Colaboradores", value: `${stats.colaboradores.length}`,   color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/25",   border: "border-violet-100 dark:border-violet-900/40"  },
              { icon: Activity, label: "Registos",      value: `${stats.totalEntradas}`,          color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/25",   border: "border-orange-100 dark:border-orange-900/40"  },
            ].map(({ icon: Icon, label, value, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} ${bg} p-3 sm:p-4 min-w-0`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                  <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{label}</span>
                </div>
                <p className={`text-xl sm:text-2xl font-bold truncate ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {stats.colaboradores.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <h3 className="text-sm font-semibold truncate">Colaboradores</h3>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">{stats.colaboradores.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stats.colaboradores.map(nome => (
                  <span key={nome} className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary max-w-full truncate">{nome}</span>
                ))}
              </div>
            </div>
          )}

          {stats.ultimaAtividade && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/40 min-w-0">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground truncate">
                Última atividade: <strong className="text-foreground">{fmtDate(stats.ultimaAtividade)}</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: DIÁRIO ── */}
      {tab === "diario" && (
        <div className="space-y-2">
          {diarioAgrupado.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-muted/10 flex flex-col items-center justify-center py-12 text-center gap-2">
              <BookOpen className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum registo de diário ainda</p>
            </div>
          ) : (
            diarioAgrupado.map(([date, entries]) => {
              const isOpen = expandedEntry === date
              const totalHorasDia = entries.reduce((s, e) => s + e.totalHoras, 0)
              const equipaDia = [...new Set(entries.flatMap(e => e.services.flatMap(s => s.equipa)))]
              const materiaisDia = [...new Set(entries.flatMap(e => e.services.flatMap(s => s.materiais)))]

              return (
                <div key={date} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandedEntry(isOpen ? null : date)}
                    className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/8 border border-primary/15 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-semibold text-primary uppercase leading-none">
                        {new Date(date + "T12:00:00").toLocaleDateString("pt-PT", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold text-primary leading-tight">
                        {new Date(date + "T12:00:00").getDate()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold capitalize">
                          {new Date(date + "T12:00:00").toLocaleDateString("pt-PT", { weekday: "long" })}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {entries.length > 1 ? `${entries.length} colaboradores` : entries[0].colaborador}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />{totalHorasDia.toFixed(1)}h
                        </span>
                        {equipaDia.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3 shrink-0" />{equipaDia.length} pessoas
                          </span>
                        )}
                        {materiaisDia.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3 shrink-0" />{materiaisDia.length} materiais
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/40 divide-y divide-border/30">
                      {entries.map((entry, ei) => (
                        <div key={ei} className="p-3 sm:p-4 space-y-3 bg-muted/10">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-bold text-primary">
                                {entry.colaborador.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{entry.colaborador}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {entry.totalHoras.toFixed(1)}h
                                {entry.normalHoras > 0 && <span className="text-blue-600 dark:text-blue-400 ml-1">{entry.normalHoras}h normais</span>}
                                {entry.extraHoras > 0 && <span className="text-amber-600 dark:text-amber-400 ml-1">{entry.extraHoras}h extra</span>}
                              </p>
                            </div>
                          </div>

                          {entry.services.map((svc, si) => (
                            <div key={si} className="rounded-xl border border-border/40 bg-background p-3 space-y-2">
                              {svc.descricao && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  <p className="text-xs text-foreground leading-relaxed break-words min-w-0">{svc.descricao}</p>
                                </div>
                              )}
                              {svc.equipa.length > 0 && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex flex-wrap gap-1 min-w-0">
                                    {svc.equipa.map(n => (
                                      <span key={n} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/8 border border-primary/15 text-primary font-medium">{n}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {svc.materiais.length > 0 && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex flex-wrap gap-1 min-w-0">
                                    {svc.materiais.map((m, mi) => (
                                      <span key={mi} className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/50 text-foreground/70 font-medium">{m}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {svc.totalHoras !== undefined && (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {svc.totalHoras}h neste serviço
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── TAB: MATERIAIS ── */}
      {tab === "materiais" && (
        <div className="space-y-2">
          {materiaisContagem.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-muted/10 flex flex-col items-center justify-center py-12 text-center gap-2">
              <Package className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum material registado</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Todos os materiais usados</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{materiaisContagem.length}</span>
              </div>
              <div className="divide-y divide-border/30">
                {materiaisContagem.map(([material, count]) => (
                  <div key={material} className="flex items-center justify-between px-4 py-2.5 gap-3 min-w-0">
                    <span className="text-sm truncate text-foreground">{material}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground shrink-0 bg-muted px-2 py-0.5 rounded-full">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

export function AdminObrasView() {
  const { user } = useAuth()

  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<ObraEstado | "todas">("todas")
  const [view, setView] = useState<View>("list")
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [obraStats, setObraStats] = useState<ObraStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const [formNome, setFormNome] = useState("")
  const [formRua, setFormRua] = useState("")
  const [formCp, setFormCp] = useState("")
  const [formCidade, setFormCidade] = useState("")
  const [formDescricao, setFormDescricao] = useState("")
  const [formEstado, setFormEstado] = useState<ObraEstado>("ativa")
  const [formFotoUrl, setFormFotoUrl] = useState<string | undefined>()
  const [formFotoPublicId, setFormFotoPublicId] = useState<string | undefined>()
  const [formLocalizacao, setFormLocalizacao] = useState<ObraLocalizacao | undefined>()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [geocoding, setGeocoding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const loadObras = async () => {
    setLoading(true); setError(null)
    try { setObras(await getObras()) }
    catch { setError("Erro ao carregar obras.") }
    finally { setLoading(false) }
  }

  useEffect(() => { loadObras() }, [])

  const loadObraStats = async (obra: Obra) => {
    setLoadingStats(true); setObraStats(null)
    try {
      const snap = await getDocs(collection(db, "users"))
      let totalHoras = 0, totalCusto = 0, totalEntradas = 0
      const cols = new Set<string>()
      let ultimaAtividade: string | null = null
      const diario: DiaryEntry[] = []

      for (const d of snap.docs) {
        const ud = d.data()
        const entries: any[] = ud?.workData?.entries ?? []
        const taxa = ud?.workData?.settings?.taxaHoraria ?? 0
        const nome = ud?.username ?? ud?.name ?? d.id

        for (const e of entries) {
          const svcs: any[] = e.services ?? []

          // Match por obraId (novo) OU por nome (retrocompat)
          const svcsMatch = svcs.filter((s: any) =>
            s.obraId === obra.id ||
            s.obraNome?.trim().toLowerCase() === obra.nome.trim().toLowerCase()
          )
          const entryMatch = e.obraId === obra.id || svcsMatch.length > 0
          if (!entryMatch) continue

          const h = e.totalHoras ?? 0
          const t = e.taxaHoraria ?? taxa
          totalHoras += h; totalCusto += h * t; totalEntradas++
          cols.add(nome)
          if (!ultimaAtividade || e.date > ultimaAtividade) ultimaAtividade = e.date

          const svcsParaObra = svcsMatch.length > 0 ? svcsMatch : svcs

          diario.push({
            date: e.date,
            colaborador: nome,
            totalHoras: h,
            normalHoras: e.normalHoras ?? 0,
            extraHoras: e.extraHoras ?? 0,
            services: svcsParaObra.map((s: any) => ({
              obraNome: s.obraNome ?? obra.nome,
              obraId: s.obraId,
              descricao: s.descricao ?? "",
              equipa: s.equipa ?? [],
              materiais: s.materiais ?? [],
              totalHoras: s.totalHoras,
            })),
          })
        }
      }

      diario.sort((a, b) => b.date.localeCompare(a.date))

      const todosMateriais = [...new Set(
        diario.flatMap(e => e.services.flatMap(s => s.materiais))
      )]

      setObraStats({ totalHoras, totalCusto, colaboradores: Array.from(cols), ultimaAtividade, totalEntradas, diario, todosMateriais })
    } catch { setObraStats(null) }
    finally { setLoadingStats(false) }
  }

  const obrasFiltradas = useMemo(() => obras.filter(o => {
    const s = search.toLowerCase()
    const morada = formatMorada(o).toLowerCase()
    return (o.nome.toLowerCase().includes(s) || morada.includes(s)) &&
      (filtroEstado === "todas" || o.estado === filtroEstado)
  }), [obras, search, filtroEstado])

  const statsGlobais = useMemo(() => ({
    total: obras.length,
    ativas: obras.filter(o => o.estado === "ativa").length,
    pausadas: obras.filter(o => o.estado === "pausada").length,
    concluidas: obras.filter(o => o.estado === "concluida").length,
  }), [obras])

  const resetForm = () => {
    setFormNome(""); setFormRua(""); setFormCp(""); setFormCidade("")
    setFormDescricao(""); setFormEstado("ativa")
    setFormFotoUrl(undefined); setFormFotoPublicId(undefined); setFormLocalizacao(undefined)
    setPendingFile(null); setUploading(false); setUploadProgress(0)
    setGeocoding(false); setFormError("")
  }

  const openCreate = () => { resetForm(); setView("create") }
  const openEdit = (o: Obra) => {
    setFormNome(o.nome); setFormRua(o.moradaRua); setFormCp(o.moradaCodigoPostal)
    setFormCidade(o.moradaCidade); setFormDescricao(o.descricao)
    setFormEstado(o.estado); setFormFotoUrl(o.fotoUrl)
    setFormFotoPublicId(o.fotoPublicId); setFormLocalizacao(o.localizacao)
    setPendingFile(null); setUploading(false); setUploadProgress(0)
    setGeocoding(false); setFormError("")
    setSelectedObra(o); setView("edit")
  }
  const openDetail = (o: Obra) => { setSelectedObra(o); setView("detail"); loadObraStats(o) }

  const handleFileSelected = (file: File) => {
    const r = new FileReader()
    r.onload = e => setFormFotoUrl(e.target?.result as string)
    r.readAsDataURL(file)
    setPendingFile(file)
  }

  const handleGeocode = async () => {
    if (!formRua && !formCp && !formCidade) return
    setGeocoding(true)
    const loc = await geocodeMorada(formRua, formCp, formCidade)
    setGeocoding(false)
    if (!loc) { setFormError("Não foi possível localizar este endereço. Verifica os dados."); return }
    setFormError(""); setFormLocalizacao(loc)
  }

  const handleSave = async () => {
    if (!formNome.trim()) { setFormError("O nome da obra é obrigatório."); return }
    setSaving(true); setFormError("")
    try {
      let localizacao: ObraLocalizacao | undefined = formLocalizacao
      if (!localizacao && (formRua || formCp || formCidade)) {
        setGeocoding(true)
        localizacao = (await geocodeMorada(formRua, formCp, formCidade)) ?? undefined
        setGeocoding(false)
      }
      if (view === "create") {
        const newId = await createObra({
          nome: formNome.trim(), moradaRua: formRua.trim(),
          moradaCodigoPostal: formCp.trim(), moradaCidade: formCidade.trim(),
          localizacao, descricao: formDescricao.trim(),
          estado: formEstado, cor: COR_POR_ESTADO[formEstado],
          criadaPor: user?.uid ?? "",
          criadaPorNome: user?.displayName ?? user?.email ?? "Admin",
        })
        if (pendingFile) {
          setUploading(true); setUploadProgress(0)
          try {
            const { url, publicId } = await uploadFotoObra(pendingFile, newId, p => setUploadProgress(p))
            await updateObra(newId, { fotoUrl: url, fotoPublicId: publicId })
          } catch {} finally { setUploading(false) }
        }
      } else if (view === "edit" && selectedObra) {
        const updates: any = {
          nome: formNome.trim(), moradaRua: formRua.trim(),
          moradaCodigoPostal: formCp.trim(), moradaCidade: formCidade.trim(),
          descricao: formDescricao.trim(), estado: formEstado, cor: COR_POR_ESTADO[formEstado],
        }
        if (localizacao) updates.localizacao = localizacao
        if (pendingFile) {
          setUploading(true); setUploadProgress(0)
          try {
            const { url, publicId } = await uploadFotoObra(pendingFile, selectedObra.id, p => setUploadProgress(p))
            updates.fotoUrl = url; updates.fotoPublicId = publicId
          } catch {} finally { setUploading(false) }
        }
        if (!formFotoUrl && selectedObra.fotoUrl && !pendingFile) { updates.fotoUrl = null; updates.fotoPublicId = null }
        await updateObra(selectedObra.id, updates)
      }
      await loadObras(); setView("list")
    } catch { setFormError("Erro ao guardar. Tente novamente.") }
    finally { setSaving(false); setGeocoding(false) }
  }

  const handleDelete = async (id: string) => {
    try { await deleteObra(id); await loadObras(); setView("list") }
    catch { alert("Erro ao eliminar.") }
  }

  const handleEstadoQuick = async (obra: Obra, estado: ObraEstado) => {
    await updateObra(obra.id, { estado })
    setObras(prev => prev.map(o => o.id === obra.id ? { ...o, estado } : o))
    if (selectedObra?.id === obra.id) setSelectedObra(prev => prev ? { ...prev, estado } : prev)
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
  const fmtEur  = (v: number)  => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-7 w-7 text-primary" />
        <p className="text-sm text-muted-foreground">A carregar obras...</p>
      </div>
    </div>
  )

  // ── Detalhe ───────────────────────────────────────────────────────────
  if (view === "detail" && selectedObra) {
    const moradaCompleta = formatMorada(selectedObra)
    return (
      <ScrollArea className="h-full w-full">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 pb-28 space-y-4 overflow-x-hidden">

          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setView("list")}
              className="w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 flex-1">
              <span className="shrink-0">Obras</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="text-foreground font-medium truncate">{selectedObra.nome}</span>
            </div>
            <button onClick={() => openEdit(selectedObra)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold transition-colors shrink-0">
              <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Editar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <div className="lg:col-span-1 space-y-3 min-w-0">

              <div className="rounded-2xl overflow-hidden border border-border/60 bg-muted w-full" style={{ height: "200px" }}>
                {selectedObra.fotoUrl ? (
                  <img src={selectedObra.fotoUrl} alt={selectedObra.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ backgroundColor: selectedObra.cor + "18" }}>
                    <HardHat className="h-10 w-10 opacity-20" style={{ color: selectedObra.cor }} />
                    <p className="text-xs text-muted-foreground/40">Sem foto</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 w-full min-w-0">
                <div className="p-4 space-y-1.5 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedObra.cor }} />
                      <h2 className="font-bold text-base leading-tight truncate">{selectedObra.nome}</h2>
                    </div>
                    <EstadoBadge estado={selectedObra.estado} size="xs" />
                  </div>
                  {moradaCompleta && (
                    <div className="pl-5 space-y-0.5 min-w-0">
                      {selectedObra.moradaRua && <p className="text-xs text-muted-foreground break-words">{selectedObra.moradaRua}</p>}
                      {(selectedObra.moradaCodigoPostal || selectedObra.moradaCidade) && (
                        <p className="text-xs text-muted-foreground">{[selectedObra.moradaCodigoPostal, selectedObra.moradaCidade].filter(Boolean).join(" ")}</p>
                      )}
                    </div>
                  )}
                </div>

                {selectedObra.descricao && (
                  <div className="px-4 py-3 min-w-0">
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">{selectedObra.descricao}</p>
                  </div>
                )}

                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-xs gap-2">
                    <span className="text-muted-foreground shrink-0">Criada em</span>
                    <span className="font-medium text-right">{fmtDate(selectedObra.criadaEm)}</span>
                  </div>
                  {selectedObra.criadaPorNome && (
                    <div className="flex justify-between text-xs gap-2">
                      <span className="text-muted-foreground shrink-0">por</span>
                      <span className="font-medium truncate text-right">{selectedObra.criadaPorNome}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Estado</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["ativa", "pausada", "concluida"] as ObraEstado[]).map(estado => {
                      const ec = ESTADO_COLORS[estado]; const isActive = selectedObra.estado === estado
                      return (
                        <button key={estado} onClick={() => handleEstadoQuick(selectedObra, estado)}
                          className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${isActive ? `${ec.bg} ${ec.text} border-current` : "bg-background border-border/50 text-muted-foreground hover:bg-muted"}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? ec.dot : "bg-muted-foreground/30"}`} />
                          <span className="truncate w-full text-center px-1">{ESTADO_LABELS[estado]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {selectedObra.localizacao ? (
                <MapaObra localizacao={selectedObra.localizacao} nomeMorada={selectedObra.localizacao.moradaCompleta || moradaCompleta} />
              ) : moradaCompleta ? (
                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex items-start gap-3 min-w-0">
                  <MapIcon className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Localização não geocodificada</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">Edita a obra para atualizar a localização no mapa.</p>
                  </div>
                </div>
              ) : null}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/40 hover:border-destructive/30 hover:bg-destructive/[0.03] transition-all group">
                    <span className="text-xs text-muted-foreground/60 group-hover:text-destructive/70 transition-colors font-medium">Eliminar obra</span>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-destructive/50 transition-colors shrink-0" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
                  <AlertDialogHeader>
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                      <Trash2 className="h-6 w-6 text-destructive" />
                    </div>
                    <AlertDialogTitle className="text-center">Eliminar obra?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-center space-y-2 text-sm text-muted-foreground">
                        <p>A obra <strong className="text-foreground break-words">"{selectedObra.nome}"</strong> será eliminada permanentemente.</p>
                        <div className="bg-destructive/8 border border-destructive/20 rounded-lg px-4 py-2 text-destructive font-semibold text-xs">Esta ação não pode ser desfeita.</div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(selectedObra.id)} className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-white">Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Coluna direita — tabs */}
            <div className="lg:col-span-2 space-y-3 min-w-0">
              {loadingStats ? (
                <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6 text-primary" /></div>
              ) : obraStats ? (
                <ObraDetailTabs stats={obraStats} fmtDate={fmtDate} fmtEur={fmtEur} />
              ) : (
                <div className="rounded-2xl border border-border/40 bg-muted/10 flex flex-col items-center justify-center py-16 text-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                    <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <div className="px-4">
                    <p className="text-sm font-medium text-foreground">Sem registos ainda</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Os colaboradores podem selecionar esta obra ao registar o dia.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    )
  }

  // ── Criar / Editar ────────────────────────────────────────────────────
  if (view === "create" || view === "edit") {
    const isEdit = view === "edit"
    const previewMorada = [formRua, formCp, formCidade].filter(Boolean).join(", ")
    return (
      <div className="w-full overflow-x-hidden overflow-y-auto" style={{ boxSizing: "border-box" }}>
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 pb-28 space-y-4">

          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setView(isEdit ? "detail" : "list")}
              className="w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 flex-1">
              <span className="shrink-0">Obras</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="text-foreground font-medium truncate">{isEdit ? selectedObra?.nome : "Nova Obra"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 min-w-0 overflow-hidden">
            <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden border border-border/40">
              {formFotoUrl
                ? <img src={formFotoUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: COR_POR_ESTADO[formEstado] + "30" }}>
                    <HardHat className="h-5 w-5 shrink-0" style={{ color: COR_POR_ESTADO[formEstado] }} />
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-none">{formNome || "Nome da obra"}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{previewMorada || "Sem morada"}</p>
            </div>
            <EstadoBadge estado={formEstado} size="xs" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/30 w-full min-w-0">

            <div className="p-4 sm:p-5 space-y-2 min-w-0">
              <FotoUploader
                previewUrl={formFotoUrl} uploading={uploading} progress={uploadProgress}
                onFileSelected={handleFileSelected}
                onRemove={() => { setFormFotoUrl(undefined); setFormFotoPublicId(undefined); setPendingFile(null) }}
              />
              {!isEdit && pendingFile && !uploading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Guardada ao criar a obra</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Nome *</label>
              <Input value={formNome} onChange={e => setFormNome(e.target.value)}
                placeholder="ex: Reabilitação Edifício Rua do Ouro"
                className="h-11 rounded-xl border-border/60 bg-background text-sm focus-visible:ring-primary/30 w-full" />
            </div>

            <div className="p-4 sm:p-5 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                  <MapPin className="h-3 w-3 shrink-0" />Localização
                </label>
                <button type="button" onClick={handleGeocode} disabled={geocoding || (!formRua && !formCp && !formCidade)}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border/60 bg-background hover:bg-muted disabled:opacity-40 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all shrink-0">
                  {geocoding ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
                  {geocoding ? "A localizar..." : "Pré-visualizar"}
                </button>
              </div>

              <Input value={formRua} onChange={e => { setFormRua(e.target.value); setFormLocalizacao(undefined) }}
                placeholder="Rua / Avenida e número"
                className="h-11 rounded-xl border-border/60 bg-background text-sm focus-visible:ring-primary/30 w-full" />

              <div className="flex gap-2 min-w-0">
                <Input value={formCp} onChange={e => { setFormCp(e.target.value); setFormLocalizacao(undefined) }}
                  placeholder="0000-000"
                  className="w-28 shrink-0 h-11 rounded-xl border-border/60 bg-background text-sm focus-visible:ring-primary/30" />
                <Input value={formCidade} onChange={e => { setFormCidade(e.target.value); setFormLocalizacao(undefined) }}
                  placeholder="Cidade"
                  className="flex-1 min-w-0 h-11 rounded-xl border-border/60 bg-background text-sm focus-visible:ring-primary/30" />
              </div>

              <p className="text-[11px] text-muted-foreground/60 flex items-start gap-1.5">
                <LocateFixed className="h-3 w-3 shrink-0 mt-0.5" />
                <span>A localização no mapa é gerada automaticamente ao guardar.</span>
              </p>
            </div>

            {formLocalizacao && (
              <div className="p-4 sm:p-5 pt-0 min-w-0">
                <MapaObra
                  localizacao={formLocalizacao}
                  nomeMorada={[formRua, formCp, formCidade].filter(Boolean).join(", ")}
                  onLocationUpdate={({ rua, cp, cidade, localizacao }) => {
                    if (rua) setFormRua(rua)
                    if (cp) setFormCp(cp)
                    if (cidade) setFormCidade(cidade)
                    setFormLocalizacao(localizacao)
                  }}
                />
              </div>
            )}

            <div className="p-4 sm:p-5 space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Descrição</label>
              <Textarea value={formDescricao} onChange={e => setFormDescricao(e.target.value)}
                placeholder="Tipo de obra, âmbito, notas..."
                className="min-h-[80px] rounded-xl border-border/60 bg-background text-sm resize-none focus-visible:ring-primary/30 w-full" />
            </div>

            <div className="p-4 sm:p-5">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Estado</label>
                <div className="flex gap-2">
                  {(["ativa", "pausada", "concluida"] as ObraEstado[]).map(estado => {
                    const ec = ESTADO_COLORS[estado]; const isActive = formEstado === estado
                    return (
                      <button key={estado} type="button" onClick={() => setFormEstado(estado)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all min-w-0 ${
                          isActive ? `${ec.bg} ${ec.text} border-current` : "bg-background border-border/50 text-muted-foreground hover:bg-muted"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? ec.dot : "bg-muted-foreground/30"}`} />
                        <span className="truncate">{ESTADO_LABELS[estado]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {formError && <p className="text-xs text-destructive font-medium text-center">{formError}</p>}

          <button type="button" onClick={handleSave} disabled={saving || uploading || geocoding}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold text-sm transition-all shadow-sm">
            {saving || uploading || geocoding ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            <span>{geocoding ? "A geocodificar..." : uploading ? `Upload... ${uploadProgress}%` : isEdit ? "Guardar alterações" : "Criar obra"}</span>
          </button>

          {isEdit && selectedObra && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/40 hover:border-destructive/25 hover:bg-destructive/[0.03] transition-all group">
                  <span className="text-xs font-medium text-muted-foreground/60 group-hover:text-destructive/70 transition-colors">Eliminar esta obra</span>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-destructive/50 transition-colors shrink-0" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar obra?</AlertDialogTitle>
                  <AlertDialogDescription>A obra <strong className="break-words">"{selectedObra.nome}"</strong> será eliminada permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(selectedObra.id)} className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-white">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    )
  }

  // ── Lista ─────────────────────────────────────────────────────────────
  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 pb-28 space-y-4 overflow-x-hidden">

        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden md:flex w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 items-center justify-center shrink-0">
              <HardHat className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Obras</h1>
              <p className="text-xs text-muted-foreground">Gestão de projetos e obras</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={loadObras}
              className="w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 h-9 rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground text-xs font-bold transition-all shadow-sm">
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Nova Obra</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Total",      value: statsGlobais.total,      color: "text-foreground",                        bg: "bg-muted/40"                          },
            { label: "Ativas",     value: statsGlobais.ativas,     color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
            { label: "Pausadas",   value: statsGlobais.pausadas,   color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/20"     },
            { label: "Concluídas", value: statsGlobais.concluidas, color: "text-slate-500 dark:text-slate-400",     bg: "bg-slate-50 dark:bg-slate-900/20"     },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border border-border/40 ${bg} px-3 py-2.5 text-center min-w-0`}>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5 truncate">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome ou morada..."
              className="pl-8 h-9 rounded-xl border-border/60 bg-background text-sm focus-visible:ring-primary/30 w-full" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            )}
          </div>
          <div className="flex gap-1 p-1 rounded-xl border border-border/60 bg-background overflow-x-auto shrink-0">
            {(["todas", "ativa", "pausada", "concluida"] as const).map(estado => (
              <button key={estado} onClick={() => setFiltroEstado(estado)}
                className={`px-2.5 h-7 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  filtroEstado === estado ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                {estado === "todas" ? "Todas" : ESTADO_LABELS[estado]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        {obrasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 shrink-0">
              <Building2 className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-sm">{obras.length === 0 ? "Nenhuma obra criada" : "Nenhuma obra encontrada"}</p>
            <p className="text-xs text-muted-foreground mt-1 px-4">{obras.length === 0 ? "Cria a primeira obra para começar." : "Tenta outro filtro ou pesquisa."}</p>
            {obras.length === 0 && (
              <button onClick={openCreate}
                className="mt-4 flex items-center gap-1.5 px-4 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all">
                <Plus className="h-4 w-4 shrink-0" />Criar primeira obra
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {obrasFiltradas.map(obra => (
              <button key={obra.id} onClick={() => openDetail(obra)}
                className="w-full rounded-2xl border border-border/60 bg-card hover:border-border hover:shadow-md active:scale-[0.99] transition-all text-left group overflow-hidden min-w-0">
                <div className="relative overflow-hidden bg-muted w-full" style={{ height: "140px" }}>
                  {obra.fotoUrl ? (
                    <img src={obra.fotoUrl} alt={obra.nome} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center group-hover:scale-[1.03] transition-transform duration-500" style={{ backgroundColor: obra.cor + "18" }}>
                      <HardHat className="h-10 w-10 opacity-20" style={{ color: obra.cor }} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2"><EstadoBadge estado={obra.estado} size="xs" /></div>
                  <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full shadow-sm border border-white/20 shrink-0" style={{ backgroundColor: obra.cor }} />
                  {obra.localizacao && (
                    <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-3 min-w-0">
                  <div className="flex items-start justify-between gap-1.5 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate flex-1 min-w-0">{obra.nome}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
                  </div>
                  {(obra.moradaRua || obra.moradaCidade) && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 min-w-0">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{[obra.moradaRua, obra.moradaCidade].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5">{fmtDate(obra.criadaEm)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}