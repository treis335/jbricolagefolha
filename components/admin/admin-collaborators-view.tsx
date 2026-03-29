// components/admin/admin-collaborators-view.tsx
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Users, Euro, Edit, Search, RefreshCw,
  Eye, Clock, TrendingUp, Check, X, Loader2,
  AlertTriangle, AtSign, Mail, UserX, UserCheck,
  ShieldOff,
  Lock,
  Unlock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useCollaborators, type Collaborator } from "@/hooks/useCollaborators"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"

// ─── Confirm suspend dialog ───────────────────────────────────────────────────

function ConfirmSuspendDialog({
  collaborator,
  onConfirm,
  onCancel,
}: {
  collaborator: Collaborator
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex justify-center pt-7 pb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <ShieldOff className="h-7 w-7 text-red-500" />
            </div>
          </div>
          <div className="px-6 pb-2 text-center">
            <p className="text-base font-bold">Inativar {collaborator.name}?</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              O colaborador perderá o acesso à aplicação imediatamente.
              Os seus dados e histórico ficam preservados e podem ser reativados a qualquer momento.
            </p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3 mt-2">
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

// ─── Inline rate editor ───────────────────────────────────────────────────────

function RateEditor({
  collaborator,
  onSaved,
}: {
  collaborator: Collaborator
  onSaved: (newRate: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(collaborator.currentRate || ""))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const rate = parseFloat(draft.replace(",", "."))
    if (isNaN(rate) || rate < 0) { setError("Valor inválido"); return }

    setSaving(true)
    setError(null)
    try {
      const userRef = doc(db, "users", collaborator.id)
      const snap = await getDoc(userRef)
      const existing = snap.data() || {}

      const historyEntry = {
        rate: collaborator.currentRate,
        changedAt: new Date().toISOString(),
        changedBy: "admin",
      }
      const prevHistory: any[] = existing.rateHistory || []

      await setDoc(userRef, {
        workData: {
          ...(existing.workData || {}),
          settings: {
            ...(existing.workData?.settings || {}),
            taxaHoraria: rate,
          },
        },
        rateHistory: [...prevHistory, historyEntry],
      }, { merge: true })

      onSaved(rate)
      setEditing(false)
    } catch (err) {
      console.error(err)
      setError("Erro ao guardar. Tenta novamente.")
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setEditing(false)
    setDraft(String(collaborator.currentRate || ""))
    setError(null)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {collaborator.currentRate > 0 ? (
          <span className="text-base font-bold text-primary tabular-nums">
            {collaborator.currentRate.toFixed(2)} €/h
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">Não definida</span>
        )}
        <button
          onClick={() => { setEditing(true); setDraft(String(collaborator.currentRate || "")) }}
          disabled={!collaborator.ativo}
          className="w-7 h-7 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          title={collaborator.ativo ? "Editar taxa" : "Reativa o colaborador para editar"}
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-24 h-8 pl-6 text-sm font-semibold"
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter") handleSave()
              if (e.key === "Escape") cancel()
            }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="w-8 h-8 rounded-lg border hover:bg-muted flex items-center justify-center transition-all"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// ─── Status badges ────────────────────────────────────────────────────────────

function ActivityBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
      active
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
      {active ? "Ativo" : "Inativo"}
    </span>
  )
}

// Badge separado para conta suspensa (diferente de "sem horas este mês")
function SuspendedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
      <ShieldOff className="h-3 w-3" />
      Suspenso
    </span>
  )
}

// ─── Toggle suspend button ────────────────────────────────────────────────────

