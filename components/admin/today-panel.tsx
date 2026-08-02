// components/admin/today-panel.tsx
"use client"

import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { resolveEntryTaxa } from "@/lib/utils"
import type { Collaborator } from "@/hooks/useCollaborators"
import type { ServiceFoto } from "@/lib/types"
import {
  ChevronLeft, ChevronRight, ChevronDown,
  Clock, Camera, ZoomIn, X, Users2, Euro,
  HardHat, FileText, Users, Package, AlertCircle,
  ArrowLeft, ArrowRight, Sun, CalendarDays,
} from "lucide-react"

// ── Helpers ───────────────────────────────────────────────────────────────────
const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`

const fmtDay = (d: Date) =>
  d.toLocaleDateString("pt-PT", { weekday:"long", day:"numeric", month:"long" })

const isToday   = (key: string) => key === toKey(new Date())
const isWeekend = (d: Date)     => { const w = d.getDay(); return w === 0 || w === 6 }

const GRADS = [
  "from-blue-500 to-indigo-600","from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600","from-orange-500 to-amber-500",
  "from-pink-500 to-rose-600","from-cyan-400 to-sky-600",
]
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0,2).map(w => w[0]).join("").toUpperCase()
const grad = (name: string) => GRADS[name.charCodeAt(0) % GRADS.length]

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ fotos, start, onClose }: {
  fotos: (ServiceFoto & { svc?: string })[]
  start: number
  onClose: () => void
}) {
  const [cur, setCur] = useState(start)
  const tx = useRef<number|null>(null)
  const f  = fotos[cur]

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape")      onClose()
      if (e.key === "ArrowLeft")   setCur(c => Math.max(0, c-1))
      if (e.key === "ArrowRight")  setCur(c => Math.min(fotos.length-1, c+1))
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose, fotos.length])

  if (!f) return null
  return (
    <div
      className="fixed inset-0 z-[400] bg-black/95 flex flex-col"
      onClick={onClose}
      onTouchStart={e => { tx.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (!tx.current) return
        const dx = e.changedTouches[0].clientX - tx.current
        if (dx > 50)       setCur(c => Math.max(0, c-1))
        else if (dx < -50) setCur(c => Math.min(fotos.length-1, c+1))
        tx.current = null
      }}
    >
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0",
            f.tipo === "antes"
              ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
          )}>
            {f.tipo === "antes" ? "Antes" : "Depois"}
          </span>
          {f.svc && <span className="text-xs text-white/40 truncate">{f.svc}</span>}
          <span className="text-[11px] text-white/25 tabular-nums font-mono">{cur+1}/{fotos.length}</span>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/8 hover:bg-white/16 flex items-center justify-center">
          <X className="h-4 w-4 text-white/60" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 min-h-0 relative" onClick={e => e.stopPropagation()}>
        {cur > 0 && (
          <button onClick={() => setCur(c => c-1)}
            className="absolute left-2 z-10 w-10 h-10 rounded-2xl bg-white/8 hover:bg-white/16 flex items-center justify-center transition-all">
            <ArrowLeft className="h-5 w-5 text-white/60" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.url} alt="" className="max-w-full max-h-full object-contain rounded-2xl select-none shadow-2xl"
          style={{ maxHeight: "calc(100dvh - 130px)" }} />
        {cur < fotos.length-1 && (
          <button onClick={() => setCur(c => c+1)}
            className="absolute right-2 z-10 w-10 h-10 rounded-2xl bg-white/8 hover:bg-white/16 flex items-center justify-center transition-all">
            <ArrowRight className="h-5 w-5 text-white/60" />
          </button>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="flex justify-center gap-1.5 py-4 shrink-0" onClick={e => e.stopPropagation()}>
          {fotos.map((_, i) => (
            <button key={i} onClick={() => setCur(i)}
              className={cn("rounded-full transition-all duration-200",
                i === cur ? "w-5 h-[7px] bg-white" : "w-[7px] h-[7px] bg-white/25 hover:bg-white/50"
              )} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-[9px]" : "w-9 h-9 text-[11px]"
  return (
    <div className={cn(
      "rounded-xl bg-gradient-to-br flex items-center justify-center font-black text-white shrink-0 shadow-sm",
      sz, grad(name)
    )}>
      {initials(name)}
    </div>
  )
}

// ── CollabCard ────────────────────────────────────────────────────────────────
function CollabCard({ collab, dateKey }: { collab: Collaborator; dateKey: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [lb,   setLb]   = useState<{ fotos: (ServiceFoto & { svc?: string })[]; idx: number } | null>(null)

  const entry     = collab.entries?.find(e => e.date === dateKey) ?? null
  const horas     = Number(entry?.totalHoras  ?? 0)
  const extras    = Number(entry?.extraHoras   ?? 0)
  const normais   = Number(entry?.normalHoras  ?? Math.min(horas, 8))
  const taxa      = Number(entry ? resolveEntryTaxa(entry, collab.currentRate) : 0)
  const valor     = horas * taxa
  const services  = Array.isArray(entry?.services) && entry!.services!.length > 0 ? entry!.services! : []
  const obras     = [...new Set(services.map(s => s.obraNome).filter(Boolean))]
  const equipa    = [...new Set(services.flatMap(s => s.equipa    ?? []))]
  const materiais = [...new Set(services.flatMap(s => s.materiais ?? []))]
  const allFotos  = services.flatMap(s => (s.fotos ?? []).map(f => ({ ...f, svc: s.obraNome })))
  const fotosA    = allFotos.filter(f => f.tipo === "antes")
  const fotosD    = allFotos.filter(f => f.tipo === "depois")
  const isAbs     = horas === 0 && entry !== null
  const hasDetail = equipa.length > 0 || allFotos.length > 0 || materiais.length > 0 || !!entry?.descricao || services.some(s => s.descricao)

  return (
    <>
      <div className={cn(
        "rounded-2xl border bg-card overflow-hidden w-full transition-all duration-150",
        isAbs
          ? "border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10"
          : open
            ? "border-primary/25 shadow-sm"
            : "border-border/50 hover:border-border"
      )}>
        {/* Header row */}
        <div className="flex items-center gap-3 px-3.5 py-3 w-full min-w-0 overflow-hidden">
          {/* Status dot + avatar */}
          <div className="relative shrink-0">
            <Avatar name={collab.name} />
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
              entry === null ? "bg-muted-foreground/20"
              : isAbs        ? "bg-amber-400"
              :                "bg-emerald-500"
            )} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-bold text-foreground truncate leading-tight">{collab.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden flex-wrap">
              {isAbs ? (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Ausência</span>
              ) : (
                <>
                  <span className={cn("text-[11px] font-black tabular-nums shrink-0",
                    extras > 0 ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400")}>
                    {horas.toFixed(1)}h
                  </span>
                  {valor > 0 && (
                    <span className="text-[11px] text-muted-foreground/50 tabular-nums shrink-0">
                      · {valor.toFixed(0)}€
                    </span>
                  )}
                  {obras[0] && (
                    <span className="text-[11px] text-muted-foreground/60 truncate flex items-center gap-1 min-w-0">
                      <HardHat className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40" />
                      {obras[0]}{obras.length > 1 ? ` +${obras.length-1}` : ""}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Badges + actions */}
          <div className="flex items-center gap-1 shrink-0">
            {extras > 0 && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40">
                +{extras}h ext
              </span>
            )}
            {allFotos.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-violet-600 dark:text-violet-400 shrink-0 px-1">
                <Camera className="h-3 w-3" />{allFotos.length}
              </span>
            )}
            {hasDetail && (
              <button
                onClick={() => setOpen(o => !o)}
                className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-all active:scale-90"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200", open && "rotate-180")} />
              </button>
            )}
            <button
              onClick={() => router.push(`/admin/collaborator/${collab.id}`)}
              className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-all active:scale-90"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            </button>
          </div>
        </div>

        {/* Expandable */}
        {open && hasDetail && (
          <div className="border-t border-border/40 px-3.5 pb-3.5 pt-3 space-y-3 w-full overflow-hidden bg-muted/5">
            {/* Hours breakdown */}
            {!isAbs && horas > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                  <Clock className="h-3 w-3" />{normais}h normais
                </span>
                {extras > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 text-[11px] font-bold text-orange-700 dark:text-orange-300">
                    +{extras}h extra
                  </span>
                )}
                {valor > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-[11px] font-black text-emerald-700 dark:text-emerald-300 ml-auto">
                    <Euro className="h-3 w-3" />{valor.toFixed(2)}€
                  </span>
                )}
              </div>
            )}

            {/* Legacy description */}
            {entry?.descricao && services.length === 0 && (
              <div className="flex gap-2">
                <FileText className="h-3 w-3 text-muted-foreground/30 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{entry.descricao}</p>
              </div>
            )}

            {/* Services */}
            {services.map((s, si) => (
              <div key={s.id || si} className="space-y-1.5">
                {s.obraNome && (
                  <div className="flex items-center gap-1.5">
                    <HardHat className="h-3 w-3 text-orange-500/60 shrink-0" />
                    <span className="text-xs font-bold text-foreground/80 truncate">{s.obraNome}</span>
                  </div>
                )}
                {s.descricao && (
                  <p className="text-[11px] text-muted-foreground/65 leading-relaxed pl-5">{s.descricao}</p>
                )}
              </div>
            ))}

            {/* Equipa */}
            {equipa.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" /> Equipa
                </p>
                <div className="flex flex-wrap gap-1">
                  {equipa.map((e, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-primary/8 border border-primary/15 text-[11px] text-primary/80 font-medium">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Materiais */}
            {materiais.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1">
                  <Package className="h-2.5 w-2.5" /> Materiais
                </p>
                <div className="flex flex-wrap gap-1">
                  {materiais.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-muted/60 border border-border/50 text-[10px] text-muted-foreground/70">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fotos */}
            {allFotos.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
                  <Camera className="h-2.5 w-2.5" /> Fotos
                  {fotosA.length > 0 && <span className="text-amber-600/60 dark:text-amber-400/60 font-bold">{fotosA.length} antes</span>}
                  {fotosD.length > 0 && <span className="text-emerald-600/60 dark:text-emerald-400/60 font-bold">{fotosD.length} depois</span>}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {allFotos.map((f, fi) => (
                    <button
                      key={f.publicId || fi}
                      type="button"
                      onClick={() => setLb({ fotos: allFotos, idx: fi })}
                      className="relative w-12 h-12 rounded-xl overflow-hidden group border border-border/50 hover:border-primary/40 hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                        <ZoomIn className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                      </div>
                      <div className={cn(
                        "absolute top-1 left-1 w-1.5 h-1.5 rounded-full border border-white/30",
                        f.tipo === "antes" ? "bg-amber-400" : "bg-emerald-400"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {lb && <Lightbox fotos={lb.fotos} start={lb.idx} onClose={() => setLb(null)} />}
    </>
  )
}

// ── Absent pill ───────────────────────────────────────────────────────────────
function AbsentPill({ collab }: { collab: Collaborator }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-border/40 bg-muted/20 min-w-0 overflow-hidden">
      <div className="relative shrink-0">
        <Avatar name={collab.name} size="sm" />
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-muted-foreground/25 border-2 border-card" />
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground/60 truncate">
        {collab.name.split(" ")[0]}
      </span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TodayPanel({ collaborators }: { collaborators: Collaborator[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [collapsed,    setCollapsed]    = useState(false)

  const dateKey      = toKey(selectedDate)
  const todayKey     = toKey(new Date())
  const isTodayDay   = dateKey === todayKey
  const isWeekendDay = isWeekend(selectedDate)

  const goDay = useCallback((dir: -1 | 1) => {
    setSelectedDate(d => {
      const n = new Date(d)
      n.setDate(n.getDate() + dir)
      return n
    })
  }, [])

  const active    = collaborators.filter(c => c.ativo !== false)
  const worked    = active.filter(c => c.entries?.some(e => e.date === dateKey))
  const absent    = active.filter(c => !c.entries?.some(e => e.date === dateKey))
  const totalH    = worked.reduce((s, c) => { const e = c.entries?.find(e => e.date === dateKey); return s + Number(e?.totalHoras ?? 0) }, 0)
  const totalCost = worked.reduce((s, c) => { const e = c.entries?.find(e => e.date === dateKey); if (!e) return s; return s + Number(e.totalHoras ?? 0) * Number(resolveEntryTaxa(e, c.currentRate) || 0) }, 0)
  const totalF    = worked.reduce((s, c) => { const e = c.entries?.find(e => e.date === dateKey); return s + (e?.services ?? []).flatMap((sv: any) => sv.fotos ?? []).length }, 0)
  const pct       = active.length > 0 ? Math.round((worked.length / active.length) * 100) : 0

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden w-full shadow-sm">

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-border/30">

        {/* Day nav */}
        <div className="flex items-center gap-2 min-w-0 mb-3">
          {/* Day icon */}
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            isTodayDay
              ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-orange-500/20"
              : isWeekendDay
                ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-500/20"
                : "bg-muted"
          )}>
            {isTodayDay
              ? <Sun className="h-4 w-4 text-white" />
              : <CalendarDays className={cn("h-4 w-4", isWeekendDay ? "text-white" : "text-muted-foreground")} />
            }
          </div>

          <button
            onClick={() => goDay(-1)}
            className="w-8 h-8 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted flex items-center justify-center transition-all active:scale-90 shrink-0"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex-1 text-center min-w-0">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <p className="text-sm font-black text-foreground capitalize truncate">{fmtDay(selectedDate)}</p>
              {isTodayDay && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                  Hoje
                </span>
              )}
              {isWeekendDay && !isTodayDay && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 shrink-0">
                  Fim de semana
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              {isTodayDay ? "tempo real" : "histórico"}
            </p>
          </div>

          <button
            onClick={() => goDay(1)}
            disabled={isTodayDay}
            className="w-8 h-8 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted flex items-center justify-center transition-all active:scale-90 shrink-0 disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {!isTodayDay && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-2.5 h-8 rounded-xl text-[10px] font-black text-primary hover:bg-primary/8 border border-primary/25 transition-all shrink-0"
            >
              Hoje
            </button>
          )}

          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-8 h-8 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted flex items-center justify-center transition-all shrink-0"
          >
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground/60 transition-transform duration-300", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Em campo",  value: `${worked.length}/${active.length}`, icon: Users2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50" },
            { label: "Horas",     value: `${totalH.toFixed(1)}h`,              icon: Clock,  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50" },
            { label: "Custo",     value: `${totalCost.toFixed(0)}€`,           icon: Euro,   color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/50" },
            { label: "Fotos",     value: `${totalF}`,                          icon: Camera, color: "text-pink-600 dark:text-pink-400",     bg: "bg-pink-50 dark:bg-pink-950/30 border-pink-100 dark:border-pink-900/50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={cn("rounded-xl border px-2 py-2.5 text-center min-w-0 overflow-hidden", bg)}>
              <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1.5 opacity-60", color)} />
              <p className={cn("text-sm font-black tabular-nums leading-none truncate", color)}>{value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mt-1 truncate">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {!collapsed && active.length > 0 && (
          <div className="mt-3 h-1 bg-border/30 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", pct === 100 ? "bg-emerald-500" : "bg-primary/60")}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div className="p-3 space-y-2 w-full min-w-0 overflow-x-hidden">

          {/* Empty state */}
          {worked.length === 0 && (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center mx-auto">
                <CalendarDays className="h-6 w-6 text-muted-foreground/25" />
              </div>
              <p className="text-sm text-muted-foreground/60 font-medium">
                {isTodayDay ? "Aguarda registos da equipa" : "Sem registos neste dia"}
              </p>
            </div>
          )}

          {/* Worked cards */}
          {worked.map(c => (
            <CollabCard key={c.id} collab={c} dateKey={dateKey} />
          ))}

          {/* Absent grid */}
          {absent.length > 0 && worked.length > 0 && (
            <div className="pt-1 space-y-2">
              <div className="flex items-center gap-1.5 px-0.5">
                <AlertCircle className="h-3 w-3 text-muted-foreground/30" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  {isTodayDay ? "Ainda sem registo" : "Sem registo"} · {absent.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {absent.map(c => <AbsentPill key={c.id} collab={c} />)}
              </div>
            </div>
          )}

          {/* All absent */}
          {absent.length > 0 && worked.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {absent.map(c => <AbsentPill key={c.id} collab={c} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
