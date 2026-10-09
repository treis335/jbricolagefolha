// components/forms/obra-picker.tsx
"use client"
import { useState, useEffect, useMemo } from "react"
import { Search, X, HardHat, MapPin, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getObras, ESTADO_LABELS, ESTADO_COLORS } from "@/lib/obras-service"
import { PhotoLightbox } from "./photo-lightbox"
import type { Obra } from "@/lib/obras-service"

interface ObraPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (obra: Obra) => void
  /** Classe de z-index (ex.: "z-[110]") para abrir por cima de modais com z-index alto */
  zClass?: string
}

export function ObraPicker({ open, onClose, onSelect, zClass }: ObraPickerProps) {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSearch("")
    getObras()
      .then(list => setObras(list.filter(o => o.estado === "ativa")))
      .catch(() => setObras([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return obras
    return obras.filter(o =>
      o.nome.toLowerCase().includes(q) ||
      o.moradaCidade?.toLowerCase().includes(q) ||
      o.moradaRua?.toLowerCase().includes(q)
    )
  }, [obras, search])

  return (
    <>
      {lightboxSrc && (
        <PhotoLightbox src={lightboxSrc} alt="Obra" onClose={() => setLightboxSrc(null)} />
      )}
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent
          side="bottom"
          overlayClassName={zClass}
          className={`${zClass ?? ""} rounded-t-3xl border-0 bg-background max-h-[92dvh] flex flex-col p-0 shadow-2xl [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl`}
        >
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/50" />
          </div>

          <div className="shrink-0 px-5 pt-4 pb-3 space-y-3">
            <SheetHeader className="text-left space-y-0">
              <SheetTitle className="text-xl font-bold">Selecionar Obra</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">Obras ativas</SheetDescription>
            </SheetHeader>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              <Input
                placeholder="Pesquisar por nome ou localização..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-primary/20 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-flex flex-col items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  A carregar obras…
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center space-y-3 animate-fade-in">
                <div className="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto border border-border/30">
                  <HardHat className="h-8 w-8 text-muted-foreground/25" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground/70">
                    {obras.length === 0 ? "Nenhuma obra ativa" : "Sem resultados"}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {obras.length === 0 ? "Cria uma obra no painel admin" : "Tenta pesquisar por outro termo"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2 space-y-2">
                {filtered.map((obra, i) => {
                  const ec = ESTADO_COLORS[obra.estado]
                  const morada = [obra.moradaRua, obra.moradaCidade].filter(Boolean).join(", ")
                  return (
                    <button
                      key={obra.id}
                      type="button"
                      onClick={() => { onSelect(obra); onClose() }}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:bg-muted/30 hover:border-primary/25 hover:shadow-sm active:scale-[0.99] transition-all press-effect group animate-fade-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: obra.cor }} />
                      <div
                        className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border/20"
                        style={{ backgroundColor: obra.cor + "18" }}
                        onClick={e => { if (obra.fotoUrl) { e.stopPropagation(); setLightboxSrc(obra.fotoUrl) } }}
                      >
                        {obra.fotoUrl ? (
                          <img src={obra.fotoUrl} alt={obra.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <HardHat className="h-6 w-6 opacity-25" style={{ color: obra.cor }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-foreground leading-snug">{obra.nome}</p>
                        {morada && (
                          <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />{morada}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center gap-1 rounded-full text-[9px] font-bold px-1.5 py-0.5 ${ec.bg} ${ec.text}`}>
                            <span className={`w-1 h-1 rounded-full ${ec.dot}`} />
                            {ESTADO_LABELS[obra.estado]}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 shrink-0 transition-colors" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-border/15 bg-background">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-2xl bg-muted/50 hover:bg-muted text-sm font-semibold text-foreground transition-all press-effect border border-border/30"
            >
              Cancelar
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