function ToggleSuspendButton({
  collaborator,
  onToggled,
  modoGestao,
}: {
  collaborator: Collaborator
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
    } catch (err) {
      console.error("Erro ao alterar estado:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleClick = () => {
    if (collaborator.ativo) {
      // Inativar → pede confirmação
      setShowConfirm(true)
    } else {
      // Reativar → sem confirmação, ação segura
      doToggle()
    }
  }

  // Colaborador já suspenso → botão Reativar sempre visível (ação segura)
  // Colaborador ativo → botão Inativar só aparece em modo de gestão
  if (collaborator.ativo && !modoGestao) return null

  return (
    <>
      {showConfirm && (
        <ConfirmSuspendDialog
          collaborator={collaborator}
          onConfirm={() => { setShowConfirm(false); doToggle() }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <button
        onClick={handleClick}
        disabled={saving}
        title={collaborator.ativo ? "Inativar colaborador" : "Reativar colaborador"}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 active:scale-95 border",
          collaborator.ativo
            ? "border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
            : "border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
        )}
      >
        {saving
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : collaborator.ativo
            ? <><UserX className="h-3.5 w-3.5" />Inativar</>
            : <><UserCheck className="h-3.5 w-3.5" />Reativar</>
        }
      </button>
    </>
  )
}

// ─── Collaborator card (mobile) ───────────────────────────────────────────────

function CollabCard({
  collab,
  onRateUpdated,
  onViewDetail,
  onStatusToggled,
  modoGestao,
}: {
  collab: Collaborator
  onRateUpdated: (id: string, rate: number) => void
  onViewDetail: () => void
  onStatusToggled: (id: string, newAtivo: boolean) => void
  modoGestao: boolean
}) {
  const isActiveWorker = collab.ativo && collab.totalHoursThisMonth > 0

  return (
    <div className={cn(
      "rounded-2xl border bg-card overflow-hidden transition-all",
      !collab.ativo
        ? "border-l-4 border-l-red-400 opacity-75"
        : isActiveWorker
          ? "border-l-4 border-l-emerald-400"
          : "border-l-4 border-l-slate-200 dark:border-l-slate-700"
    )}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
            !collab.ativo
              ? "bg-red-100 text-red-500 dark:bg-red-950/40"
              : isActiveWorker
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
          )}>
            {collab.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{collab.name}</p>
            <p className="text-xs text-muted-foreground truncate">{collab.email}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {!collab.ativo
            ? <SuspendedBadge />
            : <ActivityBadge active={isActiveWorker} />
          }
        </div>
      </div>

      {/* Stats row — só mostra se ativo */}
      {collab.ativo ? (
        <div className="grid grid-cols-3 divide-x border-t border-b">
          <div className="px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Horas/mês</p>
            <p className="text-sm font-bold tabular-nums">{collab.totalHoursThisMonth.toFixed(1)}h</p>
          </div>
          <div className="px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Custo/mês</p>
            <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {collab.totalCostThisMonth.toFixed(0)} €
            </p>
          </div>
          <div className="px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Total hist.</p>
            <p className="text-sm font-bold tabular-nums">{collab.totalHoursAllTime.toFixed(0)}h</p>
          </div>
        </div>
      ) : (
        <div className="border-t border-b px-4 py-2.5 bg-red-50/50 dark:bg-red-950/10">
          <p className="text-xs text-red-500 dark:text-red-400 text-center font-medium">
            Acesso à aplicação suspenso · dados preservados
          </p>
        </div>
      )}

      {/* Rate + actions */}
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Taxa horária</p>
          <RateEditor collaborator={collab} onSaved={rate => onRateUpdated(collab.id, rate)} />
        </div>
        <div className="flex items-center gap-2">
          <ToggleSuspendButton collaborator={collab} onToggled={onStatusToggled} modoGestao={modoGestao} />
          <Button size="sm" onClick={onViewDetail} className="h-8 gap-1.5 text-xs" disabled={!collab.ativo}>
            <Eye className="h-3.5 w-3.5" /> Detalhes
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminCollaboratorsView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  // Modo de gestão: só quando ativo é que os botões "Inativar" aparecem
  // Evita inativações acidentais — o admin tem de ligar explicitamente
  const [modoGestao, setModoGestao] = useState(false)
  const [localRates, setLocalRates] = useState<Record<string, number>>({})
  const [localAtivo, setLocalAtivo] = useState<Record<string, boolean>>({})
  const router = useRouter()

  const { collaborators, loading, error, refetch } = useCollaborators()

  // Merge local overrides (optimistic UI)
  const enriched = collaborators.map(c => ({
    ...c,
    currentRate: localRates[c.id] ?? c.currentRate,
    ativo: localAtivo[c.id] ?? c.ativo,
  }))

  const filtered = enriched.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchAtivo = showInactive ? true : c.ativo
    return matchSearch && matchAtivo
  })

  const stats = {
    total: enriched.length,
    ativos: enriched.filter(c => c.ativo).length,
    suspensos: enriched.filter(c => !c.ativo).length,
    activeWorkers: enriched.filter(c => c.ativo && c.totalHoursThisMonth > 0).length,
    totalHours: enriched.filter(c => c.ativo).reduce((s, c) => s + c.totalHoursThisMonth, 0),
    totalCost: enriched.filter(c => c.ativo).reduce((s, c) => s + c.totalCostThisMonth, 0),
    noRate: enriched.filter(c => c.ativo && (!c.currentRate || c.currentRate === 0)).length,
  }

  const handleRateUpdated = useCallback((id: string, rate: number) => {
    setLocalRates(prev => ({ ...prev, [id]: rate }))
  }, [])

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
      <div className="p-6">
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
      <div className="p-4 pb-24 md:p-8 md:pb-12 space-y-6 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Colaboradores</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Gere taxas horárias e informações da equipa</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
            {/* Modo de gestão: botão discreto que desbloqueia os botões Inativar */}
            <button
              onClick={() => setModoGestao(v => !v)}
              title={modoGestao ? "Desativar modo de gestão" : "Ativar modo de gestão para gerir acessos"}
              className={cn(
                "flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border transition-all active:scale-95",
                modoGestao
                  ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                  : "border-border/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {modoGestao
                ? <><Unlock className="h-3.5 w-3.5" />Gerir acessos</>
                : <><Lock className="h-3.5 w-3.5" />Gerir acessos</>
              }
            </button>
          </div>
        </div>

        {/* ── Banner modo de gestão ativo ── */}
        {modoGestao && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-700">
            <div className="flex items-center gap-3 min-w-0">
              <Unlock className="h-4 w-4 text-red-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">Modo de gestão de acessos ativo</p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                  Os botões de inativar estão visíveis. Clica em <strong>Gerir acessos</strong> para os esconder novamente.
                </p>
              </div>
            </div>
            <button
              onClick={() => setModoGestao(false)}
              className="shrink-0 w-8 h-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}

        {/* ── Alert: sem taxa ── */}
        {stats.noRate > 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              {stats.noRate} colaborador{stats.noRate > 1 ? "es" : ""} sem taxa horária — define clicando no lápis abaixo.
            </p>
          </div>
        )}

        {/* ── Alert: colaboradores suspensos ── */}
        {stats.suspensos > 0 && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 min-w-0">
              <ShieldOff className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                {stats.suspensos} colaborador{stats.suspensos > 1 ? "es" : ""} suspenso{stats.suspensos > 1 ? "s" : ""} — sem acesso à aplicação.
              </p>
            </div>
            <button
              onClick={() => setShowInactive(v => !v)}
              className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              {showInactive ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        )}

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total",
              value: String(stats.ativos),
              icon: <Users className="h-4 w-4" />,
              sub: `${stats.suspensos} suspensos`,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
              iconBg: "bg-blue-100 dark:bg-blue-900/50",
            },
            {
              label: "Ativos (Mês)",
              value: String(stats.activeWorkers),
              icon: <TrendingUp className="h-4 w-4" />,
              sub: `${stats.ativos - stats.activeWorkers} inativos`,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
              iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
            },
            {
              label: "Horas (Mês)",
              value: `${stats.totalHours.toFixed(1)}h`,
              icon: <Clock className="h-4 w-4" />,
              sub: "este mês",
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
              iconBg: "bg-purple-100 dark:bg-purple-900/50",
            },
            {
              label: "Custo (Mês)",
              value: `${stats.totalCost.toFixed(0)} €`,
              icon: <Euro className="h-4 w-4" />,
              sub: "taxa histórica",
              color: "text-orange-600 dark:text-orange-400",
              bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
              iconBg: "bg-orange-100 dark:bg-orange-900/50",
            },
          ].map(item => (
            <div key={item.label} className={cn("rounded-xl border p-4", item.bg)}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("p-1.5 rounded-lg", item.iconBg)}>
                  <span className={item.color}>{item.icon}</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
              </div>
              <p className={cn("text-2xl font-bold tabular-nums", item.color)}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Search + filtro inativos ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar por nome, email ou username..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="h-11 px-4">
              Limpar
            </Button>
          )}
          {stats.suspensos > 0 && (
            <Button
              variant={showInactive ? "default" : "outline"}
              size="sm"
              onClick={() => setShowInactive(v => !v)}
              className="h-11 px-4 gap-1.5 shrink-0"
            >
              <ShieldOff className="h-4 w-4" />
              {showInactive ? "Ocultar suspensos" : "Ver suspensos"}
            </Button>
          )}
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-muted-foreground">
              {searchTerm ? "Nenhum colaborador encontrado" : "Nenhum colaborador registado"}
            </p>
            {searchTerm && (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="mt-3">
                Limpar pesquisa
              </Button>
            )}
          </div>
        )}

        {/* ── Desktop: table ── */}
        {filtered.length > 0 && (
          <>
            <div className="hidden md:block rounded-2xl border bg-card overflow-hidden">
              <div className="grid grid-cols-[2.5fr_1.2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-muted/40 border-b">
                {["Colaborador", "Taxa Horária", "Horas (Mês)", "Custo (Mês)", "Total Hist.", "Ações"].map(h => (
                  <span key={h} className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</span>
                ))}
              </div>

              <div className="divide-y">
                {filtered.map(collab => {
                  const isActiveWorker = collab.ativo && collab.totalHoursThisMonth > 0
                  return (
                    <div
                      key={collab.id}
                      className={cn(
                        "grid grid-cols-[2.5fr_1.2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors",
                        !collab.ativo && "opacity-60 bg-red-50/30 dark:bg-red-950/10"
                      )}
                    >
                      {/* Name + meta */}
                      <div className="min-w-0 flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                          !collab.ativo
                            ? "bg-red-100 text-red-500 dark:bg-red-950/40"
                            : isActiveWorker
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                        )}>
                          {collab.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{collab.name}</p>
                            {!collab.ativo
                              ? <SuspendedBadge />
                              : <ActivityBadge active={isActiveWorker} />
                            }
                            {collab.migrated && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Migrado</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {collab.email}
                          </p>
                          {collab.username && (
                            <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                              <AtSign className="h-3 w-3" /> {collab.username}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rate */}
                      <RateEditor
                        collaborator={collab}
                        onSaved={rate => handleRateUpdated(collab.id, rate)}
                      />

                      {/* Hours this month */}
                      <span className={cn("text-sm font-semibold tabular-nums", !collab.ativo && "text-muted-foreground/50")}>
                        {collab.ativo ? `${collab.totalHoursThisMonth.toFixed(1)}h` : "—"}
                      </span>

                      {/* Cost this month */}
                      <span className={cn("text-sm font-semibold tabular-nums", collab.ativo ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50")}>
                        {collab.ativo ? `${collab.totalCostThisMonth.toFixed(2)} €` : "—"}
                      </span>

                      {/* All-time hours */}
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {collab.totalHoursAllTime.toFixed(0)}h
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <ToggleSuspendButton collaborator={collab} onToggled={handleStatusToggled} modoGestao={modoGestao} />
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          disabled={!collab.ativo}
                          onClick={() => router.push(`/admin/collaborator/${collab.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> Detalhes
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Mobile: cards ── */}
            <div className="md:hidden space-y-3">
              {filtered.map(collab => (
                <CollabCard
                  key={collab.id}
                  collab={collab}
                  onRateUpdated={handleRateUpdated}
                  onViewDetail={() => router.push(`/admin/collaborator/${collab.id}`)}
                  onStatusToggled={handleStatusToggled}
                  modoGestao={modoGestao}
                />
              ))}
            </div>
          </>
        )}

        {/* Footer info */}
        {filtered.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 dark:text-blue-200">
              Clica em <strong>Detalhes</strong> para aceder ao calendário completo, histórico de taxas e relatórios.
              Colaboradores suspensos perdem acesso imediatamente mas os seus dados ficam preservados.
            </p>
          </div>
        )}

      </div>
    </ScrollArea>
  )
}