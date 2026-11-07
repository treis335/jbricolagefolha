// components/sub/sub-job-sheet.tsx
// Formulário simples de trabalho (obra, título, descrição, fotos antes/depois).
// Usado pela empresa subempreiteira e pelo admin/patrão (que pode editar tudo).
"use client"
import { useEffect, useState } from "react"
import { HardHat, Loader2, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ObraPicker } from "@/components/forms/obra-picker"
import { ServiceFotos } from "@/components/forms/service-fotos"
import type { ServiceFoto } from "@/lib/types"
import {
  type SubJob, type SubJobStatus, SUB_STATUS_LABELS, newJobId, saveJob, deleteJob,
} from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  job: SubJob | null            // null = novo
  subUid: string
  empresaNome: string
  createdBy: "empresa" | "admin"
}

const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function SubJobSheet({ open, onClose, onSaved, job, subUid, empresaNome, createdBy }: Props) {
  const [id, setId] = useState("")
  const [obraNome, setObraNome] = useState("")
  const [obraId, setObraId] = useState<string | undefined>()
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [fotos, setFotos] = useState<ServiceFoto[]>([])
  const [status, setStatus] = useState<SubJobStatus>("em_curso")
  const [date, setDate] = useState(hoje())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!open) return
    setId(job?.id ?? newJobId())
    setObraNome(job?.obraNome ?? "")
    setObraId(job?.obraId)
    setTitulo(job?.titulo ?? "")
    setDescricao(job?.descricao ?? "")
    setFotos(job?.fotos ?? [])
    setStatus(job?.status ?? "em_curso")
    setDate(job?.date ?? hoje())
    setConfirmDel(false)
  }, [open, job])

  const canSave = titulo.trim().length > 0 && obraNome.trim().length > 0 && !uploading && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await saveJob({
        id, subUid, empresaNome,
        obraNome: obraNome.trim(), obraId,
        titulo: titulo.trim(), descricao: descricao.trim(),
        fotos, status, date,
        createdBy: job?.createdBy ?? createdBy,
        createdAt: job?.createdAt,
      })
      onSaved()
      onClose()
    } catch {
      alert("Não foi possível guardar. Tenta novamente.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!job) return
    if (!confirmDel) { setConfirmDel(true); return }
    await deleteJob(job.id).catch(() => {})
    onSaved()
    onClose()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={o => !o && onClose()}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
            <SheetHeader className="text-left space-y-0">
              <SheetTitle className="text-xl font-black">{job ? "Editar trabalho" : "Novo trabalho"}</SheetTitle>
              <SheetDescription className="text-xs">{empresaNome || "Subempreiteiro"}</SheetDescription>
            </SheetHeader>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Obra</label>
              <div className="flex gap-2">
                <Input value={obraNome} onChange={e => { setObraNome(e.target.value); setObraId(undefined) }}
                  placeholder="Nome da obra" className="h-11 rounded-xl" />
                <button type="button" onClick={() => setPickerOpen(true)}
                  className="h-11 px-3 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95">
                  <HardHat className="h-4 w-4" />Escolher
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Título</label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Pintura da sala" className="h-11 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Descrição</label>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
                placeholder="O que foi feito…" className="rounded-xl resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Data</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Estado</label>
                <select value={status} onChange={e => setStatus(e.target.value as SubJobStatus)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                  {(Object.keys(SUB_STATUS_LABELS) as SubJobStatus[]).map(s => (
                    <option key={s} value={s}>{SUB_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            {id && (
              <ServiceFotos serviceId={id} fotos={fotos} onChange={setFotos}
                onUploadingChange={setUploading} userId={subUid} />
            )}

            <div className="flex gap-2.5 pt-1">
              {job && (
                <button type="button" onClick={handleDelete}
                  className={`h-11 px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 ${confirmDel ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive"}`}>
                  <Trash2 className="h-4 w-4" />{confirmDel ? "Confirmar" : ""}
                </button>
              )}
              <button type="button" onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-border/45 text-sm font-semibold">Cancelar</button>
              <button type="button" onClick={handleSave} disabled={!canSave}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
                {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? "A enviar fotos…" : "Guardar"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ObraPicker open={pickerOpen} onClose={() => setPickerOpen(false)} zClass="z-[110]"
        onSelect={o => { setObraNome(o.nome); setObraId(o.id); setPickerOpen(false) }} />
    </>
  )
}
