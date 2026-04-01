//admin-finance-view.tsx

"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle2, Clock, AlertCircle, Plus, Eye, FileDown,
  AlertTriangle, Trash2, Search, RefreshCw, ChevronLeft,
  ChevronRight, Loader2, X, CreditCard, Calendar, Users,
  Banknote, ArrowUpRight, ChevronDown, ChevronUp,
  Euro, SlidersHorizontal, ReceiptText,
} from "lucide-react"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Payment {
  id: string
  date: string
  valor: number
  metodo: string
  source?: "admin" | string
}
interface MonthSummary {
  periodo: string
  hours: number
  cost: number
  paid: number
  pending: number
  payments: Payment[]
}
interface CollabFinance {
  collaboratorId: string
  name: string
  email: string
  currentRate: number
  allMonths: MonthSummary[]
  selectedMonth: MonthSummary
  totalPendingAll: number
  overdueAmount: number
  status: string
  recentPayments: Payment[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DELETE_WARN_KEY = "adminDeletePaymentWarnDismissed"
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)
const fmtMonth = (key: string) =>
  new Date(key + "-02").toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
const fmtShortMonth = (key: string) =>
  new Date(key + "-02").toLocaleDateString("pt-PT", { month: "short", year: "2-digit" })
const getTodayKey = () => new Date().toISOString().slice(0, 7)

function resolveEntryTaxa(entry: any, rate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const t = entry.services[0]?.taxaHoraria
    if (typeof t === "number" && t > 0) return t
  }
  return rate
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    pago:          { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500", label: "Pago" },
    pendente:      { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",             dot: "bg-amber-500",   label: "Pendente" },
    atrasado:      { cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",                         dot: "bg-red-500",     label: "Atrasado" },
    sem_atividade: { cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",               dot: "bg-slate-400",   label: "Inativo" },
  }
  const c = map[status] ?? map.sem_atividade
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide", c.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", c.dot)} />
      {c.label}
    </span>
  )
}

function MethodTag({ metodo }: { metodo: string }) {
  const m: Record<string, { label: string; icon: React.ReactNode }> = {
    transferencia: { label: "Transf.", icon: <ArrowUpRight className="h-3 w-3" /> },
    mbway:         { label: "MBway",   icon: <CreditCard className="h-3 w-3" /> },
    dinheiro:      { label: "Dinheiro",icon: <Banknote className="h-3 w-3" /> },
  }
  const t = m[metodo] ?? { label: metodo, icon: null }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-muted border font-medium text-muted-foreground">
      {t.icon}{t.label}
    </span>
  )
}

