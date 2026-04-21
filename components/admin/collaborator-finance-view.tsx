// components/admin/collaborator-finance-view.tsx
"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  CheckCircle2, Clock, AlertCircle, Plus, Trash2,
  AlertTriangle, ChevronLeft, ChevronRight, Loader2,
  CreditCard, Banknote, ArrowUpRight, TrendingUp,
  TrendingDown, Wallet, ReceiptText, Calendar, Phone,
} from "lucide-react"
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

interface CollaboratorMbway {
  mbwayAtivo: boolean
  mbwayTelemovel: string
  mbwayTitular: string
  iban: string
}

interface MonthSummary {
  periodo: string
  hours: number
  cost: number
  paid: number
  pending: number
  payments: Payment[]
}

interface CollaboratorFinanceViewProps {
  collaboratorId: string
  collaboratorName: string
  currentRate: number
  entries: any[]
  payments: Payment[]
  onRefetch: () => void
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function MiniBar({ paid, cost }: { paid: number; cost: number }) {
  const pct = cost > 0 ? Math.min((paid / cost) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : "bg-muted-foreground/20"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-7 text-right">{Math.round(pct)}%</span>
    </div>
  )
}

function MethodTag({ metodo }: { metodo: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    transferencia: { label: "Transf.",  icon: <ArrowUpRight className="h-3 w-3" />, cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50" },
    mbway:         { label: "MBWay",    icon: <CreditCard className="h-3 w-3" />,   cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/50" },
    dinheiro:      { label: "Dinheiro", icon: <Banknote className="h-3 w-3" />,     cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50" },
    MBWay:         { label: "MBWay",    icon: <CreditCard className="h-3 w-3" />,   cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/50" },
    Dinheiro:      { label: "Dinheiro", icon: <Banknote className="h-3 w-3" />,     cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50" },
    Transferência: { label: "Transf.",  icon: <ArrowUpRight className="h-3 w-3" />, cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50" },
  }
  const t = map[metodo] ?? { label: metodo, icon: <Wallet className="h-3 w-3" />, cls: "bg-muted text-muted-foreground border-border" }
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border font-semibold", t.cls)}>
      {t.icon}{t.label}
    </span>
  )
}

function MonthNav({ current, months, onChange }: {
  current: string; months: string[]; onChange: (m: string) => void
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
        className="h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 transition-colors disabled:opacity-25 hover:bg-muted"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto flex-1"
        style={{ scrollbarWidth: "none" }}
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
        className="h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 transition-colors disabled:opacity-25 hover:bg-muted"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {current !== today && months.includes(today) && (
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

// ─── MBWay Info Banner ────────────────────────────────────────────────────────
function MbwayBanner({ telemovel, titular }: { telemovel: string; titular: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/50">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
        <Phone className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-0.5">MBWay</p>
        <p className="text-sm font-bold text-violet-800 dark:text-violet-200 tabular-nums tracking-wide">{telemovel}</p>
        {titular && (
          <p className="text-[11px] text-violet-600 dark:text-violet-400 truncate">{titular}</p>
        )}
      </div>
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-700 shrink-0">
        ATIVO
      </span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function CollaboratorFinanceView({
  collaboratorId,
  collaboratorName,
  currentRate,
  entries,
  payments: rawPayments,
  onRefetch,
}: CollaboratorFinanceViewProps) {
  const NOW = getTodayKey()
  const [selectedMonth, setSelectedMonth] = useState(NOW)
  const [activeSection, setActiveSection] = useState<"history" | "payments">("history")

  // MBWay data from Firestore
  const [mbwayData, setMbwayData] = useState<CollaboratorMbway | null>(null)
  const [mbwayLoading, setMbwayLoading] = useState(true)

  // Payment dialog
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [showPayConfirm, setShowPayConfirm] = useState(false)
  const [payAmount, setPayAmount] = useState(0)
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])
  const [payMethod, setPayMethod] = useState("transferencia")
  const [savingPay, setSavingPay] = useState(false)

  // Delete
  const [showDeleteWarn, setShowDeleteWarn] = useState(false)
  const [dontShowDelete, setDontShowDelete] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Payment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load MBWay data once
  useEffect(() => {
    getDoc(doc(db, "users", collaboratorId))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data()
          setMbwayData({
            mbwayAtivo: d.mbwayAtivo ?? false,
            mbwayTelemovel: d.mbwayTelemovel || "",
            mbwayTitular: d.mbwayTitular || "",
            iban: d.iban || "",
          })
        }
      })
      .catch(console.error)
      .finally(() => setMbwayLoading(false))
  }, [collaboratorId])

  // ── Finance computation ──────────────────────────────────────────────────────
  const { allMonths, availableMonths, globalStats } = useMemo(() => {
    const rate = currentRate || 0
    const payments = [...rawPayments].sort(
      (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
    )

    const monthMap = new Map<string, MonthSummary>()
    const monthPmtsMap = new Map<string, Payment[]>()

    entries.forEach((e: any) => {
      const p = (e.date || "").slice(0, 7)
      if (!p) return
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

    const sorted = Array.from(monthMap.values()).sort((a, b) => a.periodo.localeCompare(b.periodo))

    // FIFO payment allocation
    let pi = 0, rem = 0
    for (const m of sorted) {
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

    const totalPending = sorted.reduce((s, m) => s + m.pending, 0)
    const totalPaid = sorted.reduce((s, m) => s + m.paid, 0)
    const totalCost = sorted.reduce((s, m) => s + m.cost, 0)
    const overdue = sorted.filter(m => m.periodo < NOW).reduce((s, m) => s + m.pending, 0)
    const totalHours = sorted.reduce((s, m) => s + m.hours, 0)

    const monthsSet = new Set([NOW, ...sorted.map(m => m.periodo)])
    const available = Array.from(monthsSet).sort()

    return {
      allMonths: sorted,
      availableMonths: available,
      globalStats: { totalPending, totalPaid, totalCost, overdue, totalHours },
    }
  }, [entries, rawPayments, currentRate, NOW])

  const selectedMonthData = useMemo(() => {
    return allMonths.find(m => m.periodo === selectedMonth) ?? {
      periodo: selectedMonth, hours: 0, cost: 0, paid: 0, pending: 0, payments: [],
    }
  }, [allMonths, selectedMonth])

  const allPaymentsSorted = useMemo(() =>
    [...rawPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [rawPayments]
  )

  // ── Actions ──────────────────────────────────────────────────────────────────
  const openPayDialog = () => {
    setPayAmount(globalStats.totalPending)
    setPayDate(new Date().toISOString().split("T")[0])

    // Priority: MBWay (if active) → last used → first available
    if (hasMbway) {
      setPayMethod("mbway")
    } else {
      const saved = typeof window !== "undefined" && localStorage.getItem(`pm_${collaboratorId}`)
      const savedAvailable = saved && availableMethods.find(m => m.value === saved)
      setPayMethod(savedAvailable ? saved : availableMethods[0].value)
    }

    setShowPayDialog(true)
  }

  const confirmPayment = async () => {
    if (payAmount <= 0) { alert("Valor inválido."); return }
    setSavingPay(true)
    const np: Payment = {
      id: `admin_${Date.now()}`,
      date: payDate,
      valor: Number(payAmount),
      metodo: payMethod,
      source: "admin",
    }
    try {
      await updateDoc(doc(db, "users", collaboratorId), { "workData.payments": arrayUnion(np) })
      // Only persist choice to localStorage if not MBWay-auto (user made a manual choice)
      if (!(mbwayData?.mbwayAtivo && mbwayData.mbwayTelemovel)) {
        localStorage.setItem(`pm_${collaboratorId}`, payMethod)
      }
      setShowPayDialog(false)
      onRefetch()
    } catch (e) {
      console.error(e)
      alert("Erro ao guardar pagamento.")
    } finally {
      setSavingPay(false)
    }
  }

  const requestDelete = (payment: Payment) => {
    const dismissed = typeof window !== "undefined" && localStorage.getItem(DELETE_WARN_KEY) === "true"
    if (dismissed) doDelete(payment)
    else { setPendingDelete(payment); setDontShowDelete(false); setShowDeleteWarn(true) }
  }

  const doDelete = async (payment: Payment) => {
    setDeletingId(payment.id)
    try {
      const ref = doc(db, "users", collaboratorId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const curr: Payment[] = snap.data()?.workData?.payments || []
      await updateDoc(ref, { "workData.payments": curr.filter(p => p.id !== payment.id) })
      setShowDeleteWarn(false)
      setPendingDelete(null)
      onRefetch()
    } catch (e) {
      console.error(e)
      alert("Erro ao eliminar.")
    } finally {
      setDeletingId(null)
    }
  }

  const isDevendo = globalStats.totalPending > 0
  const isQuitado = globalStats.totalPending === 0 && globalStats.totalCost > 0
  const hasOverdue = globalStats.overdue > 0
  const hasMbway = mbwayData?.mbwayAtivo && !!mbwayData.mbwayTelemovel
  const hasTransferencia = !!mbwayData?.iban

  // Only show methods that are configured
  const availableMethods = useMemo(() => {
    const methods: { value: string; label: string }[] = []
    if (hasMbway) methods.push({ value: "mbway", label: `MB WAY · ${mbwayData!.mbwayTelemovel}` })
    if (hasTransferencia) methods.push({ value: "transferencia", label: "Transferência Bancária" })
    methods.push({ value: "dinheiro", label: "Dinheiro" })
    return methods
  }, [hasMbway, hasTransferencia, mbwayData])

  return (
    <div className="space-y-5 pb-8">

      {/* ── MBWay Banner (sempre visível se ativo) ── */}
      {!mbwayLoading && hasMbway && (
        <MbwayBanner
          telemovel={mbwayData!.mbwayTelemovel}
          titular={mbwayData!.mbwayTitular}
        />
      )}

      {/* ── Global Status Hero ── */}
      <div className={cn(
        "rounded-2xl overflow-hidden border-2 transition-colors",
        hasOverdue  ? "border-red-300 dark:border-red-700"
        : isDevendo ? "border-amber-300 dark:border-amber-700"
        : isQuitado ? "border-emerald-300 dark:border-emerald-700"
        :             "border-border"
      )}>
        <div className={cn(
          "px-5 py-5",
          hasOverdue  ? "bg-red-50 dark:bg-red-950/20"
          : isDevendo ? "bg-amber-50 dark:bg-amber-950/20"
          : isQuitado ? "bg-emerald-50 dark:bg-emerald-950/20"
          :             "bg-muted/30"
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest mb-1.5",
                hasOverdue  ? "text-red-600 dark:text-red-400"
                : isDevendo ? "text-amber-600 dark:text-amber-400"
                : isQuitado ? "text-emerald-600 dark:text-emerald-400"
                :             "text-muted-foreground"
              )}>
                {hasOverdue ? "Pagamentos em atraso" : isDevendo ? "Pendente de recebimento" : isQuitado ? "Conta liquidada" : "Sem atividade"}
              </p>
              <p className={cn(
                "text-4xl font-black tracking-tight tabular-nums",
                hasOverdue  ? "text-red-700 dark:text-red-300"
                : isDevendo ? "text-amber-700 dark:text-amber-300"
                : isQuitado ? "text-emerald-700 dark:text-emerald-300"
                :             "text-muted-foreground"
              )}>
                {fmt(globalStats.totalPending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">Total pendente em todos os meses</p>
            </div>

            <Button
              onClick={openPayDialog}
              disabled={globalStats.totalPending === 0}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 rounded-xl shrink-0 shadow-md shadow-emerald-600/20 disabled:opacity-40"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Pagar
            </Button>
          </div>

          {hasOverdue && (
            <div className="mt-4 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 font-semibold bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {fmt(globalStats.overdue)} em atraso de meses anteriores
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x bg-card">
          {[
            { label: "Total devido",   value: fmt(globalStats.totalCost),    icon: <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" /> },
            { label: "Total pago",     value: fmt(globalStats.totalPaid),    icon: <TrendingDown className="h-3.5 w-3.5 text-emerald-500" /> },
            { label: "Horas totais",   value: `${globalStats.totalHours.toFixed(1)}h`, icon: <Clock className="h-3.5 w-3.5 text-muted-foreground" /> },
          ].map(s => (
            <div key={s.label} className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-[10px] text-muted-foreground">{s.label}</span></div>
              <p className="text-sm font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Month Selector ── */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Período</span>
        </div>
        <div className="px-4 py-3">
          <MonthNav current={selectedMonth} months={availableMonths} onChange={setSelectedMonth} />
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold capitalize">{fmtMonth(selectedMonth)}</p>
            {selectedMonth === NOW && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-wide">MÊS ATUAL</span>
            )}
          </div>

          {selectedMonthData.cost > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Horas",    value: `${selectedMonthData.hours.toFixed(1)}h`,  color: "" },
                  { label: "Custo",    value: fmt(selectedMonthData.cost),               color: "text-blue-600 dark:text-blue-400" },
                  { label: "Pago",     value: fmt(selectedMonthData.paid),               color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Pendente", value: fmt(selectedMonthData.pending),            color: selectedMonthData.pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400" },
                ].map(s => (
                  <div key={s.label} className="bg-muted/40 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{s.label}</p>
                    <p className={cn("text-sm font-bold tabular-nums mt-0.5", s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>
              <MiniBar paid={selectedMonthData.paid} cost={selectedMonthData.cost} />
            </>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground/60">
              Sem atividade neste mês.
            </div>
          )}

          {selectedMonthData.payments.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Pagamentos registados</p>
              {selectedMonthData.payments.map(p => (
                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-800/30 group">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{fmt(p.valor)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(p.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                  </span>
                  <MethodTag metodo={p.metodo} />
                  {p.source === "admin" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">Admin</span>
                  )}
                  <div className="ml-auto">
                    <button
                      onClick={() => requestDelete(p)}
                      disabled={deletingId === p.id}
                      className="h-6 w-6 rounded-lg text-muted-foreground/30 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                    >
                      {deletingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section Toggle ── */}
      <div className="flex rounded-xl border bg-muted/30 p-1 gap-1">
        {(["history", "payments"] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
              activeSection === s
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "history"
              ? `Histórico (${allMonths.length} meses)`
              : `Todos os pagamentos (${rawPayments.length})`}
          </button>
        ))}
      </div>

      {/* ── History ── */}
      {activeSection === "history" && (
        <div className="space-y-2.5">
          {allMonths.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground/60 rounded-2xl border border-dashed">
              <ReceiptText className="h-8 w-8 mx-auto mb-3 opacity-20" />
              Sem atividade registada.
            </div>
          ) : (
            [...allMonths].reverse().map(m => (
              <div
                key={m.periodo}
                onClick={() => setSelectedMonth(m.periodo)}
                className={cn(
                  "rounded-2xl border p-4 space-y-3 cursor-pointer transition-all hover:shadow-sm",
                  m.periodo === selectedMonth
                    ? "border-primary/30 bg-primary/[0.03] shadow-sm"
                    : "bg-card hover:bg-muted/20"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold capitalize">{fmtMonth(m.periodo)}</span>
                    {m.periodo === NOW && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">ATUAL</span>
                    )}
                    {m.periodo < NOW && m.pending > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">ATRASO</span>
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-black tabular-nums shrink-0",
                    m.pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {m.pending > 0 ? fmt(m.pending) : "✓ Quitado"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 opacity-50" />{m.hours.toFixed(1)}h</span>
                  <span className="text-center font-medium">{fmt(m.cost)}</span>
                  <span className="text-right text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(m.paid)} pago</span>
                </div>

                <MiniBar paid={m.paid} cost={m.cost} />

                {m.payments.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {m.payments.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 rounded-lg px-2 py-0.5 font-medium">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {fmt(p.valor)} · {new Date(p.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── All Payments ── */}
      {activeSection === "payments" && (
        <div className="space-y-2">
          {allPaymentsSorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground/60 rounded-2xl border border-dashed">
              <Wallet className="h-8 w-8 mx-auto mb-3 opacity-20" />
              Sem pagamentos registados.
            </div>
          ) : (
            allPaymentsSorted.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3.5 bg-card rounded-2xl border group hover:bg-muted/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
                  onClick={() => requestDelete(p)}
                  disabled={deletingId === p.id}
                  className="h-8 w-8 rounded-xl text-muted-foreground/30 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shrink-0"
                >
                  {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Register Payment Dialog ── */}
      <Dialog open={showPayDialog} onOpenChange={o => !o && setShowPayDialog(false)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Registar Pagamento</DialogTitle>
            <p className="text-sm text-muted-foreground">{collaboratorName}</p>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* MBWay info card — shown when method is mbway and collaborator has it active */}
            {payMethod === "mbway" && hasMbway && (
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border-2 border-violet-300 dark:border-violet-700">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/30">
                  <Phone className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">Enviar para</p>
                  <p className="text-base font-black text-violet-800 dark:text-violet-200 tabular-nums tracking-wide leading-tight">
                    {mbwayData!.mbwayTelemovel}
                  </p>
                  {mbwayData!.mbwayTitular && (
                    <p className="text-xs text-violet-600 dark:text-violet-400 truncate">{mbwayData!.mbwayTitular}</p>
                  )}
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Valor</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg pointer-events-none">€</span>
                <Input
                  type="number" step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="pl-9 text-2xl font-bold h-14 rounded-xl"
                />
              </div>
              {/* Quick fill buttons */}
              <div className="flex gap-2 flex-wrap">
                {selectedMonthData.pending > 0 && (
                  <button
                    onClick={() => setPayAmount(selectedMonthData.pending)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 border font-medium transition-colors"
                  >
                    Só {fmtShortMonth(selectedMonth)} ({fmt(selectedMonthData.pending)})
                  </button>
                )}
                {globalStats.totalPending > 0 && globalStats.totalPending !== selectedMonthData.pending && (
                  <button
                    onClick={() => setPayAmount(globalStats.totalPending)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Total ({fmt(globalStats.totalPending)})
                  </button>
                )}
              </div>
            </div>

            {/* Overdue alert */}
            {globalStats.overdue > 0 && (
              <div className="flex items-start gap-2 text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 rounded-xl text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span><strong>{fmt(globalStats.overdue)} em atraso</strong> de meses anteriores incluídos no total.</span>
              </div>
            )}

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Data</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="h-10 rounded-xl" />
            </div>

            {/* Method */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Método</Label>
              {availableMethods.length === 1 ? (
                // Single option — show as static pill, no select needed
                <div className={cn(
                  "h-10 rounded-xl border px-3 flex items-center gap-2 text-sm font-semibold",
                  availableMethods[0].value === "mbway"
                    ? "border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/10 text-violet-700 dark:text-violet-300"
                    : availableMethods[0].value === "transferencia"
                      ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10 text-blue-700 dark:text-blue-300"
                      : "bg-muted/40 text-foreground"
                )}>
                  {availableMethods[0].value === "mbway"     && <CreditCard className="h-3.5 w-3.5 shrink-0" />}
                  {availableMethods[0].value === "transferencia" && <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}
                  {availableMethods[0].value === "dinheiro"  && <Banknote className="h-3.5 w-3.5 shrink-0" />}
                  {availableMethods[0].label}
                </div>
              ) : (
                <Select value={payMethod} onValueChange={v => {
                  setPayMethod(v)
                  if (!hasMbway) localStorage.setItem(`pm_${collaboratorId}`, v)
                }}>
                  <SelectTrigger className={cn(
                    "h-10 rounded-xl transition-colors",
                    payMethod === "mbway" && "border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/10"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMethods.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Admin note */}
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5 rounded-xl">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Ficará registado como <strong className="ml-0.5">Admin</strong> no histórico do colaborador.
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShowPayDialog(false)} disabled={savingPay}>
              Cancelar
            </Button>
            <Button
              className={cn(
                "flex-1 sm:flex-none text-white",
                payMethod === "mbway"
                  ? "bg-violet-600 hover:bg-violet-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
              onClick={() => setShowPayConfirm(true)}
              disabled={savingPay || payAmount <= 0}
            >
              {savingPay ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Warning ── */}
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
                    <strong className="text-foreground">{fmt(pendingDelete.valor)}</strong>{" "}de{" "}
                    <strong className="text-foreground">
                      {new Date(pendingDelete.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                    </strong>
                  </p>
                )}
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-left">
                  <p className="text-red-700 dark:text-red-400 text-xs">
                    Ação <strong>irreversível</strong> — afeta os cálculos de saldo.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div
            onClick={() => setDontShowDelete(v => !v)}
            className="flex items-center gap-2 cursor-pointer group select-none px-1"
          >
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
            <AlertDialogCancel onClick={() => { setShowDeleteWarn(false); setPendingDelete(null) }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (dontShowDelete) localStorage.setItem(DELETE_WARN_KEY, "true")
                if (pendingDelete) doDelete(pendingDelete)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Payment Confirmation ── */}
      <AlertDialog open={showPayConfirm} onOpenChange={setShowPayConfirm}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-xs rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <AlertDialogTitle className="text-center text-base">Confirmar pagamento?</AlertDialogTitle>
            <p className="text-center text-xs text-muted-foreground -mt-1">{collaboratorName}</p>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-center">
                <p className="text-2xl font-black tabular-nums text-foreground">{fmt(payAmount)}</p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{new Date(payDate).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}</span>
                  <span>·</span>
                  <MethodTag metodo={payMethod} />
                </div>
                {payMethod === "mbway" && hasMbway && (
                  <div className="flex items-center justify-center gap-2 mt-1 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/50">
                    <Phone className="h-3 w-3 text-violet-500 shrink-0" />
                    <span className="text-xs font-bold text-violet-700 dark:text-violet-300 tabular-nums">{mbwayData!.mbwayTelemovel}</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <AlertDialogCancel onClick={() => setShowPayConfirm(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "text-white",
                payMethod === "mbway" ? "bg-violet-600 hover:bg-violet-700" : "bg-emerald-600 hover:bg-emerald-700"
              )}
              onClick={() => { setShowPayConfirm(false); confirmPayment() }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}