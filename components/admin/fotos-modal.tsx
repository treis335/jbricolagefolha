// components/admin/fotos-modal.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { X, Camera, HardHat, Check, CheckSquare, Undo2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { VisualizadorFotos, type FotoFlat } from "@/components/admin/visualizador-fotos"
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


export function FotosModal({ open, onClose, collaborators = [], onChanged }: Props) {
  const [colaboradorId, setColaboradorId] = useState<string>("todos")
  const [tipo, setTipo] = useState<"todas" | "antes" | "depois">("todas")
  const [busca, setBusca] = useState("")
  const [indexAmpliada, setIndexAmpliada] = useState<number | null>(null)

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

      {/* Visualizador em ecrã inteiro (componente partilhado) */}
      <VisualizadorFotos fotos={filtradas} indice={indexAmpliada} onMudar={setIndexAmpliada} />
    </div>,
    document.body
  )
}
