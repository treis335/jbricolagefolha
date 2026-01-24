"use client"

import { useState } from "react"
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
import { Trash2, Plus, TrendingUp, TrendingDown } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import type { PaymentMethod } from "@/lib/types"
import { cn } from "@/lib/utils"

export function FinanceiroView() {
  const { data, addPayment, deletePayment, getTotalValor, getTotalPago, getFaltaReceber } =
    useWorkTracker()

  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [newPaymentValor, setNewPaymentValor] = useState("")
  const [newPaymentMetodo, setNewPaymentMetodo] = useState<PaymentMethod>("MBWay")

  const totalValor = getTotalValor()
  const totalPago = getTotalPago()
  const faltaReceber = getFaltaReceber()

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

    // Reset form
    setNewPaymentValor("")
    setNewPaymentDate(new Date().toISOString().split("T")[0])
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  return (
    <div className="flex flex-col h-full overflow-auto pb-20">
      {/* Summary Card */}
      <div className="p-4 space-y-4">
        <Card
          className={cn(
            "border-2",
            faltaReceber > 0 ? "border-destructive bg-destructive/5" : "border-success bg-success/5"
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Falta Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-bold",
                faltaReceber > 0 ? "text-destructive" : "text-success"
              )}
            >
              {formatCurrency(faltaReceber)}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Total a receber</p>
                  <p className="font-semibold">{formatCurrency(totalValor)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-success" />
                <div>
                  <p className="text-muted-foreground">Total recebido</p>
                  <p className="font-semibold text-success">{formatCurrency(totalPago)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Payment Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Adicionar Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payment-date">Data</Label>
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
              <Label htmlFor="payment-metodo">Método</Label>
              <Select
                value={newPaymentMetodo}
                onValueChange={(v) => setNewPaymentMetodo(v as PaymentMethod)}
              >
                <SelectTrigger id="payment-metodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MBWay">MBWay</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAddPayment} className="w-full bg-success hover:bg-success/90 text-success-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pagamento
            </Button>
          </CardContent>
        </Card>

        {/* Payments List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground px-1">
            Histórico de Pagamentos
          </h3>

          {data.payments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum pagamento registado
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {data.payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.valor)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.date)} • {payment.metodo}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deletePayment(payment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