function MiniBar({ paid, cost }: { paid: number; cost: number }) {
  const pct = cost > 0 ? Math.min((paid / cost) * 100, 100) : 0
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-0">
        <div
          className={cn("h-full rounded-full transition-all duration-500",
            pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : "bg-muted-foreground/20"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{Math.round(pct)}%</span>
    </div>
  )
}

// ─── Month Navigator ──────────────────────────────────────────────────────────
function MonthNavigator({ current, onChange, months }: {
  current: string; onChange: (m: string) => void; months: string[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = getTodayKey()
  const idx = months.indexOf(current)

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-active="true"]`) as HTMLElement | null
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" })
  }, [current])

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => idx > 0 && onChange(months[idx - 1])}
        disabled={idx === 0}
        className="h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto flex-1 py-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {months.map(m => (
          <button
            key={m}
            data-active={m === current}
            onClick={() => onChange(m)}
            className={cn(
              "h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 capitalize",
              m === current
                ? "bg-foreground text-background shadow-sm"
                : m === today
                  ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {fmtShortMonth(m)}
          </button>
        ))}
      </div>

      <button
        onClick={() => idx < months.length - 1 && onChange(months[idx + 1])}
        disabled={idx === months.length - 1}
        className="h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {current !== today && (
        <button
          onClick={() => onChange(today)}
          className="h-7 px-2 rounded-lg text-[11px] font-semibold text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
        >
          Hoje
        </button>
      )}
    </div>
  )
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────
function CollabCard({ f, onOpen, onPay }: {
  f: CollabFinance; onOpen: () => void; onPay: () => void
}) {
  const m = f.selectedMonth
  const borderColor = f.overdueAmount > 0 ? "border-l-red-500"
    : f.totalPendingAll > 0 ? "border-l-amber-400" : "border-l-emerald-400"

  return (
    <div
      className={cn("bg-card rounded-2xl border border-border border-l-4 overflow-hidden active:scale-[0.99] transition-transform cursor-pointer", borderColor)}
      onClick={onOpen}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0",
              f.overdueAmount > 0 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-primary/10 text-primary"
            )}>
              {initials(f.name)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate leading-tight">{f.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{f.email}</p>
            </div>
          </div>
          <StatusPill status={f.status} />
        </div>

        {/* Stats — 2x2 grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Horas", value: m.hours > 0 ? `${m.hours.toFixed(1)}h` : "—", color: "" },
            { label: "Custo mês", value: m.cost > 0 ? fmt(m.cost) : "—", color: "text-blue-600 dark:text-blue-400" },
            { label: "Pago mês", value: m.paid > 0 ? fmt(m.paid) : "—", color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Pendente mês", value: m.pending > 0 ? fmt(m.pending) : "—", color: "text-amber-600 dark:text-amber-400" },
          ].map(s => (
            <div key={s.label} className="bg-muted/40 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
              <p className={cn("text-sm font-bold tabular-nums mt-0.5", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {m.cost > 0 && <MiniBar paid={m.paid} cost={m.cost} />}

        {f.overdueAmount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="text-xs text-red-700 dark:text-red-400">
              <strong>{fmt(f.overdueAmount)}</strong> em atraso
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1" onClick={e => e.stopPropagation()}>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total a receber</p>
            <p className={cn(
              "text-lg font-bold tabular-nums",
              f.totalPendingAll > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {fmt(f.totalPendingAll)}
            </p>
          </div>
          <Button
            size="sm"
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl"
            onClick={onPay}
            disabled={f.totalPendingAll === 0}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Pagar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Desktop Table Row ────────────────────────────────────────────────────────
function CollabRow({ f, isActive, onSelect, onPay, onNav }: {
  f: CollabFinance; isActive: boolean
  onSelect: () => void; onPay: () => void; onNav: () => void
}) {
  const m = f.selectedMonth
  return (
    <tr
      onClick={onSelect}
      className={cn(
        "group cursor-pointer border-b border-border/50 transition-colors last:border-0",
        isActive ? "bg-primary/5" : "hover:bg-muted/30"
      )}
    >
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0",
            f.overdueAmount > 0 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-primary/10 text-primary"
          )}>
            {initials(f.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{f.name}</p>
            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{f.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-sm tabular-nums font-medium text-right">
        {m.hours > 0 ? `${m.hours.toFixed(1)}h` : <span className="text-muted-foreground/30">—</span>}
      </td>
      <td className="py-3 px-3 text-sm tabular-nums font-semibold text-right text-blue-600 dark:text-blue-400">
        {m.cost > 0 ? fmt(m.cost) : <span className="text-muted-foreground/30 font-normal">—</span>}
      </td>
      <td className="py-3 px-3 text-sm tabular-nums font-semibold text-right text-emerald-600 dark:text-emerald-400">
        {m.paid > 0 ? fmt(m.paid) : <span className="text-muted-foreground/30 font-normal">—</span>}
      </td>
      <td className="py-3 px-3 text-right">
        {f.overdueAmount > 0
          ? <span className="text-sm tabular-nums font-bold text-red-600">{fmt(f.overdueAmount)}</span>
          : <span className="text-muted-foreground/30">—</span>}
      </td>
      <td className="py-3 px-3 text-right">
        <span className={cn("text-sm tabular-nums font-bold",
          f.totalPendingAll > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
        )}>
          {fmt(f.totalPendingAll)}
        </span>
      </td>
      <td className="py-3 px-3 w-[110px]"><MiniBar paid={m.paid} cost={m.cost} /></td>
      <td className="py-3 px-3"><StatusPill status={f.status} /></td>
      <td className="py-3 pl-3 pr-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={onNav}
            className="h-7 w-7 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onPay}
            disabled={f.totalPendingAll === 0}
            className="h-7 w-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Detail Panel / Bottom Sheet ──────────────────────────────────────────────
function DetailPanel({ collab, selectedMonthKey, onClose, onPay, onDeletePayment, isMobile }: {
  collab: CollabFinance; selectedMonthKey: string
  onClose: () => void; onPay: () => void
  onDeletePayment: (p: Payment) => void; isMobile: boolean
}) {
  const [tab, setTab] = useState<"history" | "payments">("history")
  const router = useRouter()

  const allPayments = useMemo(() =>
    collab.allMonths.flatMap(m => m.payments)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [collab]
  )

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 bg-card">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
            {initials(collab.name)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{collab.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{collab.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={collab.status} />
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Em dívida", value: fmt(collab.totalPendingAll), color: collab.totalPendingAll > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600" },
            { label: "Em atraso", value: fmt(collab.overdueAmount), color: collab.overdueAmount > 0 ? "text-red-600" : "text-muted-foreground" },
            { label: "Taxa/hora", value: `${collab.currentRate}€`, color: "" },
          ].map(s => (
            <div key={s.label}>
              <p className={cn("text-sm font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0 bg-card">
        {(["history", "payments"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors",
              tab === t ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"
            )}
          >
            {t === "history" ? "Histórico" : `Pagamentos (${allPayments.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "history" ? (
          <div className="p-3 space-y-2">
            {collab.allMonths.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem atividade registada.</div>
            )}
            {[...collab.allMonths].reverse().map(m => (
              <div key={m.periodo} className={cn(
                "rounded-xl border p-3 space-y-2",
                m.periodo === selectedMonthKey ? "border-primary/30 bg-primary/5" : "bg-card"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold capitalize">{fmtMonth(m.periodo)}</span>
                    {m.periodo === selectedMonthKey && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">ATUAL</span>
                    )}
                  </div>
                  <span className={cn("text-sm font-bold tabular-nums shrink-0", m.pending > 0 ? "text-amber-600" : "text-emerald-600")}>
                    {fmt(m.pending)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                  <span>{m.hours.toFixed(1)}h</span>
                  <span className="text-center">{fmt(m.cost)}</span>
                  <span className="text-right text-emerald-600 font-medium">{fmt(m.paid)} pago</span>
                </div>
                <MiniBar paid={m.paid} cost={m.cost} />
                {m.payments.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {m.payments.map(p => (
                      <span key={p.id} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {fmt(p.valor)} · {new Date(p.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {allPayments.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem pagamentos registados.</div>
            ) : allPayments.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-card rounded-xl border group hover:bg-muted/30 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold tabular-nums">{fmt(p.valor)}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(p.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <MethodTag metodo={p.metodo} />
                    {p.source === "admin" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">Admin</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDeletePayment(p)}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-card shrink-0 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs"
          onClick={() => router.push(`/admin/collaborator/${collab.collaboratorId}`)}>
          <Eye className="h-3.5 w-3.5 mr-1.5" /> Perfil
        </Button>
        <Button size="sm" className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={onPay} disabled={collab.totalPendingAll === 0}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Registar pagamento
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: "85dvh" }}
        >
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">{panelContent}</div>
        </div>
      </>
    )
  }

  return (
    <div className="w-[340px] xl:w-[380px] shrink-0 border-l bg-card flex flex-col overflow-hidden">
      {panelContent}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminFinanceView() {
  const { collaborators, loading, error, refetch } = useCollaborators()
  const router = useRouter()

  const NOW = getTodayKey()
  const [selectedMonth, setSelectedMonth] = useState(NOW)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [sortBy, setSortBy] = useState<"name" | "pending" | "overdue" | "hours">("overdue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedCollab, setSelectedCollab] = useState<CollabFinance | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Payment
  const [paymentTarget, setPaymentTarget] = useState<CollabFinance | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState("transferencia")
  const [savingPayment, setSavingPayment] = useState(false)

  // Delete
  const [showDeleteWarn, setShowDeleteWarn] = useState(false)
  const [dontShowDelete, setDontShowDelete] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ payment: Payment; collab: CollabFinance } | null>(null)

  // ── Finance data ────────────────────────────────────────────────────────────
  const { financeData, availableMonths } = useMemo(() => {
    const monthSet = new Set<string>([NOW])

    const data: CollabFinance[] = collaborators.map(collab => {
      const rate = collab.currentRate || 0
      const entries = collab.entries || []
      const payments: Payment[] = [...(collab.payments || [])].sort(
        (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
      )

      const monthMap = new Map<string, MonthSummary>()
      const monthPmtsMap = new Map<string, Payment[]>()

      entries.forEach((e: any) => {
        const p = (e.date || "").slice(0, 7)
        if (!p) return
        monthSet.add(p)
        if (!monthMap.has(p)) monthMap.set(p, { periodo: p, hours: 0, cost: 0, paid: 0, pending: 0, payments: [] })
        const m = monthMap.get(p)!
        m.hours += e.totalHoras || 0
        m.cost += resolveEntryTaxa(e, rate) * (e.totalHoras || 0)
      })

      payments.forEach(p => {
        const pr = p.date?.slice(0, 7)
        if (!pr) return
        if (!monthPmtsMap.has(pr)) monthPmtsMap.set(pr, [])
        monthPmtsMap.get(pr)!.push(p)
      })

      const allMonths = Array.from(monthMap.values()).sort((a, b) => a.periodo.localeCompare(b.periodo))

      let pi = 0, rem = 0
      for (const m of allMonths) {
        let left = m.cost
        while (left > 0 && (pi < payments.length || rem > 0)) {
          if (rem <= 0 && pi < payments.length) rem = payments[pi].valor || 0
          if (rem > 0) {
            const apply = Math.min(left, rem)
            m.paid += apply; left -= apply; rem -= apply
            if (rem <= 0) { pi++; rem = 0 }
          } else break
        }
        m.pending = Math.max(0, m.cost - m.paid)
        m.payments = monthPmtsMap.get(m.periodo) || []
      }

      const empty: MonthSummary = { periodo: selectedMonth, hours: 0, cost: 0, paid: 0, pending: 0, payments: [] }
      const selMonth = allMonths.find(m => m.periodo === selectedMonth) ?? empty
      const overdue = allMonths.filter(m => m.periodo < NOW).reduce((s, m) => s + m.pending, 0)
      const totalPending = allMonths.reduce((s, m) => s + m.pending, 0)

      let status = "sem_atividade"
      if (totalPending > 0) status = overdue > 0 ? "atrasado" : "pendente"
      else if (allMonths.some(m => m.cost > 0)) status = "pago"

      return {
        collaboratorId: collab.id,
        name: collab.name,
        email: collab.email,
        currentRate: rate,
        allMonths,
        selectedMonth: selMonth,
        totalPendingAll: totalPending,
        overdueAmount: overdue,
        status,
        recentPayments: [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3),
      }
    })

    return { financeData: data, availableMonths: Array.from(monthSet).sort() }
  }, [collaborators, selectedMonth, NOW])

  // KPIs
  const kpis = useMemo(() => ({
    cost:        financeData.reduce((s, f) => s + f.selectedMonth.cost, 0),
    paid:        financeData.reduce((s, f) => s + f.selectedMonth.paid, 0),
    globalPend:  financeData.reduce((s, f) => s + f.totalPendingAll, 0),
    overdue:     financeData.reduce((s, f) => s + f.overdueAmount, 0),
    withOverdue: financeData.filter(f => f.overdueAmount > 0).length,
    active:      financeData.filter(f => f.selectedMonth.cost > 0).length,
  }), [financeData])

  // Filter + sort
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return financeData
      .filter(f =>
        (f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)) &&
        (statusFilter === "todos" || f.status === statusFilter)
      )
      .sort((a, b) => {
        const diff =
          sortBy === "name" ? a.name.localeCompare(b.name) :
          sortBy === "pending" ? a.totalPendingAll - b.totalPendingAll :
          sortBy === "overdue" ? a.overdueAmount - b.overdueAmount :
          a.selectedMonth.hours - b.selectedMonth.hours
        return sortDir === "asc" ? diff : -diff
      })
  }, [financeData, searchQuery, statusFilter, sortBy, sortDir])

  // Recent payments
  const recentGlobal = useMemo(() =>
    financeData
      .flatMap(f => f.recentPayments.map(p => ({ ...p, collabName: f.name, collabId: f.collaboratorId })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6),
    [financeData]
  )

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("desc") }
  }
  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3 opacity-20" />

  const openPayment = (collab: CollabFinance) => {
    setPaymentTarget(collab)
    setPaymentAmount(collab.totalPendingAll)
    setPaymentDate(new Date().toISOString().split("T")[0])
    const saved = typeof window !== "undefined" && localStorage.getItem(`pm_${collab.collaboratorId}`)
    setPaymentMethod(saved || "transferencia")
    if (isMobile) setSelectedCollab(null)
  }

  const confirmPayment = async () => {
    if (!paymentTarget || paymentAmount <= 0) { alert("Valor inválido."); return }
    setSavingPayment(true)
    const np: Payment = { id: `admin_${Date.now()}`, date: paymentDate, valor: Number(paymentAmount), metodo: paymentMethod, source: "admin" }
    try {
      await updateDoc(doc(db, "users", paymentTarget.collaboratorId), { "workData.payments": arrayUnion(np) })
      localStorage.setItem(`pm_${paymentTarget.collaboratorId}`, paymentMethod)
      setPaymentTarget(null)
      refetch()
    } catch (e) { console.error(e); alert("Erro ao guardar.") }
    finally { setSavingPayment(false) }
  }

  const requestDelete = (payment: Payment, collab: CollabFinance) => {
    const dismissed = typeof window !== "undefined" && localStorage.getItem(DELETE_WARN_KEY) === "true"
    if (dismissed) doDelete(payment, collab)
    else { setPendingDelete({ payment, collab }); setDontShowDelete(false); setShowDeleteWarn(true) }
  }

  const doDelete = async (payment: Payment, collab: CollabFinance) => {
    try {
      const ref = doc(db, "users", collab.collaboratorId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const curr: Payment[] = snap.data()?.workData?.payments || []
      await updateDoc(ref, { "workData.payments": curr.filter(p => p.id !== payment.id) })
      setShowDeleteWarn(false); setPendingDelete(null)
      refetch()
    } catch (e) { console.error(e); alert("Erro ao eliminar.") }
  }

  useEffect(() => {
    if (selectedCollab) {
      const up = financeData.find(f => f.collaboratorId === selectedCollab.collaboratorId)
      if (up) setSelectedCollab(up)
    }
  }, [financeData])

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">A carregar…</p>
      </div>
    </div>
  )
  if (error) return <div className="p-4 text-red-600 text-sm">{error}</div>

  return (
    <div className="flex h-full overflow-hidden">

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Sticky header */}
        <div className="shrink-0 border-b bg-card/95 backdrop-blur-sm px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">Financeiro</h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Pagamentos em tempo real · Taxa histórica por entrada</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={refetch} className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Atualizar">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => alert("Em desenvolvimento")} className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Exportar">
                <FileDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <MonthNavigator current={selectedMonth} onChange={setSelectedMonth} months={availableMonths} />

          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold capitalize">{fmtMonth(selectedMonth)}</span>
            {selectedMonth === NOW && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-wide">MÊS ATUAL</span>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4 pb-24 md:pb-8 max-w-5xl mx-auto">

            {/* Overdue alert */}
            {kpis.withOverdue > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-300">
                  <strong>{kpis.withOverdue} colaborador{kpis.withOverdue > 1 ? "es" : ""}</strong> com pagamentos em atraso — <strong>{fmt(kpis.overdue)}</strong> a regularizar.
                </p>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { icon: <Euro className="h-4 w-4" />, label: "Custo do mês", value: fmt(kpis.cost), sub: `${kpis.active} ativos`, color: "text-blue-600 dark:text-blue-400", iconCls: "bg-blue-100 dark:bg-blue-900/40 text-blue-600", cardCls: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10" },
                { icon: <CheckCircle2 className="h-4 w-4" />, label: "Pago (mês)", value: fmt(kpis.paid), sub: kpis.cost > 0 ? `${Math.round((kpis.paid / kpis.cost) * 100)}% do custo` : "—", color: "text-emerald-600 dark:text-emerald-400", iconCls: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600", cardCls: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10" },
                { icon: <Clock className="h-4 w-4" />, label: "Total pendente", value: fmt(kpis.globalPend), sub: "Todos os meses", color: "text-amber-600 dark:text-amber-400", iconCls: "bg-amber-100 dark:bg-amber-900/40 text-amber-600", cardCls: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10" },
                { icon: <AlertTriangle className="h-4 w-4" />, label: "Em atraso", value: fmt(kpis.overdue), sub: `${kpis.withOverdue} colaborador${kpis.withOverdue !== 1 ? "es" : ""}`, color: "text-red-600 dark:text-red-400", iconCls: "bg-red-100 dark:bg-red-900/40 text-red-600", cardCls: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10" },
              ].map(k => (
                <div key={k.label} className={cn("rounded-xl border p-3.5", k.cardCls)}>
                  <div className={cn("inline-flex p-1.5 rounded-lg mb-2.5", k.iconCls)}>{k.icon}</div>
                  <p className={cn("text-xl font-bold tabular-nums leading-tight", k.color)}>{k.value}</p>
                  <p className="text-[11px] font-semibold opacity-80 mt-0.5">{k.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Search + Filters */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={cn(
                    "h-9 px-3 rounded-lg border flex items-center gap-1.5 text-sm font-medium transition-colors shrink-0",
                    showFilters || statusFilter !== "todos"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Filtros</span>
                  {statusFilter !== "todos" && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-col gap-3 p-3 bg-muted/40 rounded-xl border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide shrink-0">Estado:</span>
                    <div className="flex flex-wrap gap-1">
                      {["todos", "atrasado", "pendente", "pago", "sem_atividade"].map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={cn(
                            "text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors",
                            statusFilter === s
                              ? "bg-foreground text-background border-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                          )}
                        >
                          {s === "todos" ? "Todos" : s === "sem_atividade" ? "Inativo" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide shrink-0">Ordenar:</span>
                    <div className="flex flex-wrap gap-1">
                      {([["overdue", "Atraso"], ["pending", "Pendente"], ["hours", "Horas"], ["name", "Nome"]] as const).map(([col, label]) => (
                        <button
                          key={col}
                          onClick={() => toggleSort(col)}
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors",
                            sortBy === col
                              ? "bg-foreground text-background border-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                          )}
                        >
                          {label} <SortIcon col={col} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{filtered.length} de {financeData.length} colaboradores</p>
                </div>
              )}
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhum colaborador encontrado.</p>
                </div>
              ) : filtered.map(f => (
                <CollabCard
                  key={f.collaboratorId}
                  f={f}
                  onOpen={() => setSelectedCollab(f)}
                  onPay={() => openPayment(f)}
                />
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      {[
                        { label: "Colaborador", col: "name" as const, align: "left", pl: "pl-4 pr-3" },
                        { label: "Horas", col: "hours" as const, align: "right", pl: "px-3" },
                      ].map(h => (
                        <th key={h.col} className={cn("py-2.5", h.pl, h.align === "right" ? "text-right" : "text-left")}>
                          <button onClick={() => toggleSort(h.col)} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                            {h.label} <SortIcon col={h.col} />
                          </button>
                        </th>
                      ))}
                      {["Custo", "Pago"].map(h => (
                        <th key={h} className="py-2.5 px-3 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                      ))}
                      <th className="py-2.5 px-3 text-right">
                        <button onClick={() => toggleSort("overdue")} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                          Em Atraso <SortIcon col="overdue" />
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        <button onClick={() => toggleSort("pending")} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                          Total a Receber <SortIcon col="pending" />
                        </button>
                      </th>
                      {["Prog.", "Estado", "Ações"].map(h => (
                        <th key={h} className={cn("py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground", h === "Ações" ? "pl-3 pr-4 text-right" : "px-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-muted-foreground text-sm">
                          <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
                          Nenhum colaborador encontrado.
                        </td>
                      </tr>
                    ) : filtered.map(f => (
                      <CollabRow
                        key={f.collaboratorId}
                        f={f}
                        isActive={selectedCollab?.collaboratorId === f.collaboratorId}
                        onSelect={() => setSelectedCollab(prev => prev?.collaboratorId === f.collaboratorId ? null : f)}
                        onPay={() => openPayment(f)}
                        onNav={() => router.push(`/admin/collaborator/${f.collaboratorId}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent payments */}
            {recentGlobal.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                  <ReceiptText className="h-3.5 w-3.5 text-muted-foreground" />
                  <h2 className="text-xs font-bold uppercase tracking-wide">Pagamentos Recentes</h2>
                </div>
                <div className="divide-y">
                  {recentGlobal.map((p, i) => (
                    <div
                      key={`${p.id}-${i}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => {
                        const f = financeData.find(f => f.collaboratorId === p.collabId)
                        if (f) setSelectedCollab(f)
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold tabular-nums">{fmt(p.valor)}</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs font-semibold truncate">{p.collabName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(p.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <MethodTag metodo={p.metodo} />
                          {p.source === "admin" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">Admin</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Detail panel — desktop side / mobile bottom sheet */}
      {selectedCollab && (
        <DetailPanel
          collab={selectedCollab}
          selectedMonthKey={selectedMonth}
          onClose={() => setSelectedCollab(null)}
          onPay={() => openPayment(selectedCollab)}
          onDeletePayment={p => requestDelete(p, selectedCollab)}
          isMobile={isMobile}
        />
      )}

      {/* Payment dialog */}
      <Dialog open={!!paymentTarget} onOpenChange={open => !open && setPaymentTarget(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Registar Pagamento</DialogTitle>
            <p className="text-sm text-muted-foreground">{paymentTarget?.name}</p>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Valor</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">€</span>
                <Input
                  type="number" step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="pl-9 text-2xl font-bold h-14 rounded-xl"
                />
              </div>
              {paymentTarget && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setPaymentAmount(paymentTarget.selectedMonth.pending)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 border font-medium transition-colors"
                  >
                    Só mês ({fmt(paymentTarget.selectedMonth.pending)})
                  </button>
                  <button
                    onClick={() => setPaymentAmount(paymentTarget.totalPendingAll)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Total ({fmt(paymentTarget.totalPendingAll)})
                  </button>
                </div>
              )}
            </div>

            {(paymentTarget?.overdueAmount ?? 0) > 0 && (
              <div className="flex items-start gap-2 text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 rounded-xl text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span><strong>{fmt(paymentTarget!.overdueAmount)} em atraso</strong> de meses anteriores incluídos no total.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Data</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="h-10 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Método</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="mbway">MB WAY</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5 rounded-xl">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Ficará registado como <strong className="ml-0.5">Admin</strong> no histórico.
            </div>
          </div>
          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setPaymentTarget(null)} disabled={savingPayment}>Cancelar</Button>
            <Button className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmPayment} disabled={savingPayment || paymentAmount <= 0}>
              {savingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={showDeleteWarn} onOpenChange={setShowDeleteWarn}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-xs rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 mx-auto mb-2">
              <Trash2 className="h-4 w-4 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-base">Eliminar pagamento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2.5 text-center">
                {pendingDelete && (
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{fmt(pendingDelete.payment.valor)}</strong> de{" "}
                    <strong className="text-foreground">
                      {new Date(pendingDelete.payment.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                    </strong>
                  </p>
                )}
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-left">
                  <p className="text-red-700 dark:text-red-400 text-xs">Ação <strong>irreversível</strong> — afeta os cálculos de saldo.</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div onClick={() => setDontShowDelete(v => !v)} className="flex items-center gap-2 cursor-pointer group select-none px-1">
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
              dontShowDelete ? "bg-primary border-primary" : "border-muted-foreground/40 group-hover:border-primary/60"
            )}>
              {dontShowDelete && (
                <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Não mostrar novamente</span>
          </div>
          <AlertDialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <AlertDialogCancel className="flex-1 sm:flex-none" onClick={() => { setShowDeleteWarn(false); setPendingDelete(null) }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (dontShowDelete) localStorage.setItem(DELETE_WARN_KEY, "true")
                if (pendingDelete) doDelete(pendingDelete.payment, pendingDelete.collab)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}