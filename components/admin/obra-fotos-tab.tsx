// components/admin/obra-fotos-tab.tsx
// Aba "Fotos" do detalhe de uma obra: todas as fotos dos serviços dessa obra, por dia, com o visualizador completo.
"use client"

import { useMemo, useState } from "react"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"
import { VisualizadorFotos, miniatura, formatData, type FotoFlat } from "@/components/admin/visualizador-fotos"

type Filtro = "todas" | "antes" | "depois"

export function ObraFotosTab({ fotos }: { fotos: FotoFlat[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas")
  const [indice, setIndice] = useState<number | null>(null)

  // mais recentes primeiro (por dia e, dentro do dia, pela hora de envio)
  const ordenadas = useMemo(
    () => [...fotos].sort((a, b) => b.date.localeCompare(a.date) || (b.uploadedAt || "").localeCompare(a.uploadedAt || "")),
    [fotos],
  )
  const filtradas = useMemo(
    () => ordenadas.filter(f => filtro === "todas" || f.tipo === filtro),
    [ordenadas, filtro],
  )

  // agrupa por dia mantendo o índice de cada foto (é o índice que o visualizador usa)
  const grupos = useMemo(() => {
    const mapa = new Map<string, { foto: FotoFlat; i: number }[]>()
    filtradas.forEach((foto, i) => {
      if (!mapa.has(foto.date)) mapa.set(foto.date, [])
      mapa.get(foto.date)!.push({ foto, i })
    })
    return Array.from(mapa.entries())
  }, [filtradas])

  const contar = (t: Filtro) => (t === "todas" ? ordenadas.length : ordenadas.filter(f => f.tipo === t).length)

  if (ordenadas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center py-14 text-center gap-2.5">
        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Camera className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div className="px-4">
          <p className="text-sm font-medium">Ainda sem fotos nesta obra</p>
          <p className="text-xs text-muted-foreground mt-0.5">As fotos que os colaboradores anexam aos serviços desta obra aparecem aqui.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 min-w-0">
      {/* Filtro antes / depois */}
      <div className="flex gap-1.5 overflow-x-auto">
        {(["todas", "antes", "depois"] as const).map(t => (
          <button
            key={t}
            onClick={() => setFiltro(t)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors capitalize",
              filtro === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
            )}
          >
            {t} <span className="opacity-70 tabular-nums ml-0.5">{contar(t)}</span>
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Sem fotos neste filtro.</p>
      ) : grupos.map(([data, itens]) => {
        const nomes = Array.from(new Set(itens.map(x => x.foto.colaboradorNome)))
        return (
          <div key={data} className="space-y-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-0.5 truncate">
              {formatData(data)} <span className="font-medium normal-case tracking-normal opacity-70">· {nomes.join(", ")}</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {itens.map(({ foto, i }) => (
                <button
                  key={`${foto.url}-${i}`}
                  onClick={() => setIndice(i)}
                  aria-label={`Abrir foto ${i + 1}`}
                  className="relative aspect-square rounded-xl overflow-hidden bg-muted/40 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={miniatura(foto.url, 320)} alt={foto.obraNome} loading="lazy" className="w-full h-full object-cover group-active:scale-95 transition-transform" />
                  <span className={cn(
                    "absolute top-1 left-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white",
                    foto.tipo === "antes" ? "bg-amber-500/90" : "bg-emerald-500/90"
                  )}>
                    {foto.tipo}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <VisualizadorFotos fotos={filtradas} indice={indice} onMudar={setIndice} />
    </div>
  )
}
