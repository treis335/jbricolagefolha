// components/admin/fotos-modal.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, Camera, ChevronLeft, ChevronRight, User, HardHat, Calendar, Download, Plus, Minus, Check, CheckSquare, Undo2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ZoomableImage, type ZoomHandle } from "@/components/zoomable-image"
import type { Collaborator } from "@/hooks/useCollaborators"
import { ObraPicker } from "@/components/forms/obra-picker"
import { associarFotosAObra } from "@/lib/fotos-obra-service"

interface Props {
  open: boolean
  onClose: () => void
  collaborators?: Collaborator[]
  /** Chamado depois de associar fotos a uma obra (para atualizar os dados) */
  onChanged?: () => void
}

interface FotoFlat {
  url: string
  tipo: "antes" | "depois"
  uploadedAt: string
  colaboradorId: string
  colaboradorNome: string
  date: string
  obraNome: string
  descricao: string
  /** Identifica o serviço a que a foto pertence (fotos do mesmo serviço partilham a obra) */
  servicoKey: string
}

function slug(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

/** Descarrega a foto com um nome útil: obra-colaborador-data-tipo */
async function descarregarFoto(f: FotoFlat) {
  const nome = [slug(f.obraNome), slug(f.colaboradorNome), f.date, f.tipo].filter(Boolean).join("-") || "foto"
  const clicar = (href: string, ficheiro?: string) => {
    const a = document.createElement("a")
    a.href = href
    if (ficheiro) a.download = ficheiro
    a.rel = "noopener"
    document.body.appendChild(a); a.click(); a.remove()
  }
  // Cloudinary: o próprio servidor força o download (funciona em qualquer telemóvel/browser)
  if (f.url.includes("res.cloudinary.com") && f.url.includes("/upload/")) {
    clicar(f.url.replace("/upload/", `/upload/fl_attachment:${nome}/`))
    return
  }
  try {
    const res = await fetch(f.url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg"
    const url = URL.createObjectURL(blob)
    clicar(url, `${nome}.${ext}`)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch {
    window.open(f.url, "_blank", "noopener")
  }
}

/** Miniatura leve (Cloudinary redimensiona); outros URLs ficam como estão */
function miniatura(url: string, largura = 160): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_fill,w_${largura},h_${largura}/`)
}

// Telemóvel deitado (baixo e largo): foto à esquerda, painel à direita
const V_RAIZ = "fixed inset-0 z-[200] bg-black flex flex-col overscroll-contain [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[minmax(0,1fr)_320px] [@media(orientation:landscape)_and_(max-height:520px)]:grid-rows-[auto_minmax(0,1fr)]"
const V_TOPO = "shrink-0 flex items-center justify-between gap-2 px-3 pb-2 [@media(orientation:landscape)_and_(max-height:520px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:bg-neutral-900/95"
const V_FOTO = "flex-1 min-h-0 relative [@media(orientation:landscape)_and_(max-height:520px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:row-span-2"
const V_PAINEL = "shrink-0 w-full max-w-2xl mx-auto bg-neutral-900/95 border-t border-white/10 rounded-t-3xl pt-3 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)]:rounded-none [@media(orientation:landscape)_and_(max-height:520px)]:border-t-0 [@media(orientation:landscape)_and_(max-height:520px)]:border-l [@media(orientation:landscape)_and_(max-height:520px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:overflow-y-auto [@media(orientation:landscape)_and_(max-height:520px)]:pt-1"
const V_MINIATURAS = "flex gap-1.5 overflow-x-auto px-3 pt-1 [@media(orientation:landscape)_and_(max-height:520px)]:flex-wrap [@media(orientation:landscape)_and_(max-height:520px)]:overflow-x-visible"
const BTN_ICONE = "w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:active:scale-100"

const clampIndex = (i: number, total: number) => Math.min(Math.max(i, 0), Math.max(total - 1, 0))

function formatData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })
}

export function FotosModal({ open, onClose, collaborators = [], onChanged }: Props) {
  const [colaboradorId, setColaboradorId] = useState<string>("todos")
  const [tipo, setTipo] = useState<"todas" | "antes" | "depois">("todas")
  const [busca, setBusca] = useState("")
  const [indexAmpliada, setIndexAmpliada] = useState<number | null>(null)
  const zoomRef = useRef<ZoomHandle>(null)
  const [escalaAtual, setEscalaAtual] = useState(1)
  const miniaturasRef = useRef<(HTMLButtonElement | null)[]>([])
  const [dica, setDica] = useState(false)

  // Associar fotos a uma obra
  const [modoSel, setModoSel] = useState(false)
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [pickerAberto, setPickerAberto] = useState(false)
  const [aGuardar, setAGuardar] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  // correções feitas nesta sessão (aparecem logo, sem esperar pela atualização dos dados); null = obra original
  const [correcoes, setCorrecoes] = useState<Map<string, { obraId: string; obraNome: string } | null>>(new Map())  // chave = serviço

  const todasFotos = useMemo<FotoFlat[]>(() => {
    const lista: FotoFlat[] = []
    collaborators.forEach(c => {
      ;(c.entries || []).forEach((entry: any) => {
        ;(entry.services || []).forEach((s: any) => {
          ;(s.fotos || []).forEach((f: any) => {
            const servicoKey = `${c.id}|${entry.date}|${s.id}`
            lista.push({
              url: f.url,
              tipo: f.tipo,
              uploadedAt: f.uploadedAt,
              colaboradorId: c.id,
              colaboradorNome: c.name,
              date: entry.date,
              // correção feita agora (aparece logo) > dados guardados; "repor" mostra já o título original
              obraNome: (correcoes.has(servicoKey)
                ? (correcoes.get(servicoKey)?.obraNome ?? s.obraOriginal?.obraNome)
                : f.obraNome) || s.obraNome || "Sem obra",
              descricao: s.descricao || "",
              servicoKey,
            })
          })
        })
      })
    })
    return lista.sort((a, b) => (b.uploadedAt || b.date).localeCompare(a.uploadedAt || a.date))
  }, [collaborators, correcoes])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return todasFotos.filter(f =>
      (colaboradorId === "todos" || f.colaboradorId === colaboradorId) &&
      (tipo === "todas" || f.tipo === tipo) &&
      (!q || f.obraNome.toLowerCase().includes(q) || f.descricao.toLowerCase().includes(q))
    )
  }, [todasFotos, colaboradorId, tipo, busca])

  const colaboradoresComFotos = useMemo(
    () => collaborators.filter(c => todasFotos.some(f => f.colaboradorId === c.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [collaborators, todasFotos]
  )

  const ampliada = indexAmpliada !== null ? filtradas[indexAmpliada] : null

  const mudarFoto = (delta: 1 | -1) =>
    setIndexAmpliada(i => (i === null ? i : clampIndex(i + delta, filtradas.length)))

  const alternarSelecao = (url: string) =>
    setSelecionadas(prev => { const n = new Set(prev); n.has(url) ? n.delete(url) : n.add(url); return n })

  const sairDaSelecao = () => { setModoSel(false); setSelecionadas(new Set()) }

  // Aplica a obra (ou repõe a original, com null) a todas as fotos selecionadas
  const aplicarObra = async (obra: { id: string; nome: string } | null) => {
    const escolhidas = todasFotos.filter(f => selecionadas.has(f.url))
    if (escolhidas.length === 0) return
    setAGuardar(true); setAviso(null)
    try {
      const servicosAlterados = await associarFotosAObra(escolhidas.map(f => ({ colaboradorId: f.colaboradorId, url: f.url })), obra)
      const chaves = new Set(escolhidas.map(f => f.servicoKey))
      setCorrecoes(prev => {
        const m = new Map(prev)
        chaves.forEach(k => m.set(k, obra ? { obraId: obra.id, obraNome: obra.nome } : null))
        return m
      })
      const n = escolhidas.length
      const extra = todasFotos.filter(f => chaves.has(f.servicoKey)).length - n   // outras fotos do mesmo serviço
      setAviso({
        ok: true,
        texto: servicosAlterados === 0
          ? "Nada a alterar: já estava assim."
          : obra
            ? `${n} ${n === 1 ? "foto associada" : "fotos associadas"} a ${obra.nome}. O serviço do colaborador também foi atualizado${extra > 0 ? ` (mais ${extra} ${extra === 1 ? "foto do mesmo serviço seguiu" : "fotos do mesmo serviço seguiram"})` : ""}.`
            : `${n} ${n === 1 ? "foto reposta" : "fotos repostas"}: o serviço voltou à obra que o colaborador escreveu.`,
      })
      sairDaSelecao()
      onChanged?.()
    } catch (e) {
      console.error(e)
      setAviso({ ok: false, texto: "Não foi possível guardar. Tenta novamente." })
    } finally {
      setAGuardar(false)
    }
  }

  // quando os dados são atualizados, a obra já vem certa do serviço — as correções temporárias deixam de ser precisas
  useEffect(() => { setCorrecoes(new Map()) }, [collaborators])

  // o aviso desaparece sozinho
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(t)
  }, [aviso])

  // Teclado (computador): ← → mudam de foto · + − zoom · 0 ajusta · Esc fecha
  useEffect(() => {
    if (indexAmpliada === null) return
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") mudarFoto(1)
      else if (e.key === "ArrowLeft") mudarFoto(-1)
      else if (e.key === "+" || e.key === "=") zoomRef.current?.zoomIn()
      else if (e.key === "-") zoomRef.current?.zoomOut()
      else if (e.key === "0") zoomRef.current?.reset()
      else if (e.key === "Escape") setIndexAmpliada(null)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", aoTecla)
    return () => window.removeEventListener("keydown", aoTecla)
  }, [indexAmpliada, filtradas.length])

  // Enquanto o modal está aberto, o fundo não rola (o visualizador ocupa o ecrã todo)
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const body = document.body
    const antes = { html: html.style.overflow, body: body.style.overflow }
    const scrollY = window.scrollY   // em alguns telemóveis o fundo volta ao topo: repomos ao fechar
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = antes.html
      body.style.overflow = antes.body
      window.scrollTo({ top: scrollY, behavior: "instant" })
    }
  }, [open])

  // dica de gestos: aparece ao abrir e desaparece sozinha
  useEffect(() => {
    if (indexAmpliada === null) return
    setDica(true)
    const t = setTimeout(() => setDica(false), 4000)
    return () => clearTimeout(t)
  }, [indexAmpliada === null])

  // mantém a miniatura da foto atual visível na faixa
  useEffect(() => {
    if (indexAmpliada === null) return
    miniaturasRef.current[indexAmpliada]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [indexAmpliada])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center overscroll-contain" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-3xl max-h-[92dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/40 shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {modoSel ? (
              <p className="text-base font-black tracking-tight tabular-nums">
                {selecionadas.size} {selecionadas.size === 1 ? "selecionada" : "selecionadas"}
              </p>
            ) : (
              <p className="text-base font-black tracking-tight flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Fotos ({filtradas.length})
              </p>
            )}
            <div className="flex items-center gap-1.5">
              {modoSel ? (
                <>
                  <button
                    onClick={() => setSelecionadas(new Set(filtradas.map(f => f.url)))}
                    className="h-8 px-3 rounded-lg bg-muted/60 hover:bg-muted text-xs font-semibold"
                  >
                    Todas
                  </button>
                  <button onClick={sairDaSelecao} className="h-8 px-3 rounded-lg bg-muted/60 hover:bg-muted text-xs font-semibold">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  {filtradas.length > 0 && (
                    <button
                      onClick={() => setModoSel(true)}
                      className="h-8 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 text-xs font-bold flex items-center gap-1.5"
                    >
                      <CheckSquare className="h-3.5 w-3.5" /> Selecionar
                    </button>
                  )}
                  <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={colaboradorId}
              onChange={e => setColaboradorId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/50 bg-background text-xs font-medium"
            >
              <option value="todos">Todos os colaboradores</option>
              {colaboradoresComFotos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex p-0.5 rounded-xl border border-border/50 bg-muted/30">
              {(["todas", "antes", "depois"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn("h-8 px-3 rounded-lg text-xs font-semibold capitalize transition-colors", tipo === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar por obra…"
              className="h-9 px-3 rounded-xl border border-border/50 bg-background text-xs flex-1 min-w-[140px]"
            />
          </div>
        </div>

        {aviso && (
          <div className={cn(
            "mx-3 mt-2 rounded-xl px-3 py-2 text-xs font-medium shrink-0",
            aviso.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
          )}>
            {aviso.texto}
          </div>
        )}

        {/* Grelha */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtradas.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {todasFotos.length === 0 ? "Ainda não há fotos carregadas por ninguém." : "Nenhuma foto encontrada com estes filtros."}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {filtradas.map((f, i) => (
                <button
                  key={`${f.url}-${i}`}
                  onClick={() => (modoSel ? alternarSelecao(f.url) : setIndexAmpliada(i))}
                  aria-pressed={modoSel ? selecionadas.has(f.url) : undefined}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden bg-muted/40 group transition-all",
                    modoSel && selecionadas.has(f.url) && "ring-[3px] ring-primary ring-offset-1 ring-offset-card"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.obraNome} className={cn("w-full h-full object-cover group-active:scale-95 transition-transform", modoSel && selecionadas.has(f.url) && "opacity-80")} loading="lazy" />
                  <span className={cn(
                    "absolute top-1 left-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white",
                    f.tipo === "antes" ? "bg-amber-500/90" : "bg-emerald-500/90"
                  )}>
                    {f.tipo}
                  </span>
                  {modoSel && (
                    <span className={cn(
                      "absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selecionadas.has(f.url) ? "bg-primary border-primary" : "bg-black/30 border-white/80"
                    )}>
                      {selecionadas.has(f.url) && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                    </span>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1 pt-5 text-[9px] font-semibold text-white text-left truncate">
                    {f.obraNome}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Barra de ação do modo "Selecionar" */}
        {modoSel && (
          <div
            className="shrink-0 border-t border-border/40 bg-card px-3 pt-3 flex items-center gap-2"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={() => aplicarObra(null)}
              disabled={selecionadas.size === 0 || aGuardar}
              title="Voltar à obra que o colaborador escreveu"
              className="h-11 px-3.5 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" /> Repor
            </button>
            <button
              onClick={() => setPickerAberto(true)}
              disabled={selecionadas.size === 0 || aGuardar}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {aGuardar ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardHat className="h-4 w-4" />}
              Associar a obra
            </button>
          </div>
        )}
      </div>

      {/* Escolha da obra — o clique não pode "subir" até ao fundo do modal (senão fecha tudo) */}
      {pickerAberto && (
        <div onClick={e => e.stopPropagation()}>
          <ObraPicker
            open
            zClass="z-[110]"
            onClose={() => setPickerAberto(false)}
            onSelect={obra => { setPickerAberto(false); aplicarObra({ id: obra.id, nome: obra.nome }) }}
          />
        </div>
      )}

      {/* Vista ampliada — galeria completa */}
      {ampliada && indexAmpliada !== null && (
        <div className={V_RAIZ} style={{ height: "100dvh" }} onClick={e => e.stopPropagation()}>
          {/* Topo */}
          <div className={V_TOPO} style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold tabular-nums">
                {indexAmpliada + 1} / {filtradas.length}
              </span>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-full text-white",
                ampliada.tipo === "antes" ? "bg-amber-500/90" : "bg-emerald-500/90"
              )}>
                {ampliada.tipo}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => descarregarFoto(ampliada)} aria-label="Descarregar foto" title="Descarregar" className={BTN_ICONE}>
                <Download className="h-5 w-5 text-white" />
              </button>
              <button onClick={() => setIndexAmpliada(null)} aria-label="Fechar" title="Fechar" className={BTN_ICONE}>
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Foto */}
          <div className={V_FOTO}>
            <ZoomableImage
              key={ampliada.url}
              ref={zoomRef}
              src={ampliada.url}
              alt={ampliada.obraNome}
              className="absolute inset-y-0 left-2 right-2 w-auto"
              onEscalaChange={setEscalaAtual}
              onSwipe={mudarFoto}
            />
            <div
              className={cn(
                "absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none px-3 py-1.5 rounded-full bg-black/70 text-white/80 text-[11px] whitespace-nowrap transition-opacity duration-500",
                dica ? "opacity-100" : "opacity-0"
              )}
            >
              Toque duplo para ampliar · deslize para mudar de foto
            </div>
          </div>

          {/* Painel: comandos, informação e miniaturas */}
          <div className={V_PAINEL}>
            <div className="flex items-center justify-center gap-2 px-3 pb-2">
              <button onClick={() => mudarFoto(-1)} disabled={indexAmpliada === 0} aria-label="Foto anterior" className={BTN_ICONE}>
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <div className="flex items-center rounded-full bg-white/10 mx-1">
                <button
                  onClick={() => zoomRef.current?.zoomOut()}
                  disabled={escalaAtual <= 1}
                  aria-label="Diminuir zoom"
                  className="w-11 h-11 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center disabled:opacity-30"
                >
                  <Minus className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => zoomRef.current?.reset()}
                  aria-label="Ajustar à largura do ecrã"
                  className="min-w-[56px] h-11 text-center text-xs font-semibold text-white tabular-nums"
                >
                  {Math.round(escalaAtual * 100)}%
                </button>
                <button
                  onClick={() => zoomRef.current?.zoomIn()}
                  disabled={escalaAtual >= 5}
                  aria-label="Aumentar zoom"
                  className="w-11 h-11 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center disabled:opacity-30"
                >
                  <Plus className="h-5 w-5 text-white" />
                </button>
              </div>
              <button onClick={() => mudarFoto(1)} disabled={indexAmpliada >= filtradas.length - 1} aria-label="Foto seguinte" className={BTN_ICONE}>
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="px-4 pb-2.5 space-y-0.5">
              <p className="text-white font-bold text-[15px] leading-snug flex items-center gap-1.5 min-w-0">
                <HardHat className="h-4 w-4 text-white/50 shrink-0" />
                <span className="truncate">{ampliada.obraNome}</span>
              </p>
              {ampliada.descricao && (
                <p className="text-white/65 text-xs leading-snug line-clamp-2 [@media(max-height:700px)]:line-clamp-1">{ampliada.descricao}</p>
              )}
              <p className="flex items-center gap-1.5 text-white/55 text-xs min-w-0">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{ampliada.colaboradorNome}</span>
                <span className="text-white/25">·</span>
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="shrink-0">{formatData(ampliada.date)}</span>
              </p>
            </div>

            <div className={V_MINIATURAS} style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              {filtradas.map((f, i) => (
                <button
                  key={`${f.url}-${i}`}
                  ref={el => { miniaturasRef.current[i] = el }}
                  onClick={() => setIndexAmpliada(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={cn(
                    "relative w-12 h-12 [@media(max-height:700px)]:w-11 [@media(max-height:700px)]:h-11 rounded-lg overflow-hidden shrink-0 transition-all",
                    i === indexAmpliada ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-80"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={miniatura(f.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  <span className={cn("absolute bottom-0 inset-x-0 h-1", f.tipo === "antes" ? "bg-amber-500" : "bg-emerald-500")} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
