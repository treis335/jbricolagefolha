// components/admin/localizar-ferramenta-modal.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import {
  X, Search, MapPin, User, HardHat, Clock, History, Loader2, ImageIcon, PackageCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { QrScanInput } from "@/components/admin/qr-scan-input"
import { feedbackScan } from "@/lib/scan-feedback"
import {
  subscreverFerramentas, getHistoricoFerramenta, miniaturaUrl,
  type Ferramenta, type HistoricoEntrega,
} from "@/lib/ferramentas-service"

interface Props {
  open: boolean
  onClose: () => void
}

function formatDesde(iso: string): string {
  const d = new Date(iso)
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000)
  const dataFmt = d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })
  if (dias <= 0) return `hoje (${dataFmt})`
  if (dias === 1) return `há 1 dia (${dataFmt})`
  return `há ${dias} dias (${dataFmt})`
}

export function LocalizarFerramentaModal({ open, onClose }: Props) {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState("")
  const [selecionada, setSelecionada] = useState<Ferramenta | null>(null)
  const [historico, setHistorico] = useState<HistoricoEntrega[]>([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [avisoScan, setAvisoScan] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const unsub = subscreverFerramentas(
      lista => { setFerramentas(lista); setLoading(false) },
      err => { console.error(err); setLoading(false) },
    )
    return unsub
  }, [open])

  const emObra = useMemo(
    () => ferramentas
      .filter(f => f.ativa && f.comQuem)
      .sort((a, b) => (a.comQuem!.desde < b.comQuem!.desde ? -1 : 1)), // mais antigas primeiro
    [ferramentas]
  )

  const resultadosPesquisa = useMemo(() => {
    const q = pesquisa.trim().toLowerCase().replace(/^#/, "")
    if (!q) return []
    const n = /^\d+$/.test(q) ? Number(q) : null
    return ferramentas.filter(f => f.nome.toLowerCase().includes(q) || (n !== null && f.numero === n)).slice(0, 8)
  }, [ferramentas, pesquisa])

  const abrirDetalhe = (f: Ferramenta) => {
    setSelecionada(f)
    setAvisoScan("")
    setLoadingHist(true)
    getHistoricoFerramenta(f.id).then(setHistorico).catch(console.error).finally(() => setLoadingHist(false))
  }

  const handleScan = (code: string) => {
    const c = code.trim().replace(/^#/, "")
    const f = ferramentas.find(ff => ff.id === c || (/^\d+$/.test(c) && ff.numero === Number(c)))
    if (f) { feedbackScan("sucesso"); abrirDetalhe(f); setPesquisa("") }
    else { feedbackScan("erro"); setAvisoScan("Nenhuma ferramenta encontrada com esse código.") }
  }

  const fecharDetalhe = () => { setSelecionada(null); setHistorico([]) }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg max-h-[94dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {selecionada ? (
          // ── Detalhe de uma ferramenta ──────────────────────────────────
          <>
            <div className="p-4 border-b border-border/40 shrink-0 flex items-center gap-2">
              <button onClick={fecharDetalhe} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm font-black tracking-tight truncate flex-1">{selecionada.numero != null && <span className="text-muted-foreground mr-1.5">Nº {selecionada.numero}</span>}{selecionada.nome}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="aspect-video rounded-2xl bg-muted/30 overflow-hidden flex items-center justify-center">
                {selecionada.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={miniaturaUrl(selecionada.fotoUrl, 800)} alt={selecionada.nome} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                )}
              </div>

              {selecionada.comQuem ? (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700/70 dark:text-amber-400/60">Atualmente</p>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" /> {selecionada.comQuem.colaboradorNome}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <HardHat className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" /> {selecionada.comQuem.obraNome}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" /> {formatDesde(selecionada.comQuem.desde)}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-4 flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Disponível no armazém</span>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                  <History className="h-3 w-3" /> Histórico
                </p>
                {loadingHist ? (
                  <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : historico.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Ainda sem histórico de entregas.</p>
                ) : (
                  <div className="space-y-1.5">
                    {historico.map(h => (
                      <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{h.colaboradorNome} · {h.obraNome}</p>
                          <p className="text-muted-foreground">
                            {new Date(h.entregueEm).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                            {" → "}
                            {h.devolvidoEm ? new Date(h.devolvidoEm).toLocaleDateString("pt-PT", { day: "numeric", month: "short" }) : "ainda com ele"}
                          </p>
                        </div>
                        {!h.devolvidoEm && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 rounded-full px-2 py-0.5 shrink-0">Em curso</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // ── Lista principal ─────────────────────────────────────────────
          <>
            <div className="p-4 border-b border-border/40 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-base font-black tracking-tight flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Localizar ferramenta
                </p>
                <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <input
                  type="text"
                  value={pesquisa}
                  onChange={e => setPesquisa(e.target.value)}
                  placeholder="Pesquisar por nome ou número…"
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-border/50 bg-background text-sm"
                />
              </div>

              <QrScanInput onScan={handleScan} autoFocusPistola={open && !pesquisa} placeholder="Ou pica o QR / escreve o número…" />
              {avisoScan && <p className="text-xs text-red-500 font-medium">{avisoScan}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {resultadosPesquisa.length > 0 ? (
                resultadosPesquisa.map(f => (
                  <button
                    key={f.id}
                    onClick={() => abrirDetalhe(f)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-left"
                  >
                    <span className="text-sm font-semibold truncate">{f.numero != null && <span className="text-muted-foreground mr-1.5">Nº {f.numero}</span>}{f.nome}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                      !f.ativa ? "bg-muted text-muted-foreground" : f.comQuem ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    )}>
                      {!f.ativa ? "Arquivada" : f.comQuem ? f.comQuem.colaboradorNome : "Disponível"}
                    </span>
                  </button>
                ))
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1">
                    Em obra agora ({emObra.length})
                  </p>
                  {loading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  ) : emObra.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Todas as ferramentas estão no armazém. 🎉</p>
                  ) : (
                    emObra.map(f => (
                      <button
                        key={f.id}
                        onClick={() => abrirDetalhe(f)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                          {f.fotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={miniaturaUrl(f.fotoUrl, 120)} alt={f.nome} loading="lazy" className="w-full h-full object-cover" />
                          ) : <ImageIcon className="h-4 w-4 text-muted-foreground/30" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{f.numero != null && <span className="text-muted-foreground mr-1.5">Nº {f.numero}</span>}{f.nome}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {f.comQuem!.colaboradorNome} · {f.comQuem!.obraNome}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatDesde(f.comQuem!.desde)}</span>
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
