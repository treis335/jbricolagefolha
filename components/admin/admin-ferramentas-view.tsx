// components/admin/admin-ferramentas-view.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Wrench, Plus, Search, QrCode, Pencil, Loader2, Camera, Printer, Download,
  Archive, ArchiveRestore, Trash2, ImageIcon, User, PackageOpen, HardHat, Clock, History, PackageCheck, ScanLine, X,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ArmazemModal } from "@/components/admin/armazem-modal"
import { QrScanInput } from "@/components/admin/qr-scan-input"
import { feedbackScan } from "@/lib/scan-feedback"
import {
  subscreverFerramentas, numerarFerramentasEmFalta, createFerramenta, updateFerramenta, deleteFerramenta,
  uploadFotoFerramenta, gerarQrDataUrl, miniaturaUrl, getHistoricoFerramenta,
  type Ferramenta, type HistoricoEntrega,
} from "@/lib/ferramentas-service"

// ─── Formulário (criar / editar) ─────────────────────────────────────────────
function FerramentaFormDialog({
  open, onClose, ferramenta, onSaved,
}: {
  open: boolean
  onClose: () => void
  ferramenta: Ferramenta | null   // null = nova
  onSaved: () => void
}) {
  const [nome, setNome] = useState(ferramenta?.nome ?? "")
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string>(ferramenta?.fotoUrl ?? "")
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [erro, setErro] = useState("")
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File | null) => {
    setFotoFile(f)
    if (f) setFotoPreview(URL.createObjectURL(f))
  }

  const handleSave = async () => {
    if (!nome.trim()) { setErro("Dá um nome à ferramenta."); return }
    setSaving(true); setErro(""); setProgress(0)
    try {
      let id = ferramenta?.id
      if (!id) id = await createFerramenta({ nome })
      else await updateFerramenta(id, { nome: nome.trim() })

      if (fotoFile) {
        const { url } = await uploadFotoFerramenta(fotoFile, id, setProgress)
        await updateFerramenta(id, { fotoUrl: url })
      }
      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      setErro(err?.message ?? "Erro ao guardar.")
    } finally {
      setSaving(false)
    }
  }

  const handleArquivar = async () => {
    if (!ferramenta) return
    setSaving(true)
    try {
      await updateFerramenta(ferramenta.id, { ativa: !ferramenta.ativa })
      onSaved(); onClose()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const handleEliminar = async () => {
    if (!ferramenta) return
    setSaving(true)
    try {
      await deleteFerramenta(ferramenta.id)
      onSaved(); onClose()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const emUso = !!ferramenta?.comQuem

  return (
    <Dialog open={open} onOpenChange={v => !v && !saving && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden gap-0 max-h-[90dvh] flex flex-col">
        <DialogTitle className="sr-only">{ferramenta ? "Editar ferramenta" : "Nova ferramenta"}</DialogTitle>
        <DialogDescription className="sr-only">Nome e foto da ferramenta</DialogDescription>

        <div className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <p className="text-base font-black tracking-tight">{ferramenta ? "Editar ferramenta" : "Nova ferramenta"}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {ferramenta
              ? `${ferramenta.numero != null ? `Nº ${ferramenta.numero} · ` : ""}O QR code e o número mantêm-se sempre os mesmos`
              : "O QR code e o número (sequencial) são atribuídos automaticamente ao guardar"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Foto */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Foto</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 bg-muted/20 overflow-hidden flex items-center justify-center transition-colors"
            >
              {fotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoPreview} alt="Pré-visualização" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                  <Camera className="h-7 w-7" />
                  <span className="text-xs font-medium">Tirar foto ou escolher da galeria</span>
                </div>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Nome</p>
            <input
              type="text"
              value={nome}
              onChange={e => { setNome(e.target.value); setErro("") }}
              placeholder="Ex: Berbequim Bosch #2"
              className="w-full h-11 px-3 rounded-xl border border-border/40 bg-background text-sm font-medium"
            />
          </div>

          {erro && <p className="text-xs text-red-500 font-medium">{erro}</p>}
        </div>

        <div className="p-4 pt-3 border-t border-border/40 shrink-0 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress > 0 && progress < 100 ? `${progress}%` : "A guardar…"}</> : "Guardar"}
          </button>

          {ferramenta && (
            <div className="flex gap-2">
              <button
                onClick={handleArquivar}
                disabled={saving || emUso}
                title={emUso ? "Está entregue — devolve-a primeiro" : undefined}
                className="flex-1 h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {ferramenta.ativa ? <><Archive className="h-3.5 w-3.5" /> Arquivar</> : <><ArchiveRestore className="h-3.5 w-3.5" /> Reativar</>}
              </button>
              {!confirmarEliminar ? (
                <button
                  onClick={() => setConfirmarEliminar(true)}
                  disabled={saving || emUso}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              ) : (
                <button
                  onClick={handleEliminar}
                  disabled={saving}
                  className="flex-1 h-9 rounded-xl text-xs font-bold bg-red-500 text-white flex items-center justify-center gap-1.5"
                >
                  Confirmar eliminação
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Popup do QR code ────────────────────────────────────────────────────────
function QrDialog({ ferramenta, onClose }: { ferramenta: Ferramenta | null; onClose: () => void }) {
  const [qr, setQr] = useState("")

  useEffect(() => {
    if (!ferramenta) { setQr(""); return }
    gerarQrDataUrl(ferramenta.id).then(setQr).catch(console.error)
  }, [ferramenta])

  const handleDescarregar = () => {
    if (!qr || !ferramenta) return
    const a = document.createElement("a")
    a.href = qr
    a.download = `qr-${ferramenta.numero != null ? `${ferramenta.numero}-` : ""}${ferramenta.nome.replace(/\s+/g, "-").toLowerCase()}.png`
    a.click()
  }

  const handleImprimirEtiqueta = async () => {
    if (!qr || !ferramenta) return
    const { default: jsPDF } = await import("jspdf")
    const docPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [62, 62] })
    docPdf.addImage(qr, "PNG", 9, 3, 44, 44)
    docPdf.setFont("helvetica", "bold")
    if (ferramenta.numero != null) {
      docPdf.setFontSize(20)
      docPdf.text(`Nº ${ferramenta.numero}`, 31, 54, { align: "center" })
      docPdf.setFontSize(8)
      const linhas = docPdf.splitTextToSize(ferramenta.nome, 56) as string[]
      docPdf.text(linhas[0] ?? "", 31, 59.5, { align: "center" })
    } else {
      docPdf.setFontSize(9)
      const linhas = docPdf.splitTextToSize(ferramenta.nome, 54) as string[]
      docPdf.text(linhas.slice(0, 2), 31, 53, { align: "center" })
    }
    docPdf.save(`etiqueta-${ferramenta.numero != null ? `${ferramenta.numero}-` : ""}${ferramenta.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`)
  }

  return (
    <Dialog open={!!ferramenta} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xs rounded-3xl p-6 gap-4">
        <DialogTitle className="text-center text-base font-black">
          {ferramenta?.numero != null && <span className="block text-3xl tabular-nums">Nº {ferramenta.numero}</span>}
          {ferramenta?.nome}
        </DialogTitle>
        <DialogDescription className="sr-only">QR code da ferramenta</DialogDescription>
        <div className="aspect-square w-full rounded-2xl bg-white border border-border/40 flex items-center justify-center p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR ${ferramenta?.nome}`} className="w-full h-full" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleDescarregar} className="flex-1 h-10 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold flex items-center justify-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> PNG
          </button>
          <button onClick={handleImprimirEtiqueta} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Etiqueta
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers de datas ────────────────────────────────────────────────────────
function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}
function haQuanto(iso: string): string {
  const d = diasDesde(iso)
  return d === 0 ? "hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`
}
function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })
}

// ─── Detalhe: onde está agora + histórico + ações ────────────────────────────
function FerramentaDetalhe({ ferramenta, onClose, onQr, onEditar }: {
  ferramenta: Ferramenta | null
  onClose: () => void
  onQr: (f: Ferramenta) => void
  onEditar: (f: Ferramenta) => void
}) {
  const [historico, setHistorico] = useState<HistoricoEntrega[]>([])
  const [loadingHist, setLoadingHist] = useState(false)
  const id = ferramenta?.id
  const desde = ferramenta?.comQuem?.desde

  // carrega ao abrir e volta a carregar quando a ferramenta é entregue/devolvida
  useEffect(() => {
    if (!id) { setHistorico([]); return }
    setLoadingHist(true)
    getHistoricoFerramenta(id).then(setHistorico).catch(console.error).finally(() => setLoadingHist(false))
  }, [id, desde])

  return (
    <Dialog open={!!ferramenta} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden gap-0 max-h-[90dvh] flex flex-col">
        {ferramenta && (
          <>
            <DialogTitle className="sr-only">{ferramenta.nome}</DialogTitle>
            <DialogDescription className="sr-only">Estado atual e histórico da ferramenta</DialogDescription>

            <div className="flex-1 overflow-y-auto">
              <div className="relative aspect-video bg-muted/30 flex items-center justify-center overflow-hidden">
                {ferramenta.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={miniaturaUrl(ferramenta.fotoUrl, 800)} alt={ferramenta.nome} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                )}
              </div>

              <div className="p-5 space-y-4">
                <div>
                  {ferramenta.numero != null && (
                    <p className="text-xs font-black tracking-widest text-muted-foreground tabular-nums">Nº {ferramenta.numero}</p>
                  )}
                  <p className="text-xl font-black tracking-tight leading-tight">{ferramenta.nome}</p>
                </div>

                {!ferramenta.ativa ? (
                  <div className="rounded-2xl bg-muted/50 p-4 text-sm font-semibold text-muted-foreground">Arquivada</div>
                ) : ferramenta.comQuem ? (
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-4 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700/70 dark:text-amber-400/60">Está com</p>
                    <p className="flex items-center gap-2 text-sm font-bold"><User className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" /> {ferramenta.comQuem.colaboradorNome}</p>
                    <p className="flex items-center gap-2 text-sm"><HardHat className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" /> {ferramenta.comQuem.obraNome}</p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5 shrink-0" /> {haQuanto(ferramenta.comQuem.desde)} ({fmtData(ferramenta.comQuem.desde)})</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-4 flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Disponível no armazém</span>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                    <History className="h-3 w-3" /> Histórico
                  </p>
                  {loadingHist ? (
                    <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  ) : historico.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Ainda sem entregas.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {historico.map(h => (
                        <div key={h.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-muted/40 text-xs">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{h.colaboradorNome} · {h.obraNome}</p>
                            <p className="text-muted-foreground">
                              {fmtData(h.entregueEm)} → {h.devolvidoEm ? fmtData(h.devolvidoEm) : "ainda com ele"}
                            </p>
                          </div>
                          {!h.devolvidoEm && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 rounded-full px-2 py-0.5 shrink-0">Em curso</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 shrink-0 flex gap-2">
              <button onClick={() => onQr(ferramenta)} className="flex-1 h-11 rounded-xl bg-muted/60 hover:bg-muted text-sm font-semibold flex items-center justify-center gap-1.5">
                <QrCode className="h-4 w-4" /> QR / Etiqueta
              </button>
              <button onClick={() => onEditar(ferramenta)} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5">
                <Pencil className="h-4 w-4" /> Editar
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Ecrã principal ──────────────────────────────────────────────────────────
export function AdminFerramentasView() {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState("")
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  const [formAberto, setFormAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Ferramenta | null>(null)
  const [qrDe, setQrDe] = useState<Ferramenta | null>(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [armazemAberto, setArmazemAberto] = useState(false)
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [scanAberto, setScanAberto] = useState(false)
  const [scanErro, setScanErro] = useState("")
  const [filtro, setFiltro] = useState<"todas" | "obra" | "livres">("todas")

  // Tempo real: entregas/devoluções e edições de qualquer admin aparecem logo
  useEffect(() => {
    const unsub = subscreverFerramentas(
      lista => { setFerramentas(lista); setLoading(false) },
      err => { console.error(err); setLoading(false) },
    )
    return unsub
  }, [])

  // Ferramentas criadas antes da numeração recebem número (uma vez, por ordem de criação)
  const numeracaoFeita = useRef(false)
  useEffect(() => {
    if (loading || numeracaoFeita.current) return
    if (ferramentas.some(f => f.numero == null)) {
      numeracaoFeita.current = true
      numerarFerramentasEmFalta().catch(err => { numeracaoFeita.current = false; console.error(err) })
    }
  }, [loading, ferramentas])

  const visiveis = useMemo(() => {
    const q = pesquisa.trim().toLowerCase().replace(/^#/, "")
    const n = /^\d+$/.test(q) ? Number(q) : null
    const lista = ferramentas.filter(f => {
      if (filtro === "todas" ? !(mostrarArquivadas || f.ativa) : !f.ativa || (filtro === "obra") !== !!f.comQuem) return false
      return !q || f.nome.toLowerCase().includes(q) || (n !== null && f.numero === n)
    })
    // "Em obra": as que estão fora há mais tempo primeiro
    if (filtro === "obra") lista.sort((a, b) => (a.comQuem!.desde < b.comQuem!.desde ? -1 : 1))
    return lista
  }, [ferramentas, pesquisa, mostrarArquivadas, filtro])

  const ativas = ferramentas.filter(f => f.ativa)
  const nObra = ativas.filter(f => f.comQuem).length
  const nLivres = ativas.length - nObra
  const detalhe = ferramentas.find(f => f.id === detalheId) ?? null
  const nArquivadas = ferramentas.length - ativas.length

  // Picar QR (câmara ou pistola) ou escrever o número → abre logo a ferramenta
  const handleScan = (code: string) => {
    const c = code.trim().replace(/^#/, "")
    const f = ferramentas.find(ff => ff.id === c || (/^\d+$/.test(c) && ff.numero === Number(c)))
    if (f) { feedbackScan("sucesso"); setScanErro(""); setScanAberto(false); setDetalheId(f.id) }
    else { feedbackScan("erro"); setScanErro("Nenhuma ferramenta encontrada com esse código.") }
  }

  // Enter com um número exato abre logo essa ferramenta (ex.: "12")
  const abrirPorNumero = () => {
    const q = pesquisa.trim().replace(/^#/, "")
    if (!/^\d+$/.test(q)) return
    const f = ferramentas.find(ff => ff.numero === Number(q))
    if (f) { setDetalheId(f.id); setPesquisa("") }
  }

  const abrirNova = () => { setEmEdicao(null); setFormAberto(true) }
  const abrirEditar = (f: Ferramenta) => { setEmEdicao(f); setFormAberto(true) }

  // Folha A4 com todas as etiquetas (3 colunas × 5 linhas por página)
  const handleImprimirTodas = async () => {
    const ativas = ferramentas.filter(f => f.ativa)
    if (ativas.length === 0) return
    setGerandoPdf(true)
    try {
      const { default: jsPDF } = await import("jspdf")
      const docPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const qrs = await Promise.all(ativas.map(f => gerarQrDataUrl(f.id)))

      const cols = 3, rows = 5
      const cellW = 63, cellH = 55, offsetX = 10.5, offsetY = 11
      const perPage = cols * rows

      ativas.forEach((f, i) => {
        if (i > 0 && i % perPage === 0) docPdf.addPage()
        const pos = i % perPage
        const x = offsetX + (pos % cols) * cellW
        const y = offsetY + Math.floor(pos / cols) * cellH

        docPdf.setDrawColor(200)
        docPdf.setLineDashPattern([1, 1], 0)
        docPdf.rect(x, y, cellW, cellH)
        docPdf.setLineDashPattern([], 0)

        docPdf.addImage(qrs[i], "PNG", x + 14.5, y + 2, 34, 34)
        docPdf.setFont("helvetica", "bold")
        docPdf.setTextColor(20)
        if (f.numero != null) {
          docPdf.setFontSize(14)
          docPdf.text(`Nº ${f.numero}`, x + cellW / 2, y + 42, { align: "center" })
          docPdf.setFontSize(8)
          const linhas = docPdf.splitTextToSize(f.nome, cellW - 6) as string[]
          docPdf.text(linhas.slice(0, 2), x + cellW / 2, y + 47, { align: "center" })
        } else {
          docPdf.setFontSize(9)
          const linhas = docPdf.splitTextToSize(f.nome, cellW - 6) as string[]
          docPdf.text(linhas.slice(0, 2), x + cellW / 2, y + 42, { align: "center" })
        }
      })

      docPdf.save("etiquetas-ferramentas.pdf")
    } catch (err) {
      console.error(err)
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5 pb-28">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
          <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black tracking-tight">Ferramentas</h1>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {nObra} em obra · {nLivres} disponíveis
          </p>
        </div>
        <button
          onClick={() => setArmazemAberto(true)}
          className="h-10 px-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 shrink-0"
        >
          <PackageOpen className="h-4 w-4" /> <span className="hidden sm:inline">Armazém</span>
        </button>
        <button
          onClick={abrirNova}
          className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" /> Nova
        </button>
      </div>

      {/* Pesquisa + ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <input
            type="text"
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") abrirPorNumero() }}
            placeholder="Pesquisar por nome ou número…"
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-border/50 bg-card text-sm"
          />
        </div>
        <button
          onClick={() => { setScanAberto(v => !v); setScanErro("") }}
          className={cn(
            "h-11 px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 shrink-0 transition-colors",
            scanAberto ? "bg-red-500 text-white" : "bg-primary text-primary-foreground"
          )}
        >
          {scanAberto ? <X className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />} {scanAberto ? "Fechar" : "Picar"}
        </button>
        <button
          onClick={handleImprimirTodas}
          disabled={gerandoPdf || ferramentas.filter(f => f.ativa).length === 0}
          title="Imprimir todas as etiquetas"
          className="h-11 px-3.5 rounded-xl bg-muted/60 hover:bg-muted disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 shrink-0"
        >
          {gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          <span className="hidden sm:inline">Etiquetas</span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
        {([["todas", "Todas", ativas.length], ["obra", "Em obra", nObra], ["livres", "Disponíveis", nLivres]] as const).map(([k, label, n]) => (
          <button
            key={k}
            onClick={() => setFiltro(k)}
            className={cn(
              "h-9 px-3.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors",
              filtro === k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
            )}
          >
            {label} <span className="opacity-70 tabular-nums ml-0.5">{n}</span>
          </button>
        ))}
      </div>

      {scanAberto && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <QrScanInput onScan={handleScan} placeholder="Pica o QR ou escreve o número…" />
          {scanErro && <p className="text-xs text-red-500 font-medium px-1">{scanErro}</p>}
        </div>
      )}

      {filtro === "todas" && nArquivadas > 0 && (
        <button
          onClick={() => setMostrarArquivadas(v => !v)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {mostrarArquivadas ? "Esconder" : "Mostrar"} {nArquivadas} arquivada{nArquivadas !== 1 ? "s" : ""}
        </button>
      )}

      {/* Lista */}
      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">A carregar…</span>
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center py-14 text-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Wrench className="h-6 w-6 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground">
            {ferramentas.length === 0 ? "Ainda não há ferramentas. Adiciona a primeira." : "Nenhuma ferramenta encontrada."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visiveis.map(f => (
            <button key={f.id} onClick={() => setDetalheId(f.id)} className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col text-left transition-all hover:border-primary/40 active:scale-[0.98]", !f.ativa && "opacity-60")}>
              <div className="relative aspect-[4/3] bg-muted/30 flex items-center justify-center overflow-hidden">
                {f.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={miniaturaUrl(f.fotoUrl)} alt={f.nome} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                )}
                {f.numero != null && (
                  <span className="absolute top-2 left-2 min-w-7 h-7 px-2 rounded-lg bg-black/70 text-white text-xs font-black tabular-nums flex items-center justify-center backdrop-blur-sm">
                    {f.numero}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <p className="text-sm font-bold leading-tight line-clamp-2">{f.nome}</p>

                {!f.ativa ? (
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5 self-start">Arquivada</span>
                ) : f.comQuem ? (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 rounded-full px-2 py-0.5 self-start flex items-center gap-1 max-w-full w-fit">
                      <User className="h-2.5 w-2.5 shrink-0" /> <span className="truncate">{f.comQuem.colaboradorNome}</span>
                    </span>
                    <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1">
                      <HardHat className="h-2.5 w-2.5 shrink-0" /> {f.comQuem.obraNome} · {haQuanto(f.comQuem.desde)}
                    </p>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 rounded-full px-2 py-0.5 self-start">Disponível</span>
                )}

              </div>
            </button>
          ))}
        </div>
      )}

      {/* key força reset do estado interno do form ao trocar de ferramenta */}
      {formAberto && (
        <FerramentaFormDialog
          key={emEdicao?.id ?? "nova"}
          open
          onClose={() => setFormAberto(false)}
          ferramenta={emEdicao}
          onSaved={() => {}}
        />
      )}
      <FerramentaDetalhe
        ferramenta={detalhe}
        onClose={() => setDetalheId(null)}
        onQr={f => { setDetalheId(null); setQrDe(f) }}
        onEditar={f => { setDetalheId(null); abrirEditar(f) }}
      />
      <QrDialog ferramenta={qrDe} onClose={() => setQrDe(null)} />
      <ArmazemModal open={armazemAberto} onClose={() => setArmazemAberto(false)} />
    </div>
  )
}
