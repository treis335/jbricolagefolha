// components/admin/admin-collaborators-view.tsx
"use client"
import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Users, Euro, Search, RefreshCw,
  Eye, X, Loader2, Mail, Phone,
  UserX, UserCheck, ShieldOff, Lock, Unlock,
  CreditCard, ChevronDown, ChevronUp, Zap, ZapOff,
  Building2, Hash, Info, Copy, CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useCollaborators, type Collaborator } from "@/hooks/useCollaborators"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
interface CollaboratorExtended extends Collaborator {
  telemovel?: string
  banco?: string
  iban?: string
  mbwayAtivo?: boolean
  mbwayTelemovel?: string
  mbwayTitular?: string
  fotoUrl?: string
}

// ─── Confirm Dialogs ──────────────────────────────────────────────────────────
function ConfirmSuspendDialog({
  collaborator,
  onConfirm,
  onCancel,
}: {
  collaborator: CollaboratorExtended
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex justify-center pt-7 pb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <ShieldOff className="h-7 w-7 text-red-500" />
            </div>
          </div>
          <div className="px-6 pb-2 text-center">
            <p className="text-base font-bold">Inativar {collaborator.name}?</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              O colaborador perde o acesso imediatamente. Os dados e histórico ficam preservados.
            </p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="h-11 rounded-xl border border-border/50 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="h-11 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors active:scale-95 shadow-sm shadow-red-500/30"
            >
              Inativar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ConfirmReactivateDialog({
  collaborator,
  onConfirm,
  onCancel,
}: {
  collaborator: CollaboratorExtended
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex justify-center pt-7 pb-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <UserCheck className="h-7 w-7 text-emerald-500" />
            </div>
          </div>
          <div className="px-6 pb-2 text-center">
            <p className="text-base font-bold">Reativar {collaborator.name}?</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              O colaborador recupera o acesso imediatamente.
            </p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="h-11 rounded-xl border border-border/50 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors active:scale-95 shadow-sm shadow-emerald-500/30"
            >
              Reativar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ collab }: { collab: CollaboratorExtended }) {
  if (!collab.ativo) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 shrink-0">
        <ShieldOff className="h-3 w-3" /> Suspenso
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Ativo
    </span>
  )
}

// ─── Toggle Suspend Button ────────────────────────────────────────────────────
function ToggleSuspendButton({
  collaborator,
  onToggled,
  modoGestao,
}: {
  collaborator: CollaboratorExtended
  onToggled: (id: string, newAtivo: boolean) => void
  modoGestao: boolean
}) {
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const doToggle = async () => {
    setSaving(true)
    try {
      const newAtivo = !collaborator.ativo
      await setDoc(doc(db, "users", collaborator.id), { ativo: newAtivo }, { merge: true })
      onToggled(collaborator.id, newAtivo)
    } catch {
      console.error("Erro ao alterar estado")
    } finally {
      setSaving(false)
    }
  }

  if (collaborator.ativo && !modoGestao) return null

  return (
    <>
      {showConfirm && collaborator.ativo && (
        <ConfirmSuspendDialog collaborator={collaborator} onConfirm={() => { setShowConfirm(false); doToggle() }} onCancel={() => setShowConfirm(false)} />
      )}
      {showConfirm && !collaborator.ativo && (
        <ConfirmReactivateDialog collaborator={collaborator} onConfirm={() => { setShowConfirm(false); doToggle() }} onCancel={() => setShowConfirm(false)} />
      )}

      <button
        onClick={() => setShowConfirm(true)}
        disabled={saving}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 active:scale-95 border shrink-0",
          collaborator.ativo
            ? "border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
            : "border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
        )}
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : collaborator.ativo ? (
          <><UserX className="h-3.5 w-3.5" /><span>Inativar</span></>
        ) : (
          <><UserCheck className="h-3.5 w-3.5" /><span>Reativar</span></>
        )}
      </button>
    </>
  )
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors shrink-0" title="Copiar">
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground/40" />}
    </button>
  )
}

// ─── Info Row & Bank Section ──────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  sensitive,
  copyable,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  sensitive?: boolean
  copyable?: boolean
}) {
  const [revealed, setRevealed] = useState(false)
  const display = sensitive && value && !revealed
    ? value.slice(0, 4) + " ···· ···· " + value.slice(-4)
    : (value || "")

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground/50">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold mb-0.5">{label}</p>
        {value ? (
          <div className="flex items-center gap-1 min-w-0">
            <p className={cn("text-xs font-semibold truncate flex-1 min-w-0", sensitive && "font-mono")}>
              {display}
            </p>
            {sensitive && (
              <button
                onClick={() => setRevealed(v => !v)}
                className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors px-1"
              >
                {revealed ? "ocultar" : "ver"}
              </button>
            )}
            {copyable && <CopyButton value={value} />}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/35 italic">Não preenchido</p>
        )}
      </div>
    </div>
  )
}

