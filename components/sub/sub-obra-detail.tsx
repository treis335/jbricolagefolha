// components/sub/sub-obra-detail.tsx
// Ficha da obra = a mesma dos colaboradores (foto, mapa, Google Maps/Waze, notas) + ordens da empresa + histórico do calendário.
// O empreiteiro só consulta. O admin/patrão pode editar as ordens e retirar a obra da empresa.
"use client"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ObraInfoSheet } from "@/components/forms/obra-info-sheet"
import type { Obra } from "@/lib/obras-service"
import { type SubDia, statsObra, fmtEuro, servicosDoDia, guardarOrdens, retirarObra, explainFirebaseError } from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  obra: Obra | null
  dias: SubDia[]
  subUid: string          // empresa
  admin?: boolean         // admin/patrão
  onChanged?: () => void
}

const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

function Extra({ obra, dias, subUid, admin, onChanged, onClose }: Omit<Props, "open"> & { obra: Obra }) {
  const ordensAtuais = obra.subOrdens?.[subUid] ?? ""
  const [ordens, setOrdens] = useState(ordensAtuais)
  const [saving, setSaving] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  useEffect(() => { setOrdens(ordensAtuais) }, [ordensAtuais, obra.id])

  const t = statsObra(obra.id, dias)
  const historico = dias.filter(d => servicosDoDia(d).some(sv => sv.obraId === obra.id)).sort((a, b) => b.date.localeCompare(a.date))

  const guardar = async () => {
    setSaving(true)
    try { await guardarOrdens(obra.id, subUid, ordens); onChanged?.() }
    catch (err) { alert(`Não foi possível guardar: ${explainFirebaseError(err)}`) }
    finally { setSaving(false) }
  }
  const retirar = async () => {
    if (!confirmar) { setConfirmar(true); return }
    try { await retirarObra(obra.id, subUid); onChanged?.(); onClose() }
    catch (err) { alert(`Não foi possível retirar: ${explainFirebaseError(err)}`) }
  }

  return (
    <div className="px-5 pt-4 space-y-4">
      {/* Ordens */}
      {admin ? (
        <div className="space-y-2">
          <p className={lbl}>Ordens para esta empresa</p>
          <Textarea value={ordens} onChange={e => setOrdens(e.target.value)} rows={4}
            placeholder="O que a empresa deve executar nesta obra…" className="rounded-xl resize-none text-sm" />
          <button onClick={guardar} disabled={saving || ordens.trim() === ordensAtuais.trim()}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar ordens
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-1.5">
          <p className={lbl}>Ordens</p>
          <p className="text-sm whitespace-pre-wrap">{ordensAtuais || "Sem ordens específicas."}</p>
        </div>
      )}

      {/* Totais */}
      <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{t.dias} dia(s) · {t.horas} h de equipa</span>
        <span className="text-sm font-black">{fmtEuro(t.custo)}</span>
      </div>

      {/* Histórico (vem do calendário) */}
      <div className="space-y-2">
        <p className={lbl}>Histórico</p>
        {historico.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Ainda sem registos. Regista no calendário.</p>
        ) : historico.map(d => {
          const servs = servicosDoDia(d).filter(sv => sv.obraId === obra.id)
          const rs = servs.flatMap(sv => sv.registos)
          const h = rs.reduce((a, r) => a + r.horas, 0)
          const c = rs.reduce((a, r) => a + r.custo, 0) + servs.reduce((a, sv) => a + (sv.valorFixo ?? 0), 0)
          return (
            <div key={d.id} className="rounded-xl border border-border/40 bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black capitalize">
                  {new Date(d.date + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <p className="text-[11px] text-muted-foreground">{rs.length > 0 ? `${rs.length} pessoa(s) · ${h} h · ` : "Valor fixo · "}<b className="text-foreground">{fmtEuro(c)}</b></p>
              </div>
              {servs.map(sv => (
                <div key={sv.id} className="space-y-1.5">
                  {sv.descricao && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{sv.descricao}</p>}
                  {sv.fotos.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {sv.fotos.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.url} alt={f.tipo} className="w-14 h-14 rounded-lg object-cover bg-muted" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {admin && (
        <button onClick={retirar}
          className={`w-full h-10 rounded-xl text-xs font-bold active:scale-[0.98] ${confirmar ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive"}`}>
          {confirmar ? "Confirmar: retirar obra desta empresa" : "Retirar obra desta empresa"}
        </button>
      )}
    </div>
  )
}

export function SubObraDetail({ open, onClose, obra, ...rest }: Props) {
  if (!obra) return null
  return <ObraInfoSheet open={open} onClose={onClose} obra={obra} extra={<Extra obra={obra} onClose={onClose} {...rest} />} />
}
