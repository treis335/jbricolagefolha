// components/sub/sub-pagamento-dialog.tsx
// Registar um pagamento a uma empresa (admin/patrão). Pode ficar ligado a uma obra ou "Geral".
"use client"
import { useEffect, useMemo, useState } from "react"
import { Loader2, Landmark, Smartphone, Banknote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Obra } from "@/lib/obras-service"
import {
  type SubDia, type SubPagamento, type SubMetodo,
  addPagamento, resumoFinanceiro, resumoPorObra, fmtEuro, explainFirebaseError,
} from "@/lib/subempreiteiros-service"

const METODOS: { id: SubMetodo; Icon: typeof Banknote }[] = [
  { id: "Transferência", Icon: Landmark },
  { id: "MBWay", Icon: Smartphone },
  { id: "Dinheiro", Icon: Banknote },
]
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  subUid: string
  empresaNome: string
  dias: SubDia[]
  pagamentos: SubPagamento[]
  obras: Obra[]
  onSaved: () => void
}

export function SubPagamentoDialog({ open, onOpenChange, subUid, empresaNome, dias, pagamentos, obras, onSaved }: Props) {
  const r = useMemo(() => resumoFinanceiro(dias, pagamentos), [dias, pagamentos])
  const po = useMemo(() => resumoPorObra(dias, pagamentos), [dias, pagamentos])
  const [valor, setValor] = useState("")
  const [date, setDate] = useState(hoje())
  const [metodo, setMetodo] = useState<SubMetodo>("Transferência")
  const [nota, setNota] = useState("")
  const [obraSel, setObraSel] = useState("")
  const [saving, setSaving] = useState(false)

  // Ao abrir: se só uma obra tem valor por pagar, já vem escolhida e com o valor preenchido
  useEffect(() => {
    if (!open) return
    const comFalta = po.obras.filter(o => o.falta > 0.005)
    const unica = comFalta.length === 1 ? comFalta[0] : null
    setObraSel(unica?.obraId ?? "")
    setValor(unica ? String(unica.falta) : r.emDivida > 0 ? String(r.emDivida) : "")
    setDate(hoje()); setNota(""); setMetodo("Transferência")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const guardar = async () => {
    const v = parseFloat(valor.replace(",", "."))
    if (!isFinite(v) || v <= 0) { alert("Indica um valor válido."); return }
    setSaving(true)
    try {
      const ob = obras.find(o => o.id === obraSel)
      await addPagamento({
        subUid, empresaNome, date, valor: Math.round(v * 100) / 100, metodo, nota: nota.trim() || undefined,
        ...(ob ? { obraId: ob.id, obraNome: ob.nome } : {}),
      })
      onOpenChange(false); onSaved()
    } catch (err) { alert(`Não foi possível registar: ${explainFirebaseError(err)}`) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5 gap-5">
        <div>
          <DialogTitle className="text-lg font-black">Registar pagamento</DialogTitle>
          <DialogDescription className="text-xs">{empresaNome}{r.emDivida > 0 ? ` · em dívida ${fmtEuro(r.emDivida)}` : ""}</DialogDescription>
        </div>

        <div className="space-y-1.5">
          <label className={lbl}>Valor</label>
          <div className="relative">
            <Input inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00"
              className="h-14 rounded-2xl text-2xl font-black pr-10 tabular-nums" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">€</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={lbl}>Como pagaste</label>
          <div className="grid grid-cols-3 gap-2">
            {METODOS.map(({ id, Icon }) => (
              <button key={id} type="button" onClick={() => setMetodo(id)}
                className={cn("h-16 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all active:scale-95",
                  metodo === id ? "bg-primary/10 border-primary text-primary" : "bg-background border-border/50 text-muted-foreground")}>
                <Icon className="h-5 w-5" />{id}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={lbl}>Data</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className={lbl}>Obra</label>
            <select value={obraSel} onChange={e => setObraSel(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="">Geral</option>
              {obras.map(o => {
                const f = po.obras.find(x => x.obraId === o.id)
                return <option key={o.id} value={o.id}>{o.nome}{f && f.falta > 0.005 ? ` · falta ${fmtEuro(f.falta)}` : ""}</option>
              })}
            </select>
          </div>
        </div>

        <Input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota ou nº da fatura (opcional)" className="h-11 rounded-xl" />

        <button onClick={guardar} disabled={saving}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-primary/20">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar pagamento
        </button>
      </DialogContent>
    </Dialog>
  )
}
