"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Euro, CheckCircle2, Clock, AlertCircle, Plus, Eye, FileDown,
  DollarSign, LayoutGrid, Table as TableIcon, AlertTriangle,
  Trash2,
} from "lucide-react"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"

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

export function AdminFinanceView() {
  const { collaborators, loading, error, refetch } = useCollaborators()
  const router = useRouter()

  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    if (typeof window === "undefined") return "cards"
    const saved = localStorage.getItem(VIEW_MODE_KEY) as "cards" | "table" | null
    return saved || "cards"
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCollab, setSelectedCollab] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedMethod, setSelectedMethod] = useState("transferencia")
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [historyData, setHistoryData] = useState<MonthSummary[]>([])

  const currentMonthKey = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      localStorage.setItem(VIEW_MODE_KEY, viewMode)
    }
  }, [viewMode])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode !== "cards") setViewMode("cards")
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [viewMode])

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
          if (!monthMap.has(periodo)) {
            monthMap.set(periodo, { periodo, hours: 0, cost: 0, paid: 0, pending: 0, payments: [] })
          }
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

        let allMonths = Array.from(monthMap.values())
        allMonths.sort((a, b) => a.periodo.localeCompare(b.periodo))

        let paymentIdx = 0
        let remainingPayment = 0
        for (const m of allMonths) {
          let remaining = m.cost
          while (remaining > 0 && (paymentIdx < payments.length || remainingPayment > 0)) {
            if (remainingPayment <= 0 && paymentIdx < payments.length) {
              remainingPayment = payments[paymentIdx].valor || 0
            }
            if (remainingPayment > 0) {
              const apply = Math.min(remaining, remainingPayment)
              m.paid += apply
              remaining -= apply
              remainingPayment -= apply
              if (remainingPayment <= 0) {
                paymentIdx++
                remainingPayment = 0
              }
            } else break
          }
          m.pending = Math.max(0, m.cost - m.paid)
          m.payments = monthPaymentsMap.get(m.periodo) || []
        }

        const currentMonthData = allMonths.find(m => m.periodo === currentMonthKey) || {
          periodo: currentMonthKey, hours: 0, cost: 0, paid: 0, pending: 0, payments: []
        }

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

  const totals = useMemo(() => {
    const totalCost = financeData.reduce((sum, f) => sum + f.thisMonthCost, 0)
    const totalPaid = financeData.reduce((sum, f) => sum + f.thisMonthPaid, 0)
    const totalPending = financeData.reduce((sum, f) => sum + f.totalPendingAll, 0)
    const overdueTotal = financeData.reduce((sum, f) => sum + f.overdueAmount, 0)
    const withOverdue = financeData.filter(f => f.overdueAmount > 0).length

    return { totalCost, totalPaid, totalPending, overdueTotal, withOverdue }
  }, [financeData])

  const getStatusBadge = (status: string) => {
    const map: any = {
      pago: { color: "bg-green-600", icon: CheckCircle2, text: "Pago" },
      pendente: { color: "bg-amber-600", icon: AlertCircle, text: "Pendente" },
      atrasado: { color: "bg-red-600", icon: AlertTriangle, text: "Atrasado" },
      sem_atividade: { color: "bg-gray-500", icon: null, text: "Sem atividade" },
    }
    const c = map[status] || map.sem_atividade
    const Icon = c.icon
    return (
      <Badge className={`${c.color} text-white`}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {c.text}
      </Badge>
    )
  }

  const getDefaultMethod = (id: string) => localStorage.getItem(`defaultPaymentMethod_${id}`) || "transferencia"
  const saveDefaultMethod = (id: string, method: string) => {
    localStorage.setItem(`defaultPaymentMethod_${id}`, method)
  }

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
    if (!selectedCollab || paymentAmount <= 0) {
      alert("Insere um valor válido.")
      return
    }

    const newPayment = {
      id: `admin_${Date.now()}`,
      date: paymentDate,
      valor: Number(paymentAmount),
      metodo: selectedMethod,
      source: "admin",
    }

    try {
      const userRef = doc(db, "users", selectedCollab.collaboratorId)
      await updateDoc(userRef, {
        "workData.payments": arrayUnion(newPayment),
      })

      alert(`Pagamento de ${paymentAmount.toFixed(2)} € registado com sucesso!`)
      saveDefaultMethod(selectedCollab.collaboratorId, selectedMethod)
      setShowPagamentoDialog(false)
      refetch()
    } catch (err) {
      console.error(err)
      alert("Erro ao guardar pagamento.")
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedCollab) return

    try {
      const userRef = doc(db, "users", selectedCollab.collaboratorId)
      await updateDoc(userRef, {
        "workData.payments": arrayRemove({ id: paymentId }),
      })

      alert("Pagamento eliminado com sucesso!")
      refetch()
    } catch (err) {
      console.error("Erro ao eliminar pagamento:", err)
      alert("Erro ao eliminar pagamento. Verifica a consola.")
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768
  const effectiveViewMode = isMobile ? "cards" : viewMode

  return (
    <ScrollArea className="h-full">
      <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mb-4">
            <Euro className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão Financeira</h1>
          <p className="text-muted-foreground mt-2">Valores reais • FIFO • Pagamentos por colaborador</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="p-6">
              <DollarSign className="h-8 w-8 text-blue-600 mb-3" />
              <p className="text-3xl font-bold">{totals.totalCost.toFixed(2)} €</p>
              <p className="text-sm text-blue-600">Custo Mês Atual</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="p-6">
              <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
              <p className="text-3xl font-bold">{totals.totalPaid.toFixed(2)} €</p>
              <p className="text-sm text-green-600">Pago Mês Atual</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
            <CardContent className="p-6">
              <AlertCircle className="h-8 w-8 text-amber-600 mb-3" />
              <p className="text-3xl font-bold text-amber-600">{totals.totalPending.toFixed(2)} €</p>
              <p className="text-sm text-amber-600">Total Pendente</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
            <CardContent className="p-6">
              <AlertTriangle className="h-8 w-8 text-red-600 mb-3" />
              <p className="text-3xl font-bold text-red-600">{totals.overdueTotal.toFixed(2)} €</p>
              <p className="text-sm text-red-600">{totals.withOverdue} em atraso</p>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Input
            placeholder="Buscar colaborador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => alert("Exportar relatório")}>
              <FileDown className="h-4 w-4 mr-2" /> Exportar
            </Button>

            {!isMobile && (
              <div className="flex border rounded-lg p-1 bg-card">
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" /> Cards
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <TableIcon className="h-4 w-4 mr-2" /> Tabela
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Vista principal */}
        {effectiveViewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {financeData.map((f) => (
              <Card key={f.collaboratorId} className="overflow-hidden border-l-4 shadow-sm"
                style={{ borderLeftColor: f.overdueAmount > 0 ? '#dc2626' : f.totalPendingAll > 0 ? '#f59e0b' : '#10b981' }}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle className="text-xl">{f.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{f.email}</p>
                    </div>
                    {getStatusBadge(f.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <p className="uppercase text-xs tracking-widest text-muted-foreground mb-3">MÊS ATUAL • {currentMonthKey}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div>Horas</div><div className="text-right font-semibold">{f.totalHoursThisMonth.toFixed(1)}h</div>
                      <div>Custo</div><div className="text-right font-semibold text-blue-600">{f.thisMonthCost.toFixed(2)} €</div>
                      <div>Pago este mês</div><div className="text-right font-semibold text-green-600">{f.thisMonthPaid.toFixed(2)} €</div>
                      <div>Pendente este mês</div><div className="text-right font-semibold text-amber-600">{f.thisMonthPending.toFixed(2)} €</div>
                    </div>
                  </div>

                  <div className="pt-5 border-t">
                    <div className="flex justify-between items-end">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">TOTAL A RECEBER</p>
                      <p className="text-4xl font-bold text-amber-600">{f.totalPendingAll.toFixed(2)} €</p>
                    </div>
                    {f.overdueAmount > 0 && (
                      <div className="mt-2 text-red-600 text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> {f.overdueAmount.toFixed(2)} € em atraso
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => router.push(`/admin/collaborator/${f.collaboratorId}`)}>
                      <Eye className="h-4 w-4 mr-2" /> Detalhes
                    </Button>
                    <Button className="flex-1" onClick={() => handleRegistarPagamento(f)} disabled={f.totalPendingAll === 0}>
                      <Plus className="h-4 w-4 mr-2" /> Pagar
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => openHistory(f)}>
                    Ver histórico completo →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Horas Atual</TableHead>
                    <TableHead className="text-right">Custo Atual</TableHead>
                    <TableHead className="text-right">Pago Atual</TableHead>
                    <TableHead className="text-right">Pendente Atual</TableHead>
                    <TableHead className="text-right">Em Atraso</TableHead>
                    <TableHead className="text-right font-bold">Total a Receber</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeData.map((f) => (
                    <TableRow key={f.collaboratorId}>
                      <TableCell>
                        <div className="font-semibold">{f.name}</div>
                        <div className="text-sm text-muted-foreground">{f.email}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{f.totalHoursThisMonth.toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-blue-600">{f.thisMonthCost.toFixed(2)} €</TableCell>
                      <TableCell className="text-right text-green-600">{f.thisMonthPaid.toFixed(2)} €</TableCell>
                      <TableCell className="text-right text-amber-600">{f.thisMonthPending.toFixed(2)} €</TableCell>
                      <TableCell className="text-right">
                        {f.overdueAmount > 0 ? <span className="text-red-600 font-medium">{f.overdueAmount.toFixed(2)} €</span> : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-700">{f.totalPendingAll.toFixed(2)} €</TableCell>
                      <TableCell>{getStatusBadge(f.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/collaborator/${f.collaboratorId}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={() => handleRegistarPagamento(f)} disabled={f.totalPendingAll === 0}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openHistory(f)}>Histórico</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Histórico */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Histórico Completo — {selectedCollab?.name}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4">
            {historyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Sem registos</p>
            ) : (
              <div className="space-y-8">
                {historyData.map((m) => (
                  <div key={m.periodo} className="border rounded-xl p-6 bg-card shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="font-semibold text-xl">
                        {new Date(m.periodo + "-01").toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
                      </h3>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-amber-700">{m.pending.toFixed(2)} €</div>
                        <div className="text-sm text-muted-foreground">pendente</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6 mb-6 text-base">
                      <div><span className="text-muted-foreground">Horas:</span> <span className="font-semibold">{m.hours.toFixed(1)}h</span></div>
                      <div><span className="text-muted-foreground">Custo:</span> <span className="font-semibold">{m.cost.toFixed(2)} €</span></div>
                      <div><span className="text-muted-foreground">Pago:</span> <span className="font-semibold text-green-700">{m.paid.toFixed(2)} €</span></div>
                      <div><span className="text-muted-foreground">Pendente:</span> <span className="font-semibold text-amber-700">{m.pending.toFixed(2)} €</span></div>
                    </div>

                    {m.payments.length > 0 && (
                      <div>
                        <p className="text-sm uppercase tracking-wider text-muted-foreground mb-4 font-medium">Pagamentos Realizados</p>
                        <div className="space-y-3">
                          {m.payments.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-5 py-3.5">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="text-base font-medium">{p.valor.toFixed(2)} €</div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(p.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {p.metodo}
                                </Badge>
                                {p.source === "admin" ? (
                                  <Badge className="bg-blue-600 text-white text-xs">
                                    Admin
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    Colaborador
                                  </Badge>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeletePayment(p.id)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHistoryDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Registar Pagamento */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registar Pagamento — {selectedCollab?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label>Valor a pagar</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="text-3xl font-bold mt-1"
              />
            </div>

            {selectedCollab?.overdueAmount > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 p-4 rounded-xl text-red-700 text-sm">
                <AlertTriangle className="inline h-5 w-5 mr-2" />
                <strong>{selectedCollab.overdueAmount.toFixed(2)} € em atraso</strong> de meses anteriores.
              </div>
            )}

            <div>
              <Label>Data do pagamento</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Método de pagamento</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="mbway">MB WAY</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmPagamento} className="bg-green-600 hover:bg-green-700">
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}