// components/admin/entry-rate-override.tsx
// Painel que o admin usa para sobrepor a taxa de dias específicos de um colaborador
"use client"

import { useState, useCallback } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Euro, X, Check, Loader2, AlertTriangle, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface EntryRateOverrideProps {
  collaboratorId: string
  collaboratorName: string
  selectedDates: string[]          // ISO "YYYY-MM-DD"
  allEntries: any[]                // full entries array from Firebase
  defaultRate: number              // current collab rate (for display)
  onDone: () => void               // clears selection
}

export function EntryRateOverride({
  collaboratorId,
  collaboratorName,
  selectedDates,
  allEntries,
  defaultRate,
  onDone,
}: EntryRateOverrideProps) {
  const [taxa, setTaxa] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"override" | "reset">("override")

  // Entries that match selected dates
  const targetEntries = allEntries.filter(e => selectedDates.includes(e.date))
  const existingRates = [...new Set(targetEntries.map(e => e.taxaHoraria).filter(Boolean))]
  const hasOverrides  = existingRates.length > 0

  const handleApply = useCallback(async () => {
    if (mode === "override" && (!taxa || isNaN(Number(taxa)) || Number(taxa) <= 0)) {
      toast.error("Insere uma taxa válida (€/h)")
      return
    }
    if (targetEntries.length === 0) {
      toast.error("Nenhum dia selecionado tem registo de horas")
      return
    }

    setLoading(true)
    try {
      // Read current entries, patch the ones that match
      const newTaxa = mode === "override" ? Number(taxa) : undefined

      const updatedEntries = allEntries.map(entry => {
        if (!selectedDates.includes(entry.date)) return entry
        if (mode === "reset") {
          // Remove taxaHoraria field — use spread and delete
          const { taxaHoraria, ...rest } = entry
          return rest
        }
        return { ...entry, taxaHoraria: newTaxa }
      })

      await updateDoc(doc(db, "users", collaboratorId), {
        "workData.entries": updatedEntries,
      })

      const label = mode === "override"
        ? `${newTaxa?.toFixed(2)}€/h`
        : "taxa padrão"
      toast.success(
        `${targetEntries.length} dia${targetEntries.length !== 1 ? "s" : ""} actualizado${targetEntries.length !== 1 ? "s" : ""} → ${label}`
      )
      setTaxa("")
      onDone()
    } catch (err) {
      console.error(err)
      toast.error("Erro ao actualizar a taxa. Tenta novamente.")
    } finally {
      setLoading(false)
    }
  }, [mode, taxa, targetEntries, allEntries, selectedDates, collaboratorId, onDone])

  if (selectedDates.length === 0) return null

  return (
    <div className={cn(
      "rounded-2xl border bg-card shadow-lg overflow-hidden",
      "border-primary/20 ring-1 ring-primary/10"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Euro className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-foreground">
              {selectedDates.length === 1
                ? "Alterar taxa deste dia"
                : `Alterar taxa — ${selectedDates.length} dias`}
            </p>
            <p className="text-[10px] text-muted-foreground/60 truncate">
              {collaboratorName}
            </p>
          </div>
        </div>
        <button
          onClick={onDone}
          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground/60" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Selected days summary */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Dias seleccionados
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {selectedDates.sort().map(d => {
              const entry = allEntries.find(e => e.date === d)
              const hasRate = typeof entry?.taxaHoraria === "number"
              return (
                <span key={d} className={cn(
                  "text-[10px] font-semibold px-2 py-1 rounded-lg border",
                  !entry
                    ? "bg-muted/30 text-muted-foreground/40 border-border/30 italic"
                    : hasRate
                      ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/40"
                      : "bg-primary/8 text-primary border-primary/20"
                )}>
                  {new Date(d + "T00:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                  {!entry && " ∅"}
                  {hasRate && ` · ${entry.taxaHoraria}€`}
                </span>
              )
            })}
          </div>
          {targetEntries.length < selectedDates.length && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {selectedDates.length - targetEntries.length} dia(s) sem registo — serão ignorados
            </p>
          )}
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl">
          <button
            onClick={() => setMode("override")}
            className={cn(
              "py-2 rounded-lg text-xs font-bold transition-all",
              mode === "override"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Taxa específica
          </button>
          <button
            onClick={() => setMode("reset")}
            disabled={!hasOverrides}
            className={cn(
              "py-2 rounded-lg text-xs font-bold transition-all",
              mode === "reset"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
              !hasOverrides && "opacity-30 cursor-not-allowed"
            )}
          >
            Repor padrão
          </button>
        </div>

        {/* Input */}
        {mode === "override" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground/50">€</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder={defaultRate > 0 ? `Atual: ${defaultRate}€/h` : "Ex: 15.00"}
                  value={taxa}
                  onChange={e => setTaxa(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleApply()}
                  className={cn(
                    "w-full h-11 pl-8 pr-12 rounded-xl border border-border/50 bg-background",
                    "text-base font-black tabular-nums",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  )}
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/40 font-semibold">/h</span>
              </div>
            </div>

            {/* Quick presets */}
            {defaultRate > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest shrink-0">Rápido:</span>
                {[
                  { label: "Padrão",     value: defaultRate },
                  { label: "+10%",       value: Math.round(defaultRate * 1.1 * 100) / 100 },
                  { label: "+25%",       value: Math.round(defaultRate * 1.25 * 100) / 100 },
                  { label: "+50%",       value: Math.round(defaultRate * 1.5 * 100) / 100 },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setTaxa(String(preset.value))}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all",
                      taxa === String(preset.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:border-border"
                    )}
                  >
                    {preset.label} ({preset.value}€)
                  </button>
                ))}
              </div>
            )}

            {/* Preview */}
            {taxa && !isNaN(Number(taxa)) && Number(taxa) > 0 && (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Impacto: {targetEntries.length} entr{targetEntries.length !== 1 ? "adas" : "ada"}
                </span>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {Number(taxa).toFixed(2)}€/h
                  </span>
                  {defaultRate > 0 && (
                    <span className={cn(
                      "text-[10px] font-bold ml-2",
                      Number(taxa) > defaultRate
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    )}>
                      {Number(taxa) > defaultRate ? "+" : ""}
                      {((Number(taxa) - defaultRate) / defaultRate * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-3 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              Remove a taxa específica e volta a usar a taxa padrão do colaborador
              {defaultRate > 0 && ` (${defaultRate}€/h)`}.
            </p>
            {existingRates.length > 0 && (
              <p className="text-[10px] text-amber-700/60 dark:text-amber-400/60 mt-1.5">
                Taxas que serão removidas: {existingRates.map(r => `${r}€/h`).join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Apply button */}
        <button
          onClick={handleApply}
          disabled={loading || (mode === "override" && (!taxa || isNaN(Number(taxa)) || Number(taxa) <= 0))}
          className={cn(
            "w-full h-11 rounded-xl font-bold text-sm transition-all",
            "flex items-center justify-center gap-2",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            mode === "override"
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
              : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/20"
          )}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />A guardar…</>
          ) : mode === "override" ? (
            <><Check className="h-4 w-4" />Aplicar taxa</>
          ) : (
            <><RotateCcw className="h-4 w-4" />Repor padrão</>
          )}
        </button>
      </div>
    </div>
  )
}
