// components/admin/day-unlock-panel.tsx
"use client"

import { useState, useCallback } from "react"
import { LockOpen, Lock, Loader2, Check, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/lib/AuthProvider"
import {
  unlockDaysForUser,
  relockDaysForUser,
  isDayUnlocked,
  type UnlockedDay,
} from "@/lib/useGlobalSettings"

interface DayUnlockPanelProps {
  collaboratorId: string
  collaboratorName: string
  selectedDates: string[]        // datas seleccionadas pelo admin
  unlockedDays: UnlockedDay[]    // estado actual de desbloqueios
  onDone: () => void
}

const HOUR_OPTIONS = [
  { label: "24 horas", value: 24 },
  { label: "48 horas", value: 48 },
  { label: "72 horas", value: 72 },
]

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-PT", {
    day: "2-digit", month: "short",
  })
}

function fmtExpiry(isoUntil: string) {
  const d = new Date(isoUntil)
  const now = new Date()
  const diffH = Math.round((d.getTime() - now.getTime()) / 3600000)
  if (diffH <= 0) return "expirado"
  if (diffH < 24) return `expira em ${diffH}h`
  return `expira em ${Math.round(diffH / 24)}d`
}

export function DayUnlockPanel({
  collaboratorId,
  collaboratorName,
  selectedDates,
  unlockedDays,
  onDone,
}: DayUnlockPanelProps) {
  const { user } = useAuth()
  const [hours,   setHours]   = useState(24)
  const [loading, setLoading] = useState(false)
  const [mode,    setMode]    = useState<"unlock" | "relock">(() => {
    // Default to relock if all selected dates are already unlocked
    const allUnlocked = selectedDates.every(d => isDayUnlocked(unlockedDays, d))
    return allUnlocked ? "relock" : "unlock"
  })

  if (!selectedDates.length) return null

  const handleApply = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      if (mode === "unlock") {
        await unlockDaysForUser(collaboratorId, selectedDates, hours, user.uid)
        toast.success(
          `${selectedDates.length} dia${selectedDates.length !== 1 ? "s" : ""} desbloqueado${selectedDates.length !== 1 ? "s" : ""} por ${hours}h`
        )
      } else {
        await relockDaysForUser(collaboratorId, selectedDates)
        toast.success(
          `${selectedDates.length} dia${selectedDates.length !== 1 ? "s" : ""} voltou a ficar trancado${selectedDates.length !== 1 ? "s" : ""}`
        )
      }
      onDone()
    } catch {
      toast.error("Erro ao actualizar o estado dos dias")
    } finally {
      setLoading(false)
    }
  }, [mode, hours, collaboratorId, selectedDates, user, onDone])

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-100/60 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/30">
        <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <LockOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-amber-800 dark:text-amber-300">
            {selectedDates.length === 1 ? "Desbloquear dia" : `Desbloquear ${selectedDates.length} dias`}
          </p>
          <p className="text-[10px] text-amber-700/60 dark:text-amber-400/60 truncate">{collaboratorName}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Selected days chips */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Dias seleccionados</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selectedDates.sort().map(d => {
              const unlocked = isDayUnlocked(unlockedDays, d)
              const entry    = unlockedDays.find(u => u.date === d)
              return (
                <span key={d} className={cn(
                  "text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1",
                  unlocked
                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                    : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40"
                )}>
                  {unlocked ? <LockOpen className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                  {fmtDate(d)}
                  {unlocked && entry && (
                    <span className="text-[9px] opacity-60">· {fmtExpiry(entry.unlockedUntil)}</span>
                  )}
                </span>
              )
            })}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl">
          <button onClick={() => setMode("unlock")}
            className={cn("py-2 rounded-lg text-xs font-bold transition-all",
              mode === "unlock" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}>
            🔓 Desbloquear
          </button>
          <button onClick={() => setMode("relock")}
            className={cn("py-2 rounded-lg text-xs font-bold transition-all",
              mode === "relock" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}>
            🔒 Voltar a trancar
          </button>
        </div>

        {/* Duration (only for unlock) */}
        {mode === "unlock" && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> Janela de edição
            </p>
            <div className="flex gap-1.5">
              {HOUR_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setHours(opt.value)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                    hours === opt.value
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-muted/40 text-muted-foreground border-border/50 hover:border-border"
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
              O colaborador pode editar estes dias durante {hours}h.
              Após esse prazo voltam a ficar trancados automaticamente.
            </p>
          </div>
        )}

        {/* Info for relock */}
        {mode === "relock" && (
          <div className="px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              Remove o desbloqueio manual. Os dias voltam a obedecer ao prazo global imediatamente.
            </p>
          </div>
        )}

        {/* Apply button */}
        <button
          onClick={handleApply}
          disabled={loading}
          className={cn(
            "w-full h-11 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            mode === "unlock"
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20"
              : "bg-slate-600 hover:bg-slate-700 text-white shadow-sm"
          )}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />A guardar…</>
          ) : mode === "unlock" ? (
            <><LockOpen className="h-4 w-4" />Desbloquear {hours}h</>
          ) : (
            <><Lock className="h-4 w-4" />Voltar a trancar</>
          )}
        </button>
      </div>
    </div>
  )
}
