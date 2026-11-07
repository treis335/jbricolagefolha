// components/sub/sub-job-sheet.tsx
// Serviço dentro de uma obra: dia, descrição, mão-de-obra (homens × horas × €/h) e fotos antes/depois.
// Usado pela empresa e pelo admin/patrão (que pode editar tudo).
"use client"
import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ServiceFotos } from "@/components/forms/service-fotos"
import type { ServiceFoto } from "@/lib/types"
import {
  type SubJob, type SubObra, type SubJobStatus,
  SUB_STATUS_LABELS, newJobId, saveJob, deleteJob, explainFirebaseError,
} from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  job: SubJob | null   // null = novo
  obra: SubObra        // obra onde o serviço é adicionado
  subUid: string
  empresaNome: string
  createdBy: "empresa" | "admin"
}

const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

export function SubJobSheet({ open, onClose, onSaved, job, obra, subUid, empresaNome, createdBy }: Props) {
  const [id, setId] = useState("")
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
    setTitulo(job?.titulo ?? "")
    setDescricao(job?.descricao ?? "")
    setFotos(job?.fotos ?? [])
    setStatus(job?.status ?? "em_curso")
    setDate(job?.date ?? hoje())
    setConfirmDel(false)
  }, [open, job])

  const canSave = titulo.trim().length > 0 && !uploading && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await saveJob({
        id, subUid, empresaNome,
        obraNome: obra.nome, obraId: obra.id,
        titulo: titulo.trim(), descricao: descricao.trim(),
        fotos, status, date,
        createdBy: job?.createdBy ?? createdBy,
        createdAt: job?.createdAt,
      })
      onSaved()
      onClose()
    } catch (err) {
      alert(`Não foi possível guardar: ${explainFirebaseError(err)}`)
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
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="z-[120] rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
          <SheetHeader className="text-left space-y-0">
            <SheetTitle className="text-xl font-black">{job ? "Editar serviço" : "Novo serviço"}</SheetTitle>
            <SheetDescription className="text-xs">{obra.nome} · {empresaNome || "Subempreiteiro"}</SheetDescription>
          </SheetHeader>

          <div className="space-y-1.5">
            <label className={lbl}>Serviço</label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Pintura da sala" className="h-11 rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <label className={lbl}>Descrição</label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
              placeholder="O que foi feito…" className="rounded-xl resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Dia</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Estado</label>
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
  )
}
