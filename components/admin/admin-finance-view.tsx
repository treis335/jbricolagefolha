"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Euro, CheckCircle2, Clock, AlertCircle, Plus, Eye, FileDown,
  DollarSign, LayoutGrid, Table as TableIcon, AlertTriangle,
  Trash2, Search, RefreshCw, TrendingUp, ChevronRight,
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

interface MonthSummary {
  periodo: string
  hours: number
  cost: number
  paid: number
  pending: number
  payments: Array<{
    id: string
    date: string
    valor: number
    metodo: string
    source?: "admin"
  }>
}

const VIEW_MODE_KEY = "financeViewMode"
const DELETE_WARN_KEY = "adminDeletePaymentWarnDismissed"

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)

export function AdminFinanceView() {
  const { collaborators, loading, error, refetch } = useCollaborators()
  const router = useRouter()

  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    if (typeof window === "undefined") return "cards"
    return (localStorage.getItem(VIEW_MODE_KEY) as "cards" | "table") || "cards"
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCollab, setSelectedCollab] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedMethod, setSelectedMethod] = useState("transferencia")
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [historyData, setHistoryData] = useState<MonthSummary[]>([])
  const [isMobile, setIsMobile] = useState(false)

  // Delete warning
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
      .map((collab) => {
        const rate = collab.currentRate || 0
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
          m.hours += entry.totalHoras || 0
          m.cost += rate * (entry.totalHoras || 0)
        })

        payments.forEach((p: any) => {
          const periodo = p.date?.slice(0, 7)
          if (!periodo) return
          if (!monthPaymentsMap.has(periodo)) monthPaymentsMap.set(periodo, [])
          monthPaymentsMap.get(periodo)!.push(p)
        })

        let allMonths = Array.from(monthMap.values()).sort((a, b) => a.periodo.localeCompare(b.periodo))

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
        const overdueAmount = pastMonths.reduce((sum, m) => sum + m.pending, 0)
        const totalPendingAll = allMonths.reduce((sum, m) => sum + m.pending, 0)

        let status = "sem_atividade"
        if (totalPendingAll > 0) status = overdueAmount > 0 ? "atrasado" : "pendente"
        else if (currentMonthData.cost > 0) status = "pago"

        return {
          collaboratorId: collab.id,
          name: collab.name,
          email: collab.email,
          totalHoursThisMonth: currentMonthData.hours,
          currentRate: rate,
          thisMonthCost: currentMonthData.cost,
          thisMonthPaid: currentMonthData.paid,
          thisMonthPending: currentMonthData.pending,
          totalPendingAll,
          overdueAmount,
          allMonths,
          status,
        }
      })
      .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [collaborators, searchQuery, currentMonthKey])

  const totals = useMemo(() => ({
    totalCost: financeData.reduce((s, f) => s + f.thisMonthCost, 0),
    totalPaid: financeData.reduce((s, f) => s + f.thisMonthPaid, 0),
    totalPending: financeData.reduce((s, f) => s + f.totalPendingAll, 0),
    overdueTotal: financeData.reduce((s, f) => s + f.overdueAmount, 0),
    withOverdue: financeData.filter(f => f.overdueAmount > 0).length,
  }), [financeData])

  const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
    pago:          { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500", label: "Pago" },
    pendente:      { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",         dot: "bg-amber-500",  label: "Pendente" },
    atrasado:      { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",                 dot: "bg-red-500",    label: "Atrasado" },
    sem_atividade: { color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",            dot: "bg-slate-400",  label: "Inativo" },
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const c = statusConfig[status] || statusConfig.sem_atividade
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${c.color}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    )
  }

  const getDefaultMethod = (id: string) =>
    (typeof window !== "undefined" && localStorage.getItem(`defaultPaymentMethod_${id}`)) || "transferencia"
  const saveDefaultMethod = (id: string, method: string) =>
    localStorage.setItem(`defaultPaymentMethod_${id}`, method)

  const openHistory = (collab: any) => {
    setHistoryData(collab.allMonths)
    setSelectedCollab(collab)
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
    const newPayment = {
      id: `admin_${Date.now()}`,
      date: paymentDate,
      valor: Number(paymentAmount),
      metodo: selectedMethod,
      source: "admin", // always Admin when registered here
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
    }
  }

  // ── Delete flow with optional warning ──
  const requestDeletePayment = (payment: any) => {
    const dismissed = typeof window !== "undefined" && localStorage.getItem(DELETE_WARN_KEY) === "true"
    if (dismissed) {
      commitDeletePayment(payment)
    } else {
      setPendingDeletePayment(payment)
      setDeleteWarnDontShow(false)
      setShowDeleteWarn(true)
    }
  }

  const commitDeletePayment = async (payment: any) => {
    if (!selectedCollab) return
    try {
      const userRef = doc(db, "users", selectedCollab.collaboratorId)

      // 1. Read the full current document from Firestore
      const snap = await getDoc(userRef)
      if (!snap.exists()) { alert("Colaborador não encontrado."); return }

      const workData = snap.data()?.workData || {}
      const currentPayments: any[] = workData.payments || []

      // 2. Filter out by id — safe regardless of field order or type coercion
      const updatedPayments = currentPayments.filter((p: any) => p.id !== payment.id)

      if (updatedPayments.length === currentPayments.length) {
        // Nothing was removed — payment not found in Firestore
        alert("Pagamento não encontrado. Tenta atualizar a página.")
        return
      }

      // 3. Write the filtered array back
      await updateDoc(userRef, { "workData.payments": updatedPayments })

      setShowDeleteWarn(false)
      setPendingDeletePayment(null)

      // 4. Update history dialog in-place so it stays open
      setHistoryData(prev =>
        prev.map(m => ({
          ...m,
          payments: m.payments.filter(p => p.id !== payment.id),
        }))
      )

      refetch()
    } catch (err) {
      console.error(err)
      alert("Erro ao eliminar pagamento.")
    }
  }

  const handleConfirmDelete = () => {
    if (deleteWarnDontShow && typeof window !== "undefined") {
      localStorage.setItem(DELETE_WARN_KEY, "true")
    }
    if (pendingDeletePayment) commitDeletePayment(pendingDeletePayment)
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

  const borderColor = (f: any) =>
    f.overdueAmount > 0 ? "border-l-red-500" : f.totalPendingAll > 0 ? "border-l-amber-400" : "border-l-emerald-400"

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 md:p-8 md:pb-12 space-y-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-14 h-14 bg-emerald-100 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <Euro className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestão Financeira</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pagamentos em tempo real · Cálculo FIFO por colaborador
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => alert("Exportar relatório")}>
              <FileDown className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <DollarSign className="h-5 w-5" />,   label: "Custo Mês Atual",              value: `${totals.totalCost.toFixed(2)} €`,    theme: "blue" },
            { icon: <CheckCircle2 className="h-5 w-5" />, label: "Pago Mês Atual",               value: `${totals.totalPaid.toFixed(2)} €`,    theme: "emerald" },
            { icon: <Clock className="h-5 w-5" />,        label: "Total Pendente",                value: `${totals.totalPending.toFixed(2)} €`, theme: "amber" },
            { icon: <AlertTriangle className="h-5 w-5" />,label: `${totals.withOverdue} em atraso`, value: `${totals.overdueTotal.toFixed(2)} €`, theme: "red" },
          ].map((kpi) => {
            const t: Record<string, string> = {
              blue:    "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
              emerald: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
              amber:   "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
              red:     "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
            }
            const iconBg: Record<string, string> = {
              blue: "bg-blue-100 dark:bg-blue-900/40", emerald: "bg-emerald-100 dark:bg-emerald-900/40",
              amber: "bg-amber-100 dark:bg-amber-900/40", red: "bg-red-100 dark:bg-red-900/40",
            }
            return (
              <Card key={kpi.label} className={`relative overflow-hidden ${t[kpi.theme]}`}>
                <CardContent className="pt-5 pb-4 px-5">
                  <div className={`inline-flex p-2 rounded-xl mb-3 ${iconBg[kpi.theme]}`}>{kpi.icon}</div>
                  <p className="text-2xl md:text-3xl font-bold">{kpi.value}</p>
                  <p className="text-xs mt-1 opacity-80">{kpi.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Procurar colaborador..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10" />
          </div>
          {!isMobile && (
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border">
              {(["cards", "table"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === "cards"
                    ? <><LayoutGrid className="h-4 w-4" /> Cards</>
                    : <><TableIcon className="h-4 w-4" /> Tabela</>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Cards View ── */}
        {effectiveViewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {financeData.map((f) => (
              <Card key={f.collaboratorId} className={`overflow-hidden border-l-4 hover:shadow-md transition-shadow ${borderColor(f)}`}>
                <div className="pb-3 pt-5 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-base truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{f.email}</p>
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                </div>
                <CardContent className="px-5 pb-5 space-y-4">
                  <div className="bg-muted/40 rounded-xl p-4 space-y-2.5">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{currentMonthKey}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {[
                        { label: "Horas",    value: `${f.totalHoursThisMonth.toFixed(1)}h`, color: "" },
                        { label: "Custo",    value: `${f.thisMonthCost.toFixed(2)} €`,       color: "text-blue-600 dark:text-blue-400" },
                        { label: "Pago",     value: `${f.thisMonthPaid.toFixed(2)} €`,       color: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Pendente", value: `${f.thisMonthPending.toFixed(2)} €`,    color: "text-amber-600 dark:text-amber-400" },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between col-span-2 md:col-span-1">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className={`font-semibold ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Total a Receber</span>
                    <span className={`text-2xl font-bold ${f.totalPendingAll > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {f.totalPendingAll.toFixed(2)} €
                    </span>
                  </div>
                  {f.overdueAmount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span><strong>{f.overdueAmount.toFixed(2)} €</strong> em atraso de meses anteriores</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => router.push(`/admin/collaborator/${f.collaboratorId}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Detalhes
                    </Button>
                    <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleRegistarPagamento(f)} disabled={f.totalPendingAll === 0}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Pagar
                    </Button>
                  </div>
                  <button onClick={() => openHistory(f)} className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                    Ver histórico completo <ChevronRight className="h-3 w-3" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Table View ── */}
        {effectiveViewMode === "table" && (
          <Card>
            <div className="overflow-x-auto rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Colaborador</TableHead>
                    <TableHead className="text-right font-semibold">Horas</TableHead>
                    <TableHead className="text-right font-semibold">Custo (Mês)</TableHead>
                    <TableHead className="text-right font-semibold">Pago (Mês)</TableHead>
                    <TableHead className="text-right font-semibold">Pendente (Mês)</TableHead>
                    <TableHead className="text-right font-semibold">Em Atraso</TableHead>
                    <TableHead className="text-right font-semibold">Total a Receber</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="text-center font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeData.map((f) => (
                    <TableRow key={f.collaboratorId} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <p className="font-medium text-sm">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.email}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">{f.totalHoursThisMonth.toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-sm text-blue-600 dark:text-blue-400 font-medium">{f.thisMonthCost.toFixed(2)} €</TableCell>
                      <TableCell className="text-right text-sm text-emerald-600 dark:text-emerald-400 font-medium">{f.thisMonthPaid.toFixed(2)} €</TableCell>
                      <TableCell className="text-right text-sm text-amber-600 dark:text-amber-400 font-medium">{f.thisMonthPending.toFixed(2)} €</TableCell>
                      <TableCell className="text-right text-sm">
                        {f.overdueAmount > 0 ? <span className="text-red-600 font-semibold">{f.overdueAmount.toFixed(2)} €</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-base font-bold ${f.totalPendingAll > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {f.totalPendingAll.toFixed(2)} €
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={f.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 justify-center">
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
          </Card>
        )}
      </div>

      {/* ── Modal: Histórico ── */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b shrink-0">
            <DialogTitle className="text-xl">
              Histórico Financeiro
              <span className="ml-2 text-muted-foreground font-normal">— {selectedCollab?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {historyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
                <p>Sem registos de atividade</p>
              </div>
            ) : (
              <div className="space-y-5">
                {historyData.map((m) => (
                  <div key={m.periodo} className="rounded-xl border bg-card overflow-hidden">
                    <div className={`flex items-center justify-between px-5 py-4 border-b ${
                      m.pending > 0 ? "bg-amber-50 dark:bg-amber-950/20" : "bg-emerald-50 dark:bg-emerald-950/20"
                    }`}>
                      <div>
                        <p className="font-semibold capitalize">
                          {new Date(m.periodo + "-01").toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{m.hours.toFixed(1)}h trabalhadas</span>
                          <span>·</span>
                          <span>{m.cost.toFixed(2)} € gerado</span>
                          <span>·</span>
                          <span className="text-emerald-600 font-medium">{m.paid.toFixed(2)} € pago</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className={`text-2xl font-bold ${m.pending > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {m.pending.toFixed(2)} €
                        </p>
                        <p className="text-xs text-muted-foreground">pendente</p>
                      </div>
                    </div>

                    {m.payments.length > 0 && (
                      <div className="px-5 py-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">Pagamentos</p>
                        {m.payments.map((p: any) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between py-2.5 px-4 bg-muted/40 rounded-lg hover:bg-muted/70 transition-colors group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                              <span className="font-semibold text-sm">{p.valor.toFixed(2)} €</span>
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                {new Date(p.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-md bg-background border capitalize">{p.metodo}</span>
                              {/* Source badge */}
                              {p.source === "admin" ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                                  Admin
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                  Colaborador
                                </span>
                              )}
                            </div>
                            {/* Admin can delete ANY payment */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              onClick={() => requestDeletePayment(p)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.payments.length === 0 && m.cost > 0 && (
                      <p className="px-5 py-3 text-xs text-muted-foreground italic">Sem pagamentos registados neste mês.</p>
                    )}
                  </div>
                ))}
              </div>
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

      {/* ── Modal: Registar Pagamento ── */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registar Pagamento</DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedCollab?.name}</p>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Valor a pagar</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="pl-8 text-2xl font-bold h-14"
                />
              </div>
              {selectedCollab && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() => setPaymentAmount(selectedCollab.thisMonthPending)}
                    className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors"
                  >
                    Só mês atual ({selectedCollab.thisMonthPending.toFixed(2)} €)
                  </button>
                  <button
                    onClick={() => setPaymentAmount(selectedCollab.totalPendingAll)}
                    className="text-xs px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 transition-colors"
                  >
                    Total pendente ({selectedCollab.totalPendingAll.toFixed(2)} €)
                  </button>
                </div>
              )}
            </div>
            {selectedCollab?.overdueAmount > 0 && (
              <div className="flex items-start gap-2.5 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3.5 rounded-xl">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span><strong>{selectedCollab.overdueAmount.toFixed(2)} € em atraso</strong> de meses anteriores incluídos no total.</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Data do pagamento</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Método de pagamento</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="mbway">MB WAY</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Info: labeled as Admin */}
            <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Este pagamento ficará registado como <strong>Admin</strong> no histórico do colaborador.</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPagamentoDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmPagamento} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Warning AlertDialog ── */}
      <AlertDialog open={showDeleteWarn} onOpenChange={setShowDeleteWarn}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 mx-auto mb-3">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">Eliminar pagamento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground text-center">
                {pendingDeletePayment && (
                  <p>
                    Vais eliminar{" "}
                    <strong className="text-foreground">{formatCurrency(pendingDeletePayment.valor)}</strong>{" "}
                    de{" "}
                    <strong className="text-foreground">
                      {new Date(pendingDeletePayment.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                    </strong>
                    {" "}
                    <span className={cn(
                      "inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                      pendingDeletePayment.source === "admin"
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      {pendingDeletePayment.source === "admin" ? "Admin" : "Colaborador"}
                    </span>.
                  </p>
                )}
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-left">
                  <p className="text-red-700 dark:text-red-400 text-xs leading-relaxed">
                    Como administrador podes eliminar qualquer pagamento.
                    Esta ação <strong>não pode ser desfeita</strong> e irá
                    afetar os cálculos de saldo deste colaborador.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Don't show again */}
          <div
            onClick={() => setDeleteWarnDontShow(v => !v)}
            className="flex items-center gap-2.5 px-1 py-1 cursor-pointer group select-none"
          >
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
              deleteWarnDontShow
                ? "bg-primary border-primary"
                : "border-muted-foreground/40 group-hover:border-primary/60"
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
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Sim, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ScrollArea>
  )
}