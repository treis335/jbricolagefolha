"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Trash2, Plus, TrendingUp, TrendingDown, AlertCircle,
  CheckCircle2, Clock, CreditCard, Wallet, ArrowUpDown,
  CalendarDays, ChevronDown, ChevronUp,
} from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import type { PaymentMethod } from "@/lib/types"
import { cn } from "@/lib/utils"

const mesesPorExtenso = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })

const metodoIcon: Record<string, React.ReactElement> = {
  MBWay:         <Wallet className="h-3.5 w-3.5" />,
  Dinheiro:      <CreditCard className="h-3.5 w-3.5" />,
  Transferência: <ArrowUpDown className="h-3.5 w-3.5" />,
}

export function FinanceiroView() {
  const { data, addPayment, deletePayment } = useWorkTracker()

  const hoje = new Date()
  const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, "0")
  const anoAtual = hoje.getFullYear().toString()

  const [newPaymentDate, setNewPaymentDate] = useState(hoje.toISOString().split("T")[0])
  const [newPaymentValor, setNewPaymentValor] = useState("")
  const [newPaymentMetodo, setNewPaymentMetodo] = useState<PaymentMethod>("MBWay")
  const [filtroMes, setFiltroMes] = useState<string>(mesAtual)
  const [filtroAno, setFiltroAno] = useState<string>(anoAtual)
  const [showForm, setShowForm] = useState(false)
  const [showEmitWarning, setShowEmitWarning] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<{ date: string; valor: number; metodo: PaymentMethod } | null>(null)

  const WARN_KEY = "financeiroEmitWarningDismissed"

  const calculated = useMemo(() => {
    const taxa = data.settings.taxaHoraria ?? 0

    const totalDevidoGlobal = data.entries.reduce(
      (sum, e) => sum + (e.totalHoras ?? 0) * taxa, 0
    )
    const totalPagoGlobal = data.payments.reduce((sum, p) => sum + (p.valor ?? 0), 0)
    const saldoGlobalReal = totalPagoGlobal - totalDevidoGlobal

    const devidoPorMes: Record<string, number> = {}
    data.entries.forEach((e) => {
      if (!e.date || !e.totalHoras) return
      const mesAno = e.date.slice(0, 7)
      devidoPorMes[mesAno] = (devidoPorMes[mesAno] ?? 0) + e.totalHoras * taxa
    })

    const mesesOrdenados = Object.keys(devidoPorMes).sort()
    const pagamentosOrdenados = [...data.payments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const saldoPorMes: Record<string, number> = {}
    let pointer = 0

    mesesOrdenados.forEach((mesAno) => {
      let restante = devidoPorMes[mesAno] ?? 0
      while (restante > 0 && pointer < pagamentosOrdenados.length) {
        const pag = pagamentosOrdenados[pointer]
        if (pag.valor <= 0) { pointer++; continue }
        const quitar = Math.min(restante, pag.valor)
        restante -= quitar
        pagamentosOrdenados[pointer] = { ...pag, valor: pag.valor - quitar }
        if (pagamentosOrdenados[pointer].valor <= 0) pointer++
      }
      saldoPorMes[mesAno] = restante
    })

    const mesOk = (m: string) => filtroMes === "todos" || m.endsWith(`-${filtroMes.padStart(2, "0")}`)
    const anoOk = (m: string) => filtroAno === "todos" || m.startsWith(`${filtroAno}-`)

    let totalDevidoPeriodo = 0, saldoEfetivoPeriodo = 0
    mesesOrdenados.forEach((mesAno) => {
      if (mesOk(mesAno) && anoOk(mesAno)) {
        totalDevidoPeriodo += devidoPorMes[mesAno] ?? 0
        saldoEfetivoPeriodo += saldoPorMes[mesAno] ?? 0
      }
    })

    const pagamentosFiltrados = data.payments.filter((p) => {
      const d = new Date(p.date)
      const m = (d.getMonth() + 1).toString().padStart(2, "0")
      const a = d.getFullYear().toString()
      return (filtroMes === "todos" || m === filtroMes) && (filtroAno === "todos" || a === filtroAno)
    })

    const totalPagoPeriodo = pagamentosFiltrados.reduce((acc, p) => acc + p.valor, 0)

    return {
      totalDevidoPeriodo,
      totalPagoPeriodo,
      saldoEfetivoPeriodo,
      pagamentosFiltrados,
      emAtrasoGlobal: saldoGlobalReal < 0 ? Math.abs(saldoGlobalReal) : 0,
      emAdiantamentoGlobal: saldoGlobalReal > 0 ? saldoGlobalReal : 0,
    }
  }, [data.entries, data.payments, data.settings.taxaHoraria, filtroMes, filtroAno])

  const {
    totalDevidoPeriodo,
    totalPagoPeriodo,
    saldoEfetivoPeriodo,
    pagamentosFiltrados,
    emAtrasoGlobal,
    emAdiantamentoGlobal,
  } = calculated

  const isDevendo  = saldoEfetivoPeriodo > 0
  const isQuitado  = saldoEfetivoPeriodo === 0
  const isAdiantado = saldoEfetivoPeriodo < 0

  const handleAddPayment = () => {
    const valor = parseFloat(newPaymentValor)
    if (Number.isNaN(valor) || valor <= 0) { alert("Por favor, insira um valor válido"); return }

    const payment = { date: newPaymentDate, valor, metodo: newPaymentMetodo }

    // Check if warning was dismissed
    const dismissed = typeof window !== "undefined" && localStorage.getItem(WARN_KEY) === "true"
    if (dismissed) {
      commitPayment(payment)
    } else {
      setPendingPayment(payment)
      setDontShowAgain(false)
      setShowEmitWarning(true)
    }
  }

  const commitPayment = (payment: { date: string; valor: number; metodo: PaymentMethod }) => {
    addPayment(payment)
    setNewPaymentValor("")
    setNewPaymentDate(hoje.toISOString().split("T")[0])
    setShowForm(false)
    setShowEmitWarning(false)
    setPendingPayment(null)
  }

  const handleConfirmEmit = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      localStorage.setItem(WARN_KEY, "true")
    }
    if (pendingPayment) commitPayment(pendingPayment)
  }

  const mesSelecionado = filtroMes === "todos" ? "Todos os meses" : mesesPorExtenso[parseInt(filtroMes)]
  const tituloPeriodo = filtroAno === "todos" ? mesSelecionado : `${mesSelecionado} ${filtroAno}`

  // Progress bar pct
  const progressPct = totalDevidoPeriodo > 0
    ? Math.min(100, (totalPagoPeriodo / totalDevidoPeriodo) * 100)
    : 0

  return (
    <div className="flex flex-col h-full overflow-auto pb-24">
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">

        {/* ── Page Title ── */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Controlo de pagamentos e saldos</p>
          </div>
        </div>

        {/* ── Period Filter ── */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Mês</Label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {mesesPorExtenso.slice(1).map((mes, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, "0")}>{mes}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Ano</Label>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                {["2025", "2026", "2027", "2028"].map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Main Summary Card ── */}
        <div className={cn(
          "rounded-2xl border-2 overflow-hidden transition-colors",
          isDevendo   && "border-amber-300 dark:border-amber-700",
          isQuitado   && "border-emerald-300 dark:border-emerald-700",
          isAdiantado && "border-blue-300 dark:border-blue-700",
        )}>
          {/* Colored top band */}
          <div className={cn(
            "px-5 py-4 md:px-7 md:py-5",
            isDevendo   && "bg-amber-50 dark:bg-amber-950/30",
            isQuitado   && "bg-emerald-50 dark:bg-emerald-950/30",
            isAdiantado && "bg-blue-50 dark:bg-blue-950/30",
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-semibold uppercase tracking-widest mb-1",
                  isDevendo   && "text-amber-600 dark:text-amber-400",
                  isQuitado   && "text-emerald-600 dark:text-emerald-400",
                  isAdiantado && "text-blue-600 dark:text-blue-400",
                )}>
                  {isDevendo   && "Pendente de recebimento"}
                  {isQuitado   && "Período liquidado"}
                  {isAdiantado && "Crédito / Adiantamento"}
                </p>
                <p className={cn(
                  "text-3xl md:text-5xl font-bold tracking-tight",
                  isDevendo   && "text-amber-700 dark:text-amber-300",
                  isQuitado   && "text-emerald-700 dark:text-emerald-300",
                  isAdiantado && "text-blue-700 dark:text-blue-300",
                )}>
                  {isDevendo
                    ? formatCurrency(saldoEfetivoPeriodo)
                    : isAdiantado
                      ? `+${formatCurrency(Math.abs(saldoEfetivoPeriodo))}`
                      : "0,00 €"}
                </p>
                <p className={cn(
                  "text-sm mt-1.5",
                  isDevendo   && "text-amber-700/70 dark:text-amber-400/70",
                  isQuitado   && "text-emerald-700/70 dark:text-emerald-400/70",
                  isAdiantado && "text-blue-700/70 dark:text-blue-400/70",
                )}>
                  {tituloPeriodo}
                </p>
              </div>

              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl shrink-0",
                isDevendo   && "bg-amber-100 dark:bg-amber-900/40",
                isQuitado   && "bg-emerald-100 dark:bg-emerald-900/40",
                isAdiantado && "bg-blue-100 dark:bg-blue-900/40",
              )}>
                {isDevendo   && <Clock className="h-6 w-6 text-amber-600" />}
                {isQuitado   && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                {isAdiantado && <TrendingUp className="h-6 w-6 text-blue-600" />}
              </div>
            </div>

            {/* Progress bar */}
            {totalDevidoPeriodo > 0 && (
              <div className="mt-4 space-y-1.5">
                <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isDevendo   && "bg-amber-500",
                      isQuitado   && "bg-emerald-500",
                      isAdiantado && "bg-blue-500",
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs opacity-60 text-right">{progressPct.toFixed(0)}% recebido</p>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 divide-x bg-card">
            <div className="px-5 py-4 md:px-7">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total devido</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(totalDevidoPeriodo)}</p>
            </div>
            <div className="px-5 py-4 md:px-7">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Total recebido</span>
              </div>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalPagoPeriodo)}</p>
            </div>
          </div>

          {/* Global alerts */}
          {(emAtrasoGlobal > 0 || emAdiantamentoGlobal > 0) && (
            <div className="px-5 py-3 md:px-7 border-t bg-muted/30">
              {emAtrasoGlobal > 0 && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Atraso acumulado global: {formatCurrency(emAtrasoGlobal)}
                </div>
              )}
              {emAdiantamentoGlobal > 0 && (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  Adiantamento global: +{formatCurrency(emAdiantamentoGlobal)}
                </div>
              )}
              {emAtrasoGlobal === 0 && emAdiantamentoGlobal === 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Conta global equilibrada
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Register Payment — Collapsible ── */}
        <div className="rounded-xl border overflow-hidden">
          <button
            onClick={() => setShowForm(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <Plus className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Registar Pagamento</p>
                <p className="text-xs text-muted-foreground">Adicionar novo recebimento</p>
              </div>
            </div>
            {showForm
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </button>

          {showForm && (
            <div className="px-5 pb-5 pt-1 border-t bg-muted/20 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Data do pagamento</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={newPaymentDate}
                      onChange={(e) => setNewPaymentDate(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Valor (€)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">€</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newPaymentValor}
                      onChange={(e) => setNewPaymentValor(e.target.value)}
                      className="pl-7 h-10 text-base font-semibold"
                    />
                  </div>
                  {/* Quick fill */}
                  {saldoEfetivoPeriodo > 0 && (
                    <button
                      onClick={() => setNewPaymentValor(saldoEfetivoPeriodo.toFixed(2))}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                    >
                      Preencher com valor pendente ({formatCurrency(saldoEfetivoPeriodo)})
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Método de pagamento</Label>
                <Select value={newPaymentMetodo} onValueChange={(v) => setNewPaymentMetodo(v as PaymentMethod)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MBWay">MBWay</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddPayment}
                  className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Payments History ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Histórico de Pagamentos
              {pagamentosFiltrados.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {pagamentosFiltrados.length}
                </span>
              )}
            </h3>
            {(filtroMes !== "todos" || filtroAno !== "todos") && (
              <span className="text-xs text-muted-foreground">filtrado</span>
            )}
          </div>

          {pagamentosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {filtroMes !== "todos" || filtroAno !== "todos"
                  ? "Nenhum pagamento neste período"
                  : "Ainda não foram registados pagamentos"}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="text-xs text-primary underline underline-offset-2 mt-2"
              >
                Registar primeiro pagamento
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pagamentosFiltrados.map((payment) => (
                <div
                  key={payment.id}
                  className="group flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                >
                  {/* Left: amount + date */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 shrink-0">
                      {metodoIcon[payment.metodo] ?? <CreditCard className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-base leading-none">{formatCurrency(payment.valor)}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formatDate(payment.date)}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{payment.metodo}</span>
                        {payment.source === "admin" && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: delete */}
                  <div className="shrink-0">
                    {payment.source !== "admin" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar pagamento?</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                  Estás prestes a eliminar o registo de{" "}
                                  <strong className="text-foreground">{formatCurrency(payment.valor)}</strong>{" "}
                                  de <strong className="text-foreground">{formatDate(payment.date)}</strong>.
                                </p>
                                <p>
                                  Como este pagamento foi registado por ti, podes removê-lo caso tenha sido
                                  adicionado por engano. O administrador será responsável por validar
                                  quaisquer alterações ao histórico.
                                </p>
                                <p className="text-red-600 dark:text-red-400 font-medium">
                                  Esta ação não pode ser desfeita.
                                </p>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePayment(payment.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Sim, eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Emission Warning Dialog ── */}
      <AlertDialog open={showEmitWarning} onOpenChange={setShowEmitWarning}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-center">Atenção antes de registar</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground text-center">
                <p>
                  Estás prestes a registar um pagamento de{" "}
                  <strong className="text-foreground">
                    {pendingPayment ? formatCurrency(pendingPayment.valor) : ""}
                  </strong>.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-left space-y-1.5">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wide">
                    Importante
                  </p>
                  <p className="text-amber-700 dark:text-amber-400">
                    Após confirmar, <strong>não poderás eliminar</strong> este registo.
                    Apenas o <strong>administrador</strong> tem permissão para remover
                    pagamentos emitidos.
                  </p>
                </div>
                <p className="text-xs">
                  Confirma que o valor e a data estão corretos antes de prosseguir.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Don't show again */}
          <div
            onClick={() => setDontShowAgain(v => !v)}
            className="flex items-center gap-2.5 px-1 py-2 cursor-pointer group select-none"
          >
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
              dontShowAgain
                ? "bg-primary border-primary"
                : "border-muted-foreground/40 group-hover:border-primary/60"
            )}>
              {dontShowAgain && (
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
            <AlertDialogCancel onClick={() => { setShowEmitWarning(false); setPendingPayment(null) }}>
              Rever pagamento
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirmar registo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}