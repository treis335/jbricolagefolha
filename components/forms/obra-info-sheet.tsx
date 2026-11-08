// components/forms/obra-info-sheet.tsx
"use client"
import { useState, useEffect, useRef } from "react"
import { X, MapPin, Maximize2, Info } from "lucide-react"
import { HardHat } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getGoogleMapsUrl, getWazeUrl, formatMorada } from "@/lib/obras-service"
import { PhotoLightbox } from "./photo-lightbox"
import type { Obra } from "@/lib/obras-service"

interface ObraInfoSheetProps {
  open: boolean
  onClose: () => void
  obra: Obra
  /** Conteúdo extra por baixo das notas (ex.: ordens e histórico do empreiteiro) */
  extra?: React.ReactNode
}

export function ObraInfoSheet({ open, onClose, obra, extra }: ObraInfoSheetProps) {
  const morada = formatMorada(obra)
  const hasLocation = !!obra.localizacao
  const mapsUrl = hasLocation
    ? getGoogleMapsUrl(obra.localizacao!)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(morada)}`
  const wazeUrl = hasLocation
    ? getWazeUrl(obra.localizacao!)
    : `https://waze.com/ul?q=${encodeURIComponent(morada)}`

  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (!open || !hasLocation || !mapRef.current) return

    const initMap = () => {
      const L = (window as any).L
      if (!L || !mapRef.current || leafletMapRef.current) return
      const loc = obra.localizacao!
      const map = L.map(mapRef.current, {
        center: [loc.lat, loc.lng],
        zoom: 16,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        attributionControl: false,
      })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map)
      const icon = L.divIcon({
        html: `<div style="width:22px;height:22px;background:#2563eb;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(37,99,235,0.4);"></div>`,
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      })
      L.marker([loc.lat, loc.lng], { icon }).addTo(map)
      leafletMapRef.current = map
    }

    const load = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }
      if ((window as any).L) { initMap(); return }
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script")
        s.id = "leaflet-js"
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        s.onload = () => res()
        s.onerror = rej
        document.head.appendChild(s)
      })
      initMap()
    }
    load().catch(console.error)

    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null }
    }
  }, [open, hasLocation, obra])

  return (
    <>
      {lightboxOpen && obra.fotoUrl && (
        <PhotoLightbox src={obra.fotoUrl} alt={obra.nome} onClose={() => setLightboxOpen(false)} />
      )}
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 bg-background max-h-[90dvh] flex flex-col p-0 shadow-2xl [&>button]:hidden overflow-hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl"
        >
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="w-10 h-1 rounded-full bg-white/40" />
          </div>

          {/* Hero image */}
          <div className="relative shrink-0 w-full overflow-hidden" style={{ height: "230px" }}>
            {obra.fotoUrl ? (
              <img src={obra.fotoUrl} alt={obra.nome} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${obra.cor}28, ${obra.cor}08)` }}
              >
                <HardHat className="h-20 w-20 opacity-10" style={{ color: obra.cor }} />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 px-5 pb-4 z-10">
              <SheetTitle className="text-xl font-bold text-foreground drop-shadow-sm line-clamp-2 leading-tight">
                {obra.nome}
              </SheetTitle>
              {morada && (
                <SheetDescription className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{morada}</span>
                </SheetDescription>
              )}
            </div>
            {obra.fotoUrl && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-4 right-5 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white text-[11px] font-semibold transition-all active:scale-95"
              >
                <Maximize2 className="h-3 w-3" />Ampliar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-8 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-colors"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {hasLocation ? (
              <div className="mx-5 mt-4 rounded-2xl overflow-hidden border border-border/25 shadow-sm" style={{ height: "160px" }}>
                <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
              </div>
            ) : (
              <div className="mx-5 mt-4 rounded-xl border border-border/30 bg-muted/20 px-4 py-3 flex items-center gap-2.5">
                <Info className="h-4 w-4 text-muted-foreground/35 shrink-0" />
                <p className="text-xs text-muted-foreground/70">Sem GPS registado nesta obra.</p>
              </div>
            )}

            <div className="px-5 pt-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Abrir em</p>
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.97] shadow-md"
                  style={{ background: "linear-gradient(135deg,#4285F4,#3367D6)" }}
                >
                  Google Maps
                </a>
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg,#05C8F7,#04a8d0)" }}
                >
                  Waze
                </a>
              </div>
            </div>

            {obra.descricao && (
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">Notas</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{obra.descricao}</p>
              </div>
            )}
            {extra}
            <div className="h-4" />
          </div>

          <div className="shrink-0 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-border/15 bg-background">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-2xl bg-muted/50 hover:bg-muted text-sm font-semibold text-foreground transition-colors"
            >
              Fechar
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