function BankInfoSection({ collab }: { collab: CollaboratorExtended }) {
  const [open, setOpen] = useState(false)
  const hasAny = collab.telemovel || collab.banco || collab.iban || collab.mbwayAtivo

  return (
    <div className={cn("border-t border-border/20 transition-all", open ? "bg-muted/20" : "")}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CreditCard className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground/70">Informação de contacto & pagamento</span>
          {!hasAny && <span className="text-[10px] text-muted-foreground/40 italic">Não preenchida</span>}
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telemóvel" value={collab.telemovel} copyable />
          <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Banco" value={collab.banco} />
          <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="IBAN" value={collab.iban} sensitive copyable />

          <div className="flex items-start gap-2.5">
            <div className={cn("mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0", collab.mbwayAtivo ? "bg-blue-100 dark:bg-blue-950/40" : "bg-muted")}>
              {collab.mbwayAtivo ? <Zap className="h-3.5 w-3.5 text-blue-500" /> : <ZapOff className="h-3.5 w-3.5 text-muted-foreground/40" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold mb-0.5">MBway</p>
              {collab.mbwayAtivo ? (
                <div className="space-y-0.5">
                  {collab.mbwayTitular && <p className="text-xs font-semibold truncate">{collab.mbwayTitular}</p>}
                  {collab.mbwayTelemovel && (
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground truncate">{collab.mbwayTelemovel}</p>
                      <CopyButton value={collab.mbwayTelemovel} />
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <Zap className="h-2.5 w-2.5" /> Ativo
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/40 italic">Não configurado</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Collab Card (Mobile) ─────────────────────────────────────────────────────
function CollabCard({
  collab,
  onStatusToggled,
  modoGestao,
  onViewDetail,
}: {
  collab: CollaboratorExtended
  onStatusToggled: (id: string, newAtivo: boolean) => void
  modoGestao: boolean
  onViewDetail: () => void
}) {
  const initials = collab.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()

  return (
    <div className={cn(
      "rounded-2xl border bg-card overflow-hidden transition-all w-full",
      !collab.ativo ? "border-l-4 border-l-red-400 opacity-80" : "border-l-4 border-l-emerald-400"
    )}>
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        {collab.fotoUrl ? (
          <img src={collab.fotoUrl} alt={collab.name} className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-border/20" />
        ) : (
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
            !collab.ativo ? "bg-red-100 text-red-500 dark:bg-red-950/40" : "bg-primary/10 text-primary"
          )}>
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm truncate">{collab.name}</p>
            <StatusBadge collab={collab} />
          </div>
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <Mail className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            <p className="text-xs text-muted-foreground truncate">{collab.email}</p>
          </div>
          {collab.telemovel && (
            <div className="flex items-center gap-1 min-w-0">
              <Phone className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">{collab.telemovel}</p>
              <CopyButton value={collab.telemovel} />
            </div>
          )}
        </div>
      </div>

      {!collab.ativo && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center">
            Acesso suspenso · dados preservados
          </p>
        </div>
      )}

      {/* Taxa Horária */}
      <div className="mx-4 mb-3 px-4 py-3 bg-muted/40 rounded-xl flex items-center gap-3">
        <Euro className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-[10px] text-muted-foreground/60 font-medium">Taxa horária</p>
          <p className="text-sm font-semibold tabular-nums">
            {collab.currentRate > 0 ? `${collab.currentRate.toFixed(2)} €/h` : "Não definida"}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2 border-t border-border/15 pt-3">
        <ToggleSuspendButton collaborator={collab} onToggled={onStatusToggled} modoGestao={modoGestao} />
        <Button
          onClick={onViewDetail}
          disabled={!collab.ativo}
          className="flex-1 h-10 bg-primary hover:bg-primary/90 text-sm font-semibold disabled:opacity-50"
        >
          <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
        </Button>
      </div>

      <BankInfoSection collab={collab} />
    </div>
  )
}

// ─── Extended Data Hook ───────────────────────────────────────────────────────
function useExtendedData(collaborators: Collaborator[]): CollaboratorExtended[] {
  const [extended, setExtended] = useState<CollaboratorExtended[]>(collaborators)

  useEffect(() => {
    if (collaborators.length === 0) return

    const fetchAll = async () => {
      const results = await Promise.all(
        collaborators.map(async (c) => {
          try {
            const snap = await getDoc(doc(db, "users", c.id))
            if (!snap.exists()) return c as CollaboratorExtended
            const d = snap.data()
            return {
              ...c,
              telemovel: d.telemovel || "",
              banco: d.banco || "",
              iban: d.iban || "",
              mbwayAtivo: d.mbwayAtivo || false,
              mbwayTelemovel: d.mbwayTelemovel || "",
              mbwayTitular: d.mbwayTitular || "",
              fotoUrl: d.fotoUrl || "",
            } as CollaboratorExtended
          } catch {
            return c as CollaboratorExtended
          }
        })
      )
      setExtended(results)
    }
    fetchAll()
  }, [collaborators])

  return extended
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminCollaboratorsView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [apenasInativos, setApenasInativos] = useState(false)
  const [modoGestao, setModoGestao] = useState(false)
  const [localAtivo, setLocalAtivo] = useState<Record<string, boolean>>({})

  const router = useRouter()
  const { collaborators, loading, error, refetch } = useCollaborators()

  const mergedCollabs = collaborators.map(c => ({
    ...c,
    ativo: localAtivo[c.id] ?? c.ativo,
  }))

  const extended = useExtendedData(mergedCollabs)

  const filtered = extended
    .filter(c => {
      const q = searchTerm.toLowerCase()
      const matchSearch =
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q) ||
        (c.telemovel || "").includes(q)

      return matchSearch && (apenasInativos ? !c.ativo : c.ativo)
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt"))

  const stats = {
    ativos: extended.filter(c => c.ativo).length,
    suspensos: extended.filter(c => !c.ativo).length,
  }

  const handleStatusToggled = useCallback((id: string, newAtivo: boolean) => {
    setLocalAtivo(prev => ({ ...prev, [id]: newAtivo }))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">A carregar colaboradores...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-destructive/50 max-w-md mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive font-medium">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 md:px-8 py-6 pb-24 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Colaboradores</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.ativos} ativo{stats.ativos !== 1 ? "s" : ""}
              {stats.suspensos > 0 && ` · ${stats.suspensos} suspenso${stats.suspensos !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="w-9 h-9 rounded-xl border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setModoGestao(v => !v)}
              className={cn(
                "flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold border transition-all active:scale-95",
                modoGestao
                  ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                  : "border-border/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {modoGestao ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span className="hidden sm:inline">Gerir acessos</span>
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border p-5 bg-card">
            <p className="text-sm text-muted-foreground">Total de Colaboradores</p>
            <p className="text-3xl font-bold mt-1">{stats.ativos + stats.suspensos}</p>
          </div>
          <div className="rounded-2xl border p-5 bg-card">
            <p className="text-sm text-muted-foreground">Colaboradores Ativos</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600">{stats.ativos}</p>
          </div>
        </div>

        {/* Search + Filtro */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
            <Input
              placeholder="Nome, email, username ou telemóvel..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {stats.suspensos > 0 && (
            <button
              onClick={() => setApenasInativos(v => !v)}
              className={cn(
                "flex items-center gap-2 h-11 px-5 rounded-xl border text-xs font-semibold transition-all active:scale-95 whitespace-nowrap",
                apenasInativos
                  ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                  : "border-border/50 hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldOff className="h-4 w-4" />
              {apenasInativos ? "Ver ativos" : "Ver suspensos"}
            </button>
          )}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="font-medium text-muted-foreground">
              {searchTerm ? "Nenhum resultado encontrado" : "Nenhum colaborador registado"}
            </p>
          </div>
        )}

        {/* Desktop Table - Com Telemóvel */}
        {filtered.length > 0 && (
          <div className="hidden lg:block rounded-2xl border bg-card overflow-hidden">
            <div className="grid grid-cols-[2.4fr_1.3fr_1fr_auto] gap-4 px-6 py-4 bg-muted/50 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <div>Colaborador</div>
              <div>Contacto</div>
              <div>Taxa Horária</div>
              <div className="text-right">Ações</div>
            </div>
            <div className="divide-y">
              {filtered.map((collab) => (
                <div
                  key={collab.id}
                  className={cn(
                    "grid grid-cols-[2.4fr_1.3fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors",
                    !collab.ativo && "opacity-75"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {collab.fotoUrl ? (
                      <img src={collab.fotoUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {collab.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{collab.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{collab.email}</p>
                    </div>
                    <StatusBadge collab={collab} />
                  </div>

                  {/* Telemóvel */}
                  <div className="flex items-center gap-2 text-sm">
                    {collab.telemovel ? (
                      <>
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium tabular-nums">{collab.telemovel}</span>
                        <CopyButton value={collab.telemovel} />
                      </>
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">—</span>
                    )}
                  </div>

                  {/* Taxa Horária */}
                  <div className="text-sm font-medium tabular-nums">
                    {collab.currentRate > 0 ? `${collab.currentRate.toFixed(2)} €/h` : "Não definida"}
                  </div>

                  <div className="flex justify-end gap-2">
                    <ToggleSuspendButton
                      collaborator={collab}
                      onToggled={handleStatusToggled}
                      modoGestao={modoGestao}
                    />
                    <Button
                      size="sm"
                      onClick={() => router.push(`/admin/collaborator/${collab.id}`)}
                      disabled={!collab.ativo}
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Cards */}
        {filtered.length > 0 && (
          <div className="lg:hidden space-y-3">
            {filtered.map((collab) => (
              <CollabCard
                key={collab.id}
                collab={collab}
                onStatusToggled={handleStatusToggled}
                modoGestao={modoGestao}
                onViewDetail={() => router.push(`/admin/collaborator/${collab.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}