// components/admin/admin-ferramentas-view.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Wrench, Plus, Search, QrCode, Pencil, Loader2, Camera, Printer, Download,
  Archive, ArchiveRestore, Trash2, ImageIcon, User, PackageOpen, MapPin, HardHat,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ArmazemModal } from "@/components/admin/armazem-modal"
import { LocalizarFerramentaModal } from "@/components/admin/localizar-ferramenta-modal"
import {
  subscreverFerramentas, numerarFerramentasEmFalta, createFerramenta, updateFerramenta, deleteFerramenta,
  uploadFotoFerramenta, gerarQrDataUrl, miniaturaUrl, type Ferramenta,
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
  const [localizarAberto, setLocalizarAberto] = useState(false)

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
    return ferramentas.filter(f =>
      (mostrarArquivadas ? true : f.ativa) &&
      (!q || f.nome.toLowerCase().includes(q) || (n !== null && f.numero === n))
    )
  }, [ferramentas, pesquisa, mostrarArquivadas])

  const nArquivadas = ferramentas.filter(f => !f.ativa).length

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
            {ferramentas.filter(f => f.ativa).length} no catálogo
          </p>
        </div>
        <button
          onClick={() => setLocalizarAberto(true)}
          className="h-10 px-3.5 rounded-2xl bg-muted/60 hover:bg-muted text-sm font-bold flex items-center gap-1.5 shrink-0"
        >
          <MapPin className="h-4 w-4" /> <span className="hidden sm:inline">Localizar</span>
        </button>
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
            placeholder="Pesquisar por nome ou número…"
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-border/50 bg-card text-sm"
          />
        </div>
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

      {nArquivadas > 0 && (
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
            <div key={f.id} className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col", !f.ativa && "opacity-60")}>
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
                      <HardHat className="h-2.5 w-2.5 shrink-0" /> {f.comQuem.obraNome}
                    </p>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 rounded-full px-2 py-0.5 self-start">Disponível</span>
                )}

                <div className="flex gap-1.5 mt-auto pt-1">
                  <button onClick={() => setQrDe(f)} className="flex-1 h-8 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-semibold flex items-center justify-center gap-1">
                    <QrCode className="h-3.5 w-3.5" /> QR
                  </button>
                  <button onClick={() => abrirEditar(f)} className="flex-1 h-8 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-semibold flex items-center justify-center gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                </div>
              </div>
            </div>
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
      <QrDialog ferramenta={qrDe} onClose={() => setQrDe(null)} />
      <ArmazemModal open={armazemAberto} onClose={() => setArmazemAberto(false)} />
      <LocalizarFerramentaModal open={localizarAberto} onClose={() => setLocalizarAberto(false)} />
    </div>
  )
}
