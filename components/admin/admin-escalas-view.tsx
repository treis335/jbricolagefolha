// components/admin/admin-escalas-view.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Plus, Trash2, HardHat, Users, Download, Loader2, CalendarDays,
  Pencil, X, ChevronRight, MapPin,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ObraPicker } from "@/components/forms/obra-picker"
import { useCollaborators } from "@/hooks/useCollaborators"
import { formatLocalDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import type { Obra } from "@/lib/obras-service"
import {
  getEscalaDia, saveEscalaDia, limparEscalasPassadas,
  type EscalaEquipa,
} from "@/lib/escalas-service"

const hojeStr = () => formatLocalDate(new Date())
const amanhaStr = () => formatLocalDate(new Date(Date.now() + 86400000))

function formatDataChip(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" })
}

export function AdminEscalasView() {
  const { collaborators } = useCollaborators()
  const ativos = useMemo(() => collaborators.filter(c => c.ativo), [collaborators])
  const nomeById = useMemo(() => new Map(collaborators.map(c => [c.id, c.name])), [collaborators])

  const [date, setDate] = useState(hojeStr)
  const [equipas, setEquipas] = useState<EscalaEquipa[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pickerForIndex, setPickerForIndex] = useState<number | null>(null)
  const [teamSheetForIndex, setTeamSheetForIndex] = useState<number | null>(null)

  useEffect(() => {
    limparEscalasPassadas(hojeStr()).catch(err => console.error(err))
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

  const equipasValidas = equipas.filter(eq => eq.obraNome.trim() && eq.colaboradorUids.length > 0)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await saveEscalaDia(date, equipasValidas)
      setEquipas(equipasValidas)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleExportPdf = async () => {
    const { default: jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const docPdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

    const [y, m, d] = date.split("-").map(Number)
    const dataFmt = new Date(y, m - 1, d).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

    // Logótipo no canto superior esquerdo
    try {
      const res = await fetch("/apple-icon.png")
      const blob = await res.blob()
      const logoDataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      docPdf.addImage(logoDataUrl, "PNG", 14, 10, 16, 16)
    } catch (err) {
      console.warn("[Escala PDF] logótipo não carregado:", err)
    }

    docPdf.setFont("helvetica", "bold")
    docPdf.setFontSize(16)
    docPdf.setTextColor(20)
    docPdf.text("JBRICOLAGE", 34, 17)
    docPdf.setFont("helvetica", "normal")
    docPdf.setFontSize(9)
    docPdf.setTextColor(120)
    docPdf.text("Escala do dia", 34, 23)

    docPdf.setFont("helvetica", "bold")
    docPdf.setFontSize(11)
    docPdf.setTextColor(20)
    const dataLabel = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1)
    docPdf.text(dataLabel, 283, 17, { align: "right" })
    docPdf.setFont("helvetica", "normal")
    docPdf.setFontSize(8)
    docPdf.setTextColor(140)
    docPdf.text(`${equipasValidas.length} obra${equipasValidas.length !== 1 ? "s" : ""} · ${equipasValidas.reduce((s, eq) => s + eq.colaboradorUids.length, 0)} colaboradores`, 283, 22, { align: "right" })

    docPdf.setDrawColor(220)
    docPdf.line(14, 30, 283, 30)

    // Uma linha por colaborador — obra e morada, tal como na folha de papel
    const linhas = equipasValidas.flatMap(eq =>
      eq.colaboradorUids.map(uid => [
        nomeById.get(uid) ?? uid,
        eq.obraNome,
        eq.obraMorada || "—",
      ])
    ).sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))

    autoTable(docPdf, {
      startY: 36,
      head: [["Colaborador", "Obra", "Morada"]],
      body: linhas,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 4, lineColor: [225, 225, 225], lineWidth: 0.2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 10 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 70 },
        1: { cellWidth: 90 },
      },
    })

    docPdf.save(`escala-${date}.pdf`)
  }

  const teamSheetEquipa = teamSheetForIndex !== null ? equipas[teamSheetForIndex] : null

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 pb-28">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
          <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight">Escala do dia</h1>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Quem vai para onde — sem folha de papel</p>
        </div>
      </div>

      {/* Seletor de data — chips rápidos + data específica */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-border/60 bg-card">
        {[{ label: "Hoje", value: hojeStr() }, { label: "Amanhã", value: amanhaStr() }].map(opt => (
          <button
            key={opt.value}
            onClick={() => setDate(opt.value)}
            className={cn(
              "flex-1 h-10 rounded-xl text-sm font-semibold transition-all",
              date === opt.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={cn(
            "h-10 px-3 rounded-xl text-sm font-semibold bg-transparent transition-all cursor-pointer shrink-0",
            date !== hojeStr() && date !== amanhaStr() ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        />
      </div>

      {/* Resumo rápido do dia selecionado */}
      {!loading && equipasValidas.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/25 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <HardHat className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Obras</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{equipasValidas.length}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/25 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Colaboradores</span>
            </div>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {equipasValidas.reduce((s, eq) => s + eq.colaboradorUids.length, 0)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A carregar…</span>
        </div>
      ) : (
        <div className="space-y-4">
          {equipas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center py-14 text-center gap-2.5">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                <HardHat className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">Ainda sem obras marcadas para {formatDataChip(date)}</p>
            </div>
          )}

          {equipas.map((eq, idx) => {
            const temObra = eq.obraNome.trim().length > 0

            return (
              <div key={idx} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                {!temObra ? (
                  <div className="p-5 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Nova obra</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPickerForIndex(idx)}
                        className="flex-1 h-11 rounded-xl bg-primary/8 border border-primary/20 hover:bg-primary/12 text-primary text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <HardHat className="h-4 w-4" /> Escolher obra existente
                      </button>
                      <button
                        onClick={() => removeEquipa(idx)}
                        className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/30 shrink-0 group"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground/50 group-hover:text-red-500" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-[10px] text-muted-foreground/50 font-semibold uppercase">ou</span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                    <input
                      type="text"
                      placeholder="Escreve o nome da obra…"
                      onChange={e => setObraManual(idx, e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border/40 bg-background text-sm font-medium"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-5">
                      <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                        <HardHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-base leading-tight truncate">{eq.obraNome}</p>
                        {eq.obraMorada && (
                          <p className="text-xs text-muted-foreground/60 flex items-center gap-1 mt-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" /> {eq.obraMorada}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setPickerForIndex(idx)}
                        title="Trocar obra"
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted shrink-0"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground/50" />
                      </button>
                      <button
                        onClick={() => removeEquipa(idx)}
                        title="Remover"
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/30 shrink-0 group"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground/50 group-hover:text-red-500" />
                      </button>
                    </div>

                    <div className="px-5 pb-5 space-y-2.5 border-t border-border/40 pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Equipa
                        </p>
                        <button
                          onClick={() => setTeamSheetForIndex(idx)}
                          className="text-[11px] font-semibold text-primary flex items-center gap-0.5"
                        >
                          Editar <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      {eq.colaboradorUids.length === 0 ? (
                        <button
                          onClick={() => setTeamSheetForIndex(idx)}
                          className="w-full h-10 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                        >
                          + Adicionar colaboradores
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {eq.colaboradorUids.map(uid => (
                            <span key={uid} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
                              {nomeById.get(uid) ?? "…"}
                              <button onClick={() => toggleColaborador(idx, uid)} className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => setTeamSheetForIndex(idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Adicionar
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}

          <button
            onClick={addEquipa}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-all"
          >
            <Plus className="h-4 w-4" /> Adicionar obra ao dia
          </button>

          {/* Barra de ações */}
          <div className="flex gap-2 pt-1">
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
              disabled={equipasValidas.length === 0}
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

      {/* Sheet de seleção de equipa */}
      <Sheet open={teamSheetForIndex !== null} onOpenChange={v => !v && setTeamSheetForIndex(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 bg-background max-h-[85dvh] flex flex-col p-0 shadow-2xl [&>button]:hidden sm:max-w-md sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl"
        >
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/50" />
          </div>
          <SheetHeader className="text-left px-5 pt-4 pb-2 space-y-0">
            <SheetTitle className="text-lg font-bold">Quem vai para {teamSheetEquipa?.obraNome || "esta obra"}?</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">Toca para marcar/desmarcar</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {ativos.map(col => {
              const checked = teamSheetForIndex !== null && equipas[teamSheetForIndex]?.colaboradorUids.includes(col.id)
              return (
                <button
                  key={col.id}
                  onClick={() => teamSheetForIndex !== null && toggleColaborador(teamSheetForIndex, col.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                    checked ? "bg-primary/8" : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                    checked ? "bg-primary border-primary" : "border-border"
                  )}>
                    {checked && <div className="w-2 h-2 rounded-sm bg-primary-foreground" />}
                  </div>
                  <span className="text-sm font-medium">{col.name}</span>
                </button>
              )
            })}
          </div>
          <div className="p-4 pt-2 border-t border-border/40 shrink-0">
            <button
              onClick={() => setTeamSheetForIndex(null)}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Concluído
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
