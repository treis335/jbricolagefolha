// components/sub/sub-obra-detail.tsx
// Ficha informativa da obra (morada/mapa, contacto, prazo, ordens) + histórico do que foi registado no calendário.
// O empreiteiro só consulta aqui — os registos fazem-se no calendário. O admin/patrão pode editar a obra.
"use client"
import { MapPin, Phone, CalendarClock, Pencil, Navigation } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { type SubObra, type SubDia, statsObra, fmtEuro, mapsUrl } from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  obra: SubObra | null
  dias: SubDia[]
  onEditObra?: () => void // só o admin/patrão
}

const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

export function SubObraDetail({ open, onClose, obra, dias, onEditObra }: Props) {
  if (!obra) return null
  const t = statsObra(obra.id, dias)
  const historico = dias
    .filter(d => d.registos.some(r => r.obraId === obra.id))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="z-[100] rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
          <SheetHeader className="text-left space-y-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-black">{obra.nome}</SheetTitle>
                <SheetDescription className="text-xs">{obra.estado === "ativa" ? "Obra ativa" : "Obra concluída"}</SheetDescription>
              </div>
              {onEditObra && (
                <button onClick={onEditObra} className="h-9 px-3 rounded-xl bg-muted text-xs font-bold flex items-center gap-1.5 active:scale-95 mr-8">
                  <Pencil className="h-3.5 w-3.5" />Editar
                </button>
              )}
            </div>
          </SheetHeader>

          {/* Localização */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <p className={lbl}>Localização</p>
            <p className="text-sm flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-orange-500" />
              <span>{obra.morada || "Morada não indicada"}</span>
            </p>
            <a href={mapsUrl(obra.morada || obra.nome)} target="_blank" rel="noopener noreferrer"
              className="h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
              <Navigation className="h-4 w-4" />Abrir no mapa
            </a>
            {obra.contacto && (
              <p className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-muted-foreground" />{obra.contacto}</p>
            )}
            {obra.prazo && (
              <p className="text-sm flex items-center gap-2"><CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />{obra.prazo}</p>
            )}
          </div>

          {/* Ordens */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-1.5">
            <p className={lbl}>Ordens / o que fazer</p>
            <p className="text-sm whitespace-pre-wrap">{obra.ordens || "Sem ordens específicas."}</p>
          </div>

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
              const rs = d.registos.filter(r => r.obraId === obra.id)
              const nota = d.notas?.[obra.id]
              const h = rs.reduce((a, r) => a + r.horas, 0)
              const c = rs.reduce((a, r) => a + r.custo, 0)
              return (
                <div key={d.id} className="rounded-xl border border-border/40 bg-card p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black capitalize">
                      {new Date(d.date + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{rs.length} pessoa(s) · {h} h · <b className="text-foreground">{fmtEuro(c)}</b></p>
                  </div>
                  {nota?.descricao && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{nota.descricao}</p>}
                  {(nota?.fotos?.length ?? 0) > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {nota!.fotos.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.url} alt={f.tipo} className="w-14 h-14 rounded-lg object-cover bg-muted" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
