// components/admin/edit-day-modal.tsx
"use client"

import { useState } from "react"
import { Plus, Trash2, HardHat, Loader2, ShieldCheck, Unlock } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/AuthProvider"
import { cn } from "@/lib/utils"
import { salvarEdicaoAdmin, desbloquearEdicaoAdmin } from "@/lib/admin-day-editor-service"
import type { DayEntry, Service } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"

const HORAS_RAPIDAS = [0, 2, 4, 6, 8, 9, 10, 12]

interface EditDayModalProps {
  open: boolean
  onClose: () => void
  collaboratorId: string
  entry: DayEntry | null   // null quando o dia ainda não tem registo nenhum
  date: string             // YYYY-MM-DD, usado quando entry é null
  dateLabel: string
  onSaved: () => void
}

export function EditDayModal({ open, onClose, collaboratorId, entry, date, dateLabel, onSaved }: EditDayModalProps) {
  const { user } = useAuth()

  const [totalHoras, setTotalHoras] = useState<number>(entry?.totalHoras ?? 8)
  const [services, setServices] = useState<Service[]>(
    entry?.services && entry.services.length > 0
      ? entry.services
      : [{ id: uuidv4(), obraNome: "", descricao: entry?.descricao ?? "", equipa: [], materiais: [] }]
  )
  const [saving, setSaving] = useState(false)
  const [desbloqueando, setDesbloqueando] = useState(false)

  const jaEditadoPorAdmin = entry?.editadoPorAdmin === true

  const updateService = (idx: number, patch: Partial<Service>) => {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }
  const addService = () => setServices(prev => [...prev, { id: uuidv4(), obraNome: "", descricao: "", equipa: [], materiais: [] }])
  const removeService = (idx: number) => setServices(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const entryEditada: DayEntry = {
        id: entry?.id ?? uuidv4(),
        date,
        totalHoras,
        normalHoras: 0, // recalculado em salvarEdicaoAdmin
        extraHoras: 0,
        taxaHoraria: entry?.taxaHoraria,
        services: services.filter(s => s.obraNome.trim() || s.descricao.trim()),
      }
      await salvarEdicaoAdmin(collaboratorId, entryEditada, user.uid, user.displayName ?? "Admin")
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDesbloquear = async () => {
    setDesbloqueando(true)
    try {
      await desbloquearEdicaoAdmin(collaboratorId, date)
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setDesbloqueando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden gap-0 max-h-[85dvh] flex flex-col">
        <DialogTitle className="sr-only">Editar dia — {dateLabel}</DialogTitle>
        <DialogDescription className="sr-only">Corrigir horas, descrição e serviços deste dia</DialogDescription>

        <div className="px-6 pt-6 pb-4 bg-primary/5 border-b border-primary/10 shrink-0">
          <p className="text-base font-black tracking-tight capitalize">{dateLabel}</p>
          {jaEditadoPorAdmin ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Já editado por admin — o colaborador não pode alterar
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Depois de guardares, este dia fica bloqueado para o colaborador
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Horas totais */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Horas totais do dia</p>
            <div className="grid grid-cols-4 gap-1.5">
              {HORAS_RAPIDAS.map(h => (
                <button
                  key={h}
                  onClick={() => setTotalHoras(h)}
                  className={cn(
                    "h-10 rounded-xl text-sm font-bold border transition-all",
                    totalHoras === h
                      ? h === 0 ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400"
                        : "bg-primary/10 border-primary/30 text-primary"
                      : "bg-background border-border/40 text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {h === 0 ? "Ausência" : `${h}h`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={totalHoras}
              onChange={e => setTotalHoras(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-border/40 bg-background text-sm font-semibold"
              placeholder="Ou escreve um valor específico"
            />
          </div>

          {/* Serviços */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Obra / Descrição</p>
            {services.map((s, idx) => (
              <div key={s.id} className="rounded-2xl border border-border/50 bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <HardHat className="h-4 w-4 text-amber-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="Nome da obra"
                    value={s.obraNome}
                    onChange={e => updateService(idx, { obraNome: e.target.value })}
                    className="flex-1 h-9 px-2 rounded-lg border border-border/40 bg-background text-sm font-medium"
                  />
                  {services.length > 1 && (
                    <button onClick={() => removeService(idx)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/30 shrink-0 group">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-red-500" />
                    </button>
                  )}
                </div>
                <Textarea
                  placeholder="Descrição do trabalho…"
                  value={s.descricao}
                  onChange={e => updateService(idx, { descricao: e.target.value })}
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
            ))}
            <button
              onClick={addService}
              className="w-full h-9 rounded-xl border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar outra obra/serviço
            </button>
          </div>
        </div>

        <div className="p-4 pt-3 border-t border-border/40 shrink-0 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Guardar e bloquear para o colaborador
          </button>
          {jaEditadoPorAdmin && (
            <button
              onClick={handleDesbloquear}
              disabled={desbloqueando}
              className="w-full h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
            >
              {desbloqueando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
              Desbloquear (deixar o colaborador voltar a editar)
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
