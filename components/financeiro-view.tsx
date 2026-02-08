"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import type { PaymentMethod } from "@/lib/types"
import { cn } from "@/lib/utils"

export function FinanceiroView() {
  const { data, addPayment, deletePayment } = useWorkTracker()

  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [newPaymentValor, setNewPaymentValor] = useState("")
  const [newPaymentMetodo, setNewPaymentMetodo] = useState<PaymentMethod>("MBWay")

  const hoje = new Date()
  const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, "0")
  const anoAtual = hoje.getFullYear().toString()

  const [filtroMes, setFiltroMes] = useState<string>(mesAtual)
  const [filtroAno, setFiltroAno] = useState<string>(anoAtual)

  const mesesPorExtenso = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value)

  const calculated = useMemo(() => {
    const taxa = data.settings.taxaHoraria ?? 0

    // Cálculo GLOBAL real (pago total - devido total)
    const totalDevidoGlobal = data.entries.reduce((sum, entry) => {
      return sum + (entry.totalHoras ?? 0) * taxa
    }, 0)

    const totalPagoGlobal = data.payments.reduce((sum, p) => sum + (p.valor ?? 0), 0)

    const saldoGlobalReal = totalPagoGlobal - totalDevidoGlobal

    // FIFO apenas para o saldo efetivo do período filtrado
    const devidoPorMes: Record<string, number> = {}
    data.entries.forEach((entry) => {
      if (!entry.date || !entry.totalHoras) return
      const mesAno = entry.date.slice(0, 7)
      devidoPorMes[mesAno] = (devidoPorMes[mesAno] ?? 0) + entry.totalHoras * taxa
    })

    const mesesOrdenados = Object.keys(devidoPorMes).sort()

    const pagamentosOrdenados = [...data.payments].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const saldoPorMes: Record<string, number> = {}
    let pointer = 0

    mesesOrdenados.forEach((mesAno) => {
      let restante = devidoPorMes[mesAno] ?? 0

      while (restante > 0 && pointer < pagamentosOrdenados.length) {
        const pag = pagamentosOrdenados[pointer]
        if (pag.valor <= 0) {
          pointer++
          continue
        }

        const quitar = Math.min(restante, pag.valor)
        restante -= quitar
        pagamentosOrdenados[pointer] = { ...pag, valor: pag.valor - quitar }

        if (pagamentosOrdenados[pointer].valor <= 0) pointer++
      }

      saldoPorMes[mesAno] = restante
    })

    const mesOk = (m: string) => filtroMes === "todos" || m.endsWith(`-${filtroMes.padStart(2, "0")}`)
    const anoOk = (m: string) => filtroAno === "todos" || m.startsWith(`${filtroAno}-`)

    let totalDevidoPeriodo = 0
    let saldoEfetivoPeriodo = 0

    mesesOrdenados.forEach((mesAno) => {
      if (mesOk(mesAno) && anoOk(mesAno)) {
        const devido = devidoPorMes[mesAno] ?? 0
        totalDevidoPeriodo += devido
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

  const handleAddPayment = () => {
    const valor = parseFloat(newPaymentValor)
    if (Number.isNaN(valor) || valor <= 0) {
      alert("Por favor, insira um valor válido")
      return
    }

    addPayment({
      date: newPaymentDate,
      valor,
      metodo: newPaymentMetodo,
    })

    setNewPaymentValor("")
    setNewPaymentDate(new Date().toISOString().split("T")[0])
  }

  const mesSelecionado = filtroMes === "todos" ? "Todos os meses" : mesesPorExtenso[parseInt(filtroMes)]
  const tituloPeriodo = `(${mesSelecionado} ${filtroAno})`

  const isDevendo = saldoEfetivoPeriodo > 0
  const isQuitado = saldoEfetivoPeriodo === 0
  const isAdiantado = saldoEfetivoPeriodo < 0

  return (
    <div className="flex flex-col h-full overflow-auto pb-20">
      <div className="p-4 space-y-5">
        {/* Card principal de resumo */}
        <Card
          className={cn(
            "border-2 shadow-md transition-colors",
            isDevendo && "border-red-600/60 bg-red-50/30",
            isQuitado && "border-green-600/60 bg-green-50/30",
            isAdiantado && "border-blue-600/60 bg-blue-50/30"
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {isDevendo && `Falta Receber ${tituloPeriodo}`}
              {isQuitado && `Período Liquidado ${tituloPeriodo}`}
              {isAdiantado && `Crédito / Adiantamento ${tituloPeriodo}`}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div
              className={cn(
                "text-5xl font-extrabold tracking-tight text-center py-4",
                isDevendo && "text-red-700",
                isQuitado && "text-green-700",
                isAdiantado && "text-blue-700"
              )}
            >
              {isDevendo
                ? formatCurrency(saldoEfetivoPeriodo)
                : isAdiantado
                ? `+${formatCurrency(Math.abs(saldoEfetivoPeriodo))}`
                : "0,00 €"}
            </div>

            <div className="mt-3 text-lg font-medium text-center">
              {isDevendo && <span className="text-red-800">Pendente de recebimento</span>}
              {isQuitado && <span className="text-green-800">✓ Tudo recebido neste período</span>}
              {isAdiantado && (
                <span className="text-blue-800">
                  Crédito do cliente – será abatido nos próximos trabalhos
                </span>
              )}
            </div>

            <div className="mt-6 space-y-2 text-sm border-t pt-4">
              {emAtrasoGlobal > 0 && (
                <p className="text-red-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Atraso acumulado global: {formatCurrency(emAtrasoGlobal)}
                </p>
              )}

              {emAdiantamentoGlobal > 0 && (
                <p className="text-blue-700 font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Adiantamento : +{formatCurrency(emAdiantamentoGlobal)}
                </p>
              )}

              {emAtrasoGlobal === 0 && emAdiantamentoGlobal === 0 && (
                <p className="text-green-700 font-semibold text-center">
                  Conta global equilibrada ✓
                </p>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-5 text-sm">
              <div className="flex items-start gap-2.5">
                <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Total devido</p>
                  <p className="font-semibold text-base">{formatCurrency(totalDevidoPeriodo)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <TrendingDown className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Total recebido</p>
                  <p className="font-semibold text-green-700 text-base">
                    {formatCurrency(totalPagoPeriodo)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtro */}
        <div className="flex flex-wrap justify-center gap-6 px-2 py-2">
          <div className="min-w-[150px] space-y-1.5">
            <Label htmlFor="filtro-mes" className="text-xs text-muted-foreground text-center block">
              Mês
            </Label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecionar mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {mesesPorExtenso.slice(1).map((mes, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                    {mes}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px] space-y-1.5">
            <Label htmlFor="filtro-ano" className="text-xs text-muted-foreground text-center block">
              Ano
            </Label>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecionar ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2028">2028</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Adicionar Pagamento */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Registar Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-date">Data do pagamento</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={newPaymentDate}
                  onChange={(e) => setNewPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-valor">Valor (€)</Label>
                <Input
                  id="payment-valor"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newPaymentValor}
                  onChange={(e) => setNewPaymentValor(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-metodo">Método de pagamento</Label>
              <Select
                value={newPaymentMetodo}
                onValueChange={(v) => setNewPaymentMetodo(v as PaymentMethod)}
              >
                <SelectTrigger id="payment-metodo">
                  <SelectValue placeholder="Escolher método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MBWay">MBWay</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddPayment}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pagamento
            </Button>
          </CardContent>
        </Card>

        {/* Histórico de Pagamentos */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2">
            Histórico de Pagamentos
            {(filtroMes !== "todos" || filtroAno !== "todos") && (
              <span className="text-xs font-normal text-muted-foreground">(filtrado)</span>
            )}
          </h3>

          {pagamentosFiltrados.length === 0 ? (
            <Card className="bg-muted/40">
              <CardContent className="py-10 text-center text-muted-foreground">
                {filtroMes !== "todos" || filtroAno !== "todos"
                  ? "Nenhum pagamento registado neste período."
                  : "Ainda não foram registados pagamentos."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {pagamentosFiltrados.map((payment) => (
                <Card key={payment.id} className="shadow-sm">
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-base">{formatCurrency(payment.valor)}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatDate(payment.date)} • {payment.metodo}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deletePayment(payment.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}