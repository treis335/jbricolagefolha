// components/suggestion-banner.tsx
"use client"

import { useState } from "react"
import { Users, X, Check, ChevronDown, ChevronUp, HardHat, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePendingSuggestions } from "@/hooks/usePendingSuggestions"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import type { PendingSuggestion } from "@/lib/suggestions"
import { v4 as uuidv4 } from "uuid"

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-PT", {
    weekday: "short", day: "numeric", month: "short",
  })
}

function SuggestionCard({
  s,
  onImport,
  onDismiss,
}: {
  s: PendingSuggestion
  onImport: () => void
  onDismiss: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = s.descricao || s.materiais.length > 0

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-foreground leading-tight">
            {s.suggestedByName} adicionou-te
          </p>
          {s.obraNome ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
              <HardHat className="h-3 w-3 shrink-0 text-orange-500/60" />
              {s.obraNome}
            </p>
          ) : null}
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{fmtDate(s.date)}</p>
        </div>

        {hasDetail && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center shrink-0"
          >
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />}
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div className="px-4 pb-3 space-y-1.5">
          {s.descricao ? (
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed pl-11">{s.descricao}</p>
          ) : null}
          {s.materiais.length > 0 && (
            <div className="flex items-start gap-2 pl-11">
              <Package className="h-3 w-3 text-violet-500/50 shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {s.materiais.map((m, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-muted-foreground/60">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <button
          onClick={onImport}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-all"
        >
          <Check className="h-3.5 w-3.5" />
          Importar serviço
        </button>
        <button
          onClick={onDismiss}
          className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center active:scale-95 transition-all"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground/60" />
        </button>
      </div>
    </div>
  )
}

export function SuggestionBanner() {
  const { suggestions, dismiss } = usePendingSuggestions()
  const { addEntry, getEntry, data } = useWorkTracker()
  const { user } = useAuth()

  if (!suggestions.length) return null

  const handleImport = (s: PendingSuggestion) => {
    const taxa = data.settings.taxaHoraria

    // Check if there's already an entry for that day
    const existing = getEntry(s.date)

    if (existing) {
      // Append the new service to existing entry
      const newService = {
        id:        uuidv4(),
        obraNome:  s.obraNome,
        obraId:    "",
        descricao: s.descricao,
        equipa:    [],
        equipaUids: [],
        materiais: s.materiais,
        totalHoras: existing.totalHoras,
        fotos:     [],
      }
      addEntry({
        ...existing,
        services: [...(existing.services || []), newService],
        descricao: s.obraNome || existing.descricao,
      })
    } else {
      // Create new entry with 0 horas — user will fill in their own hours
      addEntry({
        id:         uuidv4(),
        date:       s.date,
        totalHoras: 0,
        normalHoras: 0,
        extraHoras: 0,
        taxaHoraria: taxa,
        services: [{
          id:         uuidv4(),
          obraNome:   s.obraNome,
          obraId:     "",
          descricao:  s.descricao,
          equipa:     [],
          equipaUids: [],
          materiais:  s.materiais,
          totalHoras: 0,
          fotos:      [],
        }],
        descricao: s.obraNome || s.descricao || "Serviço importado",
        equipa:    [],
        materiais: s.materiais,
      })
    }

    dismiss(s)
  }

  return (
    <div className="space-y-2 px-3 sm:px-4 pt-3">
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-primary/60" />
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
          {suggestions.length} sugestão{suggestions.length !== 1 ? "ões" : ""} de equipa
        </p>
      </div>
      {suggestions.map(s => (
        <SuggestionCard
          key={s.id}
          s={s}
          onImport={() => handleImport(s)}
          onDismiss={() => dismiss(s)}
        />
      ))}
    </div>
  )
}
