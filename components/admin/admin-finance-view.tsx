// components/admin/admin-finance-view.tsx
"use client"

import React, { useState, useMemo, useEffect } from "react"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Euro, CheckCircle2, Clock, AlertCircle, Plus, Eye,
  FileDown, DollarSign, LayoutGrid, Table as TableIcon,
  AlertTriangle, Trash2, Search, RefreshCw, TrendingUp,
  ChevronRight, ChevronDown, Loader2
} from "lucide-react"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"

// ─── types ────────────────────────────────────────────────────────────────────
interface MonthSummary {
  periodo: string
  hours: number
  cost: number
  paid: number
  pending: number
  payments: Array<{ id: string; date: string; valor: number; metodo: string; source?: "admin" }>
}

const VIEW_MODE_KEY = "financeViewMode"
const DELETE_WARN_KEY = "adminDeletePaymentWarnDismissed"
const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)

function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const s0Taxa = entry.services[0]?.taxaHoraria
    if (typeof s0Taxa === "number" && s0Taxa > 0) return s0Taxa
  }
  return currentRate
}

// ─── status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; dot: string; label: string }> = {
    pago:          { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500",  label: "Pago" },
    pendente:      { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",         dot: "bg-amber-500",   label: "Pendente" },
    atrasado:      { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",                 dot: "bg-red-500",     label: "Atrasado" },
    sem_atividade: { color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",            dot: "bg-slate-400",   label: "Inativo" },
  }
  const c = cfg[status] ?? cfg.sem_atividade
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", c.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  )
}

// ─── payment method label ─────────────────────────────────────────────────────
function MethodTag({ metodo }: { metodo: string }) {
  const labels: Record<string, string> = {
    transferencia: "Transf.", mbway: "MBway", dinheiro: "Dinheiro",
  }
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted border capitalize font-medium">
      {labels[metodo] ?? metodo}
    </span>
  )
}

// ─── progress bar ─────────────────────────────────────────────────────────────
function PaymentProgress({ paid, cost }: { paid: number; cost: number }) {
  const pct = cost > 0 ? Math.min((paid / cost) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{paid.toFixed(0)} € pago</span>
        <span>{cost.toFixed(0)} € total</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-muted-foreground/20"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────
export function AdminFinanceView() {
  const { collaborators, loading, error, refetch } = useCollaborators()
  const router = useRouter()

  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    if (typeof window === "undefined") return "cards"
    return (localStorage.getItem(VIEW_MODE_KEY) as "cards" | "table") || "cards"
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCollab, setSelectedCollab] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedMethod, setSelectedMethod] = useState("transferencia")
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [historyData, setHistoryData] = useState<MonthSummary[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())

  const [showDeleteWarn, setShowDeleteWarn] = useState(false)
  const [deleteWarnDontShow, setDeleteWarnDontShow] = useState(false)
  const [pendingDeletePayment, setPendingDeletePayment] = useState<any>(null)

  const currentMonthKey = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (!isMobile) localStorage.setItem(VIEW_MODE_KEY, viewMode)
  }, [viewMode, isMobile])

  const effectiveViewMode = isMobile ? "cards" : viewMode

  const financeData = useMemo(() => {
    return collaborators
      .map(collab => {
        const currentRate = collab.currentRate || 0
        const entries = collab.entries || []
        const payments = [...(collab.payments || [])].sort(
          (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
        )

        const monthMap = new Map<string, MonthSummary>()
        const monthPaymentsMap = new Map<string, any[]>()

        entries.forEach((entry: any) => {
          const periodo = (entry.date || "").slice(0, 7)
          if (!periodo) return
          if (!monthMap.has(periodo))
            monthMap.set(periodo, { periodo, hours: 0, cost: 0, paid: 0, pending: 0, payments: [] })
          const m = monthMap.get(periodo)!
          const horas = entry.totalHoras || 0
          const taxa = resolveEntryTaxa(entry, currentRate)
          m.hours += horas
          m.cost += taxa * horas
        })

        payments.forEach((p: any) => {
          const periodo = p.date?.slice(0, 7)
          if (!periodo) return
          if (!monthPaymentsMap.has(periodo)) monthPaymentsMap.set(periodo, [])
          monthPaymentsMap.get(periodo)!.push(p)
        })

        const allMonths = Array.from(monthMap.values()).sort((a, b) => a.periodo.localeCompare(b.periodo))

        let paymentIdx = 0, remainingPayment = 0
        for (const m of allMonths) {
          let remaining = m.cost
          while (remaining > 0 && (paymentIdx < payments.length || remainingPayment > 0)) {
            if (remainingPayment <= 0 && paymentIdx < payments.length)
              remainingPayment = payments[paymentIdx].valor || 0
            if (remainingPayment > 0) {
              const apply = Math.min(remaining, remainingPayment)
              m.paid += apply; remaining -= apply; remainingPayment -= apply
              if (remainingPayment <= 0) { paymentIdx++; remainingPayment = 0 }
            } else break
          }
          m.pending = Math.max(0, m.cost - m.paid)
          m.payments = monthPaymentsMap.get(m.periodo) || []
        }

        const currentMonthData = allMonths.find(m => m.periodo === currentMonthKey) ||
          { periodo: currentMonthKey, hours: 0, cost: 0, paid: 0, pending: 0, payments: [] }
        const pastMonths = allMonths.filter(m => m.periodo < currentMonthKey)
        const overdueAmount = pastMonths.reduce((s, m) => s + m.pending, 0)
        const totalPendingAll = allMonths.reduce((s, m) => s + m.pending, 0)

        let status = "sem_atividade"
        if (totalPendingAll > 0) status = overdueAmount > 0 ? "atrasado" : "pendente"
        else if (currentMonthData.cost > 0) status = "pago"

        return {
          collaboratorId: collab.id,
          name: collab.name,
          email: collab.email,
          currentRate,
          totalHoursThisMonth: currentMonthData.hours,
          thisMonthCost: currentMonthData.cost,
          thisMonthPaid: currentMonthData.paid,
          thisMonthPending: currentMonthData.pending,
          totalPendingAll,
          overdueAmount,
          allMonths,
          status,
        }
      })
      .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [collaborators, searchQuery, currentMonthKey])

  const totals = useMemo(() => ({
    totalCost:    financeData.reduce((s, f) => s + f.thisMonthCost, 0),
    totalPaid:    financeData.reduce((s, f) => s + f.thisMonthPaid, 0),
    totalPending: financeData.reduce((s, f) => s + f.totalPendingAll, 0),
    overdueTotal: financeData.reduce((s, f) => s + f.overdueAmount, 0),
    withOverdue:  financeData.filter(f => f.overdueAmount > 0).length,
  }), [financeData])

  const getDefaultMethod = (id: string) =>
    (typeof window !== "undefined" && localStorage.getItem(`defaultPaymentMethod_${id}`)) || "transferencia"
  const saveDefaultMethod = (id: string, method: string) =>
    localStorage.setItem(`defaultPaymentMethod_${id}`, method)

  const openHistory = (collab: any) => {
    setHistoryData(collab.allMonths)
    setSelectedCollab(collab)
    setExpandedHistory(new Set())
    setShowHistoryDialog(true)
  }

  const handleRegistarPagamento = (collab: any) => {
    setSelectedCollab(collab)
    setPaymentAmount(collab.totalPendingAll || 0)
    setPaymentDate(new Date().toISOString().split("T")[0])
    setSelectedMethod(getDefaultMethod(collab.collaboratorId))
    setShowPagamentoDialog(true)
  }

  const handleConfirmPagamento = async () => {
    if (!selectedCollab || paymentAmount <= 0) { alert("Insere um valor válido."); return }
    setSavingPayment(true)
    const newPayment = {
      id: `admin_${Date.now()}`,
      date: paymentDate,
      valor: Number(paymentAmount),
      metodo: selectedMethod,
      source: "admin",
    }
    try {
      await updateDoc(doc(db, "users", selectedCollab.collaboratorId), {
        "workData.payments": arrayUnion(newPayment),
      })
      saveDefaultMethod(selectedCollab.collaboratorId, selectedMethod)
      setShowPagamentoDialog(false)
      refetch()
    } catch (err) {
      console.error(err)
      alert("Erro ao guardar pagamento.")
    } finally {
      setSavingPayment(false)
    }
  }

  const requestDeletePayment = (payment: any) => {
    const dismissed = typeof window !== "undefined" && localStorage.getItem(DELETE_WARN_KEY) === "true"
    if (dismissed) commitDeletePayment(payment)
    else { setPendingDeletePayment(payment); setDeleteWarnDontShow(false); setShowDeleteWarn(true) }
  }

  const commitDeletePayment = async (payment: any) => {
    if (!selectedCollab) return
    try {
      const userRef = doc(db, "users", selectedCollab.collaboratorId)
      const snap = await getDoc(userRef)
      if (!snap.exists()) { alert("Colaborador não encontrado."); return }
      const currentPayments: any[] = snap.data()?.workData?.payments || []
      const updated = currentPayments.filter((p: any) => p.id !== payment.id)
      await updateDoc(userRef, { "workData.payments": updated })
      setShowDeleteWarn(false)
      setPendingDeletePayment(null)
      setHistoryData(prev => prev.map(m => ({ ...m, payments: m.payments.filter(p => p.id !== payment.id) })))
      refetch()
    } catch (err) {
      console.error(err)
      alert("Erro ao eliminar pagamento.")
    }
  }

  const toggleHistoryMonth = (periodo: string) => {
    setExpandedHistory(prev => {
      const next = new Set(prev)
      next.has(periodo) ? next.delete(periodo) : next.add(periodo)
      return next
    })
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">A carregar dados financeiros...</p>
        </div>
      </div>
    )
  if (error) return <div className="p-6 text-red-600 text-sm">{error}</div>

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 md:p-8 md:pb-12 space-y-6 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <Euro className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestão Financeira</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Pagamentos em tempo real · Taxa histórica por entrada</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento: Exportar relatório")}>
              <FileDown className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </div>
        </div>

        {/* ── Alert: overdue ── */}
        {totals.withOverdue > 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              <strong>{totals.withOverdue} colaborador{totals.withOverdue > 1 ? "es" : ""}</strong> com pagamentos em atraso — {formatCurrency(totals.overdueTotal)} por regularizar.
            </p>
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: <DollarSign className="h-5 w-5" />,    label: "Custo Mês Atual",         value: formatCurrency(totals.totalCost),    theme: "blue" },
            { icon: <CheckCircle2 className="h-5 w-5" />,  label: "Pago Mês Atual",           value: formatCurrency(totals.totalPaid),    theme: "emerald" },
            { icon: <Clock className="h-5 w-5" />,         label: "Total Pendente",            value: formatCurrency(totals.totalPending), theme: "amber" },
            { icon: <AlertTriangle className="h-5 w-5" />, label: `${totals.withOverdue} em atraso`, value: formatCurrency(totals.overdueTotal), theme: "red" },
          ].map(kpi => {
            const themes: Record<string, { card: string; icon: string }> = {
              blue:    { card: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",       icon: "bg-blue-100 dark:bg-blue-900/40" },
              emerald: { card: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400", icon: "bg-emerald-100 dark:bg-emerald-900/40" },
              amber:   { card: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",   icon: "bg-amber-100 dark:bg-amber-900/40" },
              red:     { card: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",               icon: "bg-red-100 dark:bg-red-900/40" },
            }
            const t = themes[kpi.theme]
            return (
              <div key={kpi.label} className={cn("rounded-2xl border p-5", t.card)}>
                <div className={cn("inline-flex p-2 rounded-xl mb-3", t.icon)}>{kpi.icon}</div>
                <p className="text-2xl md:text-3xl font-bold tabular-nums">{kpi.value}</p>
                <p className="text-xs mt-1 opacity-80 font-medium">{kpi.label}</p>
              </div>
            )
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar colaborador..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          {!isMobile && (
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border">
              {(["cards", "table"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    viewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === "cards" ? <><LayoutGrid className="h-3.5 w-3.5" /> Cards</> : <><TableIcon className="h-3.5 w-3.5" /> Tabela</>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Cards ── */}
        {effectiveViewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {financeData.map(f => {
              const borderAccent = f.overdueAmount > 0
                ? "border-l-red-500"
                : f.totalPendingAll > 0
                  ? "border-l-amber-400"
                  : "border-l-emerald-400"

              return (
                <div key={f.collaboratorId} className={cn(
                  "rounded-2xl border-l-4 bg-card border border-border overflow-hidden hover:shadow-md transition-shadow",
                  borderAccent
                )}>
                  {/* Card header */}
                  <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                        f.totalHoursThisMonth > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {f.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                      </div>
                    </div>
                    <StatusBadge status={f.status} />
                  </div>

                  <CardContent className="px-5 pb-5 space-y-4">
                    {/* Month stats */}
                    <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        {currentMonthKey}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {[
                          { label: "Horas",    value: `${f.totalHoursThisMonth.toFixed(1)}h`, color: "" },
                          { label: "Custo",    value: formatCurrency(f.thisMonthCost),          color: "text-blue-600 dark:text-blue-400" },
                          { label: "Pago",     value: formatCurrency(f.thisMonthPaid),           color: "text-emerald-600 dark:text-emerald-400" },
                          { label: "Pendente", value: formatCurrency(f.thisMonthPending),        color: "text-amber-600 dark:text-amber-400" },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between col-span-2 sm:col-span-1">
                            <span className="text-xs text-muted-foreground">{row.label}</span>
                            <span className={cn("text-xs font-bold tabular-nums", row.color)}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <PaymentProgress paid={f.thisMonthPaid} cost={f.thisMonthCost} />
                    </div>

                    {/* Total a receber */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total a Receber</span>
                      <span className={cn(
                        "text-xl font-bold tabular-nums",
                        f.totalPendingAll > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {formatCurrency(f.totalPendingAll)}
                      </span>
                    </div>

                    {/* Overdue warning */}
                    {f.overdueAmount > 0 && (
                      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span><strong>{formatCurrency(f.overdueAmount)}</strong> em atraso de meses anteriores</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline" size="sm" className="h-9 text-xs"
                        onClick={() => router.push(`/admin/collaborator/${f.collaboratorId}`)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Detalhes
                      </Button>
                      <Button
                        size="sm" className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleRegistarPagamento(f)}
                        disabled={f.totalPendingAll === 0}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Pagar
                      </Button>
                    </div>

                    <button
                      onClick={() => openHistory(f)}
                      className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      Ver histórico completo <ChevronRight className="h-3 w-3" />
                    </button>
                  </CardContent>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Table ── */}
        {effectiveViewMode === "table" && (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {["Colaborador", "Horas", "Custo (Mês)", "Pago (Mês)", "Pendente (Mês)", "Em Atraso", "Total a Receber", "Estado", "Ações"].map(h => (
                      <TableHead key={h} className="font-bold text-xs uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeData.map(f => (
                    <TableRow key={f.collaboratorId} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {f.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{f.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums font-medium">{f.totalHoursThisMonth.toFixed(1)}h</TableCell>
                      <TableCell className="text-sm tabular-nums font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(f.thisMonthCost)}</TableCell>
                      <TableCell className="text-sm tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(f.thisMonthPaid)}</TableCell>
                      <TableCell className="text-sm tabular-nums font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(f.thisMonthPending)}</TableCell>
                      <TableCell>
                        {f.overdueAmount > 0
                          ? <span className="text-sm tabular-nums font-bold text-red-600">{formatCurrency(f.overdueAmount)}</span>
                          : <span className="text-muted-foreground text-sm">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-base font-bold tabular-nums",
                          f.totalPendingAll > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {formatCurrency(f.totalPendingAll)}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={f.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push(`/admin/collaborator/${f.collaboratorId}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleRegistarPagamento(f)} disabled={f.totalPendingAll === 0}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => openHistory(f)}>
                            Histórico
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Histórico
         ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b shrink-0">
            <DialogTitle className="text-lg font-bold">
              Histórico Financeiro
              <span className="ml-2 text-muted-foreground font-normal text-base">— {selectedCollab?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            {historyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">Sem registos de atividade</p>
              </div>
            ) : (
              [...historyData].reverse().map(m => {
                const isExpanded = expandedHistory.has(m.periodo)
                const isPending = m.pending > 0
                return (
                  <div key={m.periodo} className="rounded-xl border bg-card overflow-hidden">
                    {/* Month header — always visible, clickable */}
                    <button
                      onClick={() => toggleHistoryMonth(m.periodo)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 text-left transition-colors",
                        isPending
                          ? "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                          : "bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
                      )}
                    >
                      <div>
                        <p className="font-bold text-sm capitalize">
                          {new Date(m.periodo + "-02").toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{m.hours.toFixed(1)}h trabalhadas</span>
                          <span>·</span>
                          <span>{formatCurrency(m.cost)} gerado</span>
                          <span>·</span>
                          <span className="text-emerald-600 font-semibold">{formatCurrency(m.paid)} pago</span>
                          {m.payments.length > 0 && (
                            <><span>·</span><span>{m.payments.length} pagamento{m.payments.length > 1 ? "s" : ""}</span></>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="text-right">
                          <p className={cn("text-xl font-bold tabular-nums", isPending ? "text-amber-600" : "text-emerald-600")}>
                            {formatCurrency(m.pending)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">pendente</p>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                      </div>
                    </button>

                    {/* Expandable payments */}
                    {isExpanded && (
                      <div className="px-5 py-3 space-y-2 border-t">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">
                          Pagamentos
                        </p>
                        {m.payments.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">Sem pagamentos registados neste mês.</p>
                        ) : (
                          m.payments.map(p => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between py-2.5 px-4 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors group"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                                <span className="font-bold text-sm tabular-nums">{formatCurrency(p.valor)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(p.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                                <MethodTag metodo={p.metodo} />
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-md font-bold",
                                  p.source === "admin"
                                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                )}>
                                  {p.source === "admin" ? "Admin" : "Colaborador"}
                                </span>
                              </div>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                onClick={() => requestDeletePayment(p)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>Fechar</Button>
            {selectedCollab && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { setShowHistoryDialog(false); handleRegistarPagamento(selectedCollab) }}
                disabled={selectedCollab?.totalPendingAll === 0}
              >
                <Plus className="h-4 w-4 mr-2" /> Registar Pagamento
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Registar Pagamento
         ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Registar Pagamento</DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedCollab?.name}</p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Valor a pagar</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">€</span>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="pl-9 text-2xl font-bold h-14 rounded-xl"
                />
              </div>
              {selectedCollab && (
                <div className="flex gap-2 flex-wrap mt-1">
                  <button
                    onClick={() => setPaymentAmount(selectedCollab.thisMonthPending)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 transition-colors font-medium"
                  >
                    Só mês atual ({formatCurrency(selectedCollab.thisMonthPending)})
                  </button>
                  <button
                    onClick={() => setPaymentAmount(selectedCollab.totalPendingAll)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 transition-colors font-semibold"
                  >
                    Total pendente ({formatCurrency(selectedCollab.totalPendingAll)})
                  </button>
                </div>
              )}
            </div>

            {/* Overdue alert */}
            {selectedCollab?.overdueAmount > 0 && (
              <div className="flex items-start gap-2.5 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3.5 rounded-xl text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span><strong>{formatCurrency(selectedCollab.overdueAmount)} em atraso</strong> de meses anteriores incluídos no total pendente.</span>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Data do pagamento</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="h-10 rounded-xl" />
            </div>

            {/* Method */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Método de pagamento</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="mbway">MB WAY</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3.5 py-3 rounded-xl">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Este pagamento ficará registado como <strong>Admin</strong> no histórico do colaborador.</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPagamentoDialog(false)} disabled={savingPayment}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPagamento}
              disabled={savingPayment || paymentAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Confirmar delete
         ══════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={showDeleteWarn} onOpenChange={setShowDeleteWarn}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 mx-auto mb-3">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">Eliminar pagamento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground text-center">
                {pendingDeletePayment && (
                  <p>
                    Vais eliminar <strong className="text-foreground">{formatCurrency(pendingDeletePayment.valor)}</strong> de{" "}
                    <strong className="text-foreground">
                      {new Date(pendingDeletePayment.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                    </strong>.
                  </p>
                )}
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-left">
                  <p className="text-red-700 dark:text-red-400 text-xs leading-relaxed">
                    Esta ação <strong>não pode ser desfeita</strong> e afeta os cálculos de saldo deste colaborador.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            onClick={() => setDeleteWarnDontShow(v => !v)}
            className="flex items-center gap-2.5 px-1 py-1 cursor-pointer group select-none"
          >
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
              deleteWarnDontShow ? "bg-primary border-primary" : "border-muted-foreground/40 group-hover:border-primary/60"
            )}>
              {deleteWarnDontShow && (
                <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Não voltar a mostrar este aviso
            </span>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => { setShowDeleteWarn(false); setPendingDeletePayment(null) }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteWarnDontShow) localStorage.setItem(DELETE_WARN_KEY, "true")
                if (pendingDeletePayment) commitDeletePayment(pendingDeletePayment)
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ScrollArea>
  )
}