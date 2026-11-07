// components/sub/sub-job-sheet.tsx
// Formulário simples de trabalho (obra, título, descrição, fotos antes/depois).
// Usado pela empresa subempreiteira e pelo admin/patrão (que pode editar tudo).
"use client"
import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ServiceFotos } from "@/components/forms/service-fotos"
import type { ServiceFoto } from "@/lib/types"
import {
  type SubJob, type SubObra, type SubJobStatus, SUB_STATUS_LABELS, newJobId, saveJob, deleteJob,
} from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  job: SubJob | null            // null = novo
  obras: SubObra[]              // só as obras atribuídas a esta empresa
  subUid: string
  empresaNome: string
  createdBy: "empresa" | "admin"
}

const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function SubJobSheet({ open, onClose, onSaved, job, obras, subUid, empresaNome, createdBy }: Props) {
  const [id, setId] = useState("")
  const [obraNome, setObraNome] = useState("")
  const [obraId, setObraId] = useState<string | undefined>()
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [fotos, setFotos] = useState<ServiceFoto[]>([])
  const [status, setStatus] = useState<SubJobStatus>("em_curso")
  const [date, setDate] = useState(hoje())
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!open) return
    setId(job?.id ?? newJobId())
    const ativas = obras.filter(o => o.estado === "ativa")
    const inicial = job ? obras.find(o => o.id === job.obraId) : ativas.length === 1 ? ativas[0] : undefined
    setObraNome(job?.obraNome ?? inicial?.nome ?? "")
    setObraId(job?.obraId ?? inicial?.id)
    setTitulo(job?.titulo ?? "")
    setDescricao(job?.descricao ?? "")
    setFotos(job?.fotos ?? [])
    setStatus(job?.status ?? "em_curso")
    setDate(job?.date ?? hoje())
    setConfirmDel(false)
  }, [open, job, obras])

  const canSave = titulo.trim().length > 0 && !!obraId && !uploading && !saving

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
              {obras.length === 0 ? (
                <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">
                  Ainda não tens obras atribuídas. Pede ao responsável para criar uma obra para a tua empresa.
                </p>
              ) : (
                <select value={obraId ?? ""} onChange={e => { const o = obras.find(x => x.id === e.target.value); setObraId(o?.id); setObraNome(o?.nome ?? "") }}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="" disabled>Escolher obra…</option>
                  {obras.filter(o => o.estado === "ativa" || o.id === obraId).map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              )}
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

    </>
  )
}
