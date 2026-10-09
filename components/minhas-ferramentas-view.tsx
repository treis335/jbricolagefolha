// components/minhas-ferramentas-view.tsx
// Lado do colaborador: só consulta das ferramentas que lhe estão atribuídas neste momento.
// Não há ações — entregas e devoluções são feitas pelo admin/armazém.
"use client"

import { useEffect, useState } from "react"
import { Wrench, ImageIcon, HardHat, Clock, Loader2, Info } from "lucide-react"
import { useAuth } from "@/lib/AuthProvider"
import { subscreverFerramentasDoColaborador, miniaturaUrl, type Ferramenta } from "@/lib/ferramentas-service"

function haQuanto(iso: string): string {
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
  return d === 0 ? "hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`
}

export function MinhasFerramentasView() {
  const { user } = useAuth()
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  const uid = user?.uid
  useEffect(() => {
    if (!uid) return
    setLoading(true)
    const unsub = subscreverFerramentasDoColaborador(
      uid,
      lista => { setFerramentas(lista); setErro(false); setLoading(false) },
      err => { console.error(err); setErro(true); setLoading(false) },
    )
    return unsub
  }, [uid])

  return (
    <div className="flex flex-col h-full overflow-auto pb-24 animate-fade-in w-full min-w-0">
      <div className="px-3 sm:px-5 py-4 md:py-8 space-y-5 max-w-2xl mx-auto w-full min-w-0">

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
            <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black tracking-tight">As minhas ferramentas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "A carregar…" : ferramentas.length === 0
                ? "Nada atribuído neste momento"
                : `${ferramentas.length} atribuída${ferramentas.length !== 1 ? "s" : ""} a ti neste momento`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">A carregar…</span>
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-12 px-6 text-center">
            <p className="text-sm text-muted-foreground">Não foi possível carregar as ferramentas. Tenta novamente mais tarde.</p>
          </div>
        ) : ferramentas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center py-14 text-center gap-2.5">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">Não tens ferramentas atribuídas.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ferramentas.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card">
                <div className="relative w-16 h-16 rounded-xl bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
                  {f.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={miniaturaUrl(f.fotoUrl, 200)} alt={f.nome} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/25" />
                  )}
                  {f.numero != null && (
                    <span className="absolute top-1 left-1 min-w-5 h-5 px-1.5 rounded-md bg-black/70 text-white text-[10px] font-black tabular-nums flex items-center justify-center">
                      {f.numero}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-bold leading-tight line-clamp-2">{f.nome}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <HardHat className="h-3 w-3 shrink-0" /> {f.comQuem!.obraNome}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" /> {haQuanto(f.comQuem!.desde)} ·{" "}
                    {new Date(f.comQuem!.desde).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/60 flex items-start gap-1.5 px-1">
          <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
          Só consulta. As entregas e devoluções são registadas no armazém.
        </p>
      </div>
    </div>
  )
}
