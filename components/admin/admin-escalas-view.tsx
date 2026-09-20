// components/admin/admin-escalas-view.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, HardHat, Users, Download, Loader2, CalendarDays } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ObraPicker } from "@/components/forms/obra-picker"
import { useCollaborators } from "@/hooks/useCollaborators"
import { formatLocalDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import type { Obra } from "@/lib/obras-service"
import {
  getEscalaDia, saveEscalaDia, limparEscalasPassadas,
  type EscalaEquipa,
} from "@/lib/escalas-service"

export function AdminEscalasView() {
  const { collaborators } = useCollaborators()
  const ativos = useMemo(() => collaborators.filter(c => c.ativo), [collaborators])

  const [date, setDate] = useState(() => formatLocalDate(new Date()))
  const [equipas, setEquipas] = useState<EscalaEquipa[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pickerForIndex, setPickerForIndex] = useState<number | null>(null)

  // Limpeza de escalas passadas — corre uma vez, quando o admin abre esta ferramenta
  useEffect(() => {
    limparEscalasPassadas(formatLocalDate(new Date())).catch(err => console.error(err))
  }, [])

  useEffect(() => {
    setLoading(true)
    setSaved(false)
    getEscalaDia(date)
      .then(setEquipas)
      .catch(() => setEquipas([]))
      .finally(() => setLoading(false))
  }, [date])

  const addEquipa = () => {
    setEquipas(prev => [...prev, { obraId: null, obraNome: "", obraMorada: "", colaboradorUids: [] }])
  }

  const removeEquipa = (idx: number) => {
    setEquipas(prev => prev.filter((_, i) => i !== idx))
  }

  const setObraManual = (idx: number, nome: string) => {
    setEquipas(prev => prev.map((eq, i) => i === idx ? { ...eq, obraId: null, obraNome: nome, obraMorada: "" } : eq))
  }

  const setObraFromPicker = (idx: number, obra: Obra) => {
    setEquipas(prev => prev.map((eq, i) => i === idx
      ? { ...eq, obraId: obra.id, obraNome: obra.nome, obraMorada: [obra.moradaRua, obra.moradaCidade].filter(Boolean).join(", ") }
      : eq
    ))
    setPickerForIndex(null)
  }

  const toggleColaborador = (idx: number, uid: string) => {
    setEquipas(prev => prev.map((eq, i) => {
      if (i !== idx) return eq
      const has = eq.colaboradorUids.includes(uid)
      return { ...eq, colaboradorUids: has ? eq.colaboradorUids.filter(u => u !== uid) : [...eq.colaboradorUids, uid] }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const validas = equipas.filter(eq => eq.obraNome.trim() && eq.colaboradorUids.length > 0)
      await saveEscalaDia(date, validas)
      setEquipas(validas)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleExportPdf = async () => {
    const { jsPDF } = await import("jspdf")
    const docPdf = new jsPDF()
    const [y, m, d] = date.split("-").map(Number)
    const dataFmt = new Date(y, m - 1, d).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

    docPdf.setFontSize(16)
    docPdf.text("Escala do dia", 14, 18)
    docPdf.setFontSize(11)
    docPdf.setTextColor(100)
    docPdf.text(dataFmt, 14, 26)

    let cursorY = 40
    equipas.forEach(eq => {
      if (!eq.obraNome.trim() || eq.colaboradorUids.length === 0) return
      docPdf.setFontSize(13)
      docPdf.setTextColor(20)
      docPdf.text(eq.obraNome, 14, cursorY)
      if (eq.obraMorada) {
        docPdf.setFontSize(9)
        docPdf.setTextColor(120)
        docPdf.text(eq.obraMorada, 14, cursorY + 5)
        cursorY += 5
      }
      cursorY += 8
      docPdf.setFontSize(10)
      docPdf.setTextColor(40)
      const nomes = eq.colaboradorUids
        .map(uid => collaborators.find(c => c.id === uid)?.name ?? uid)
        .join(", ")
      const linhas = docPdf.splitTextToSize(nomes, 180)
      docPdf.text(linhas, 18, cursorY)
      cursorY += linhas.length * 5 + 10
    })

    docPdf.save(`escala-${date}.pdf`)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
          <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight">Escala do dia</h1>
          <p className="text-xs text-muted-foreground/70">Quem vai para onde, sem folha de papel</p>
        </div>
      </div>

      {/* Seletor de data */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="h-11 px-3 rounded-xl border border-border/50 bg-card text-sm font-medium flex-1"
        />
      </div>

      {loading ? (
        <div className="py-10 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A carregar…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {equipas.map((eq, idx) => (
            <div key={idx} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-amber-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Nome da obra (ou escolhe uma existente)"
                  value={eq.obraNome}
                  onChange={e => setObraManual(idx, e.target.value)}
                  className="flex-1 h-9 px-2 rounded-lg border border-border/40 bg-background text-sm font-medium"
                />
                <button
                  onClick={() => setPickerForIndex(idx)}
                  className="h-9 px-2.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium shrink-0"
                >
                  Escolher
                </button>
                <button
                  onClick={() => removeEquipa(idx)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/30 shrink-0 group"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground/50 group-hover:text-red-500" />
                </button>
              </div>

              {eq.obraMorada && (
                <p className="text-[11px] text-muted-foreground/60 pl-6">{eq.obraMorada}</p>
              )}

              <div className="pl-6 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Equipa ({eq.colaboradorUids.length})
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pt-1">
                  {ativos.map(col => (
                    <label
                      key={col.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors",
                        eq.colaboradorUids.includes(col.id) ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={eq.colaboradorUids.includes(col.id)}
                        onCheckedChange={() => toggleColaborador(idx, col.id)}
                      />
                      <span className="truncate font-medium">{col.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addEquipa}
            className="w-full h-11 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-all"
          >
            <Plus className="h-4 w-4" /> Adicionar obra ao dia
          </button>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex-1 h-12 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                saved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90",
                saving && "opacity-60"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "Guardado ✓" : "Guardar escala"}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={equipas.length === 0}
              className="h-12 px-4 rounded-2xl bg-muted/60 hover:bg-muted disabled:opacity-40 flex items-center justify-center gap-2 text-sm font-semibold shrink-0"
            >
              <Download className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>
      )}

      {pickerForIndex !== null && (
        <ObraPicker
          open
          onClose={() => setPickerForIndex(null)}
          onSelect={obra => setObraFromPicker(pickerForIndex, obra)}
        />
      )}
    </div>
  )
}
