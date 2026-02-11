"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
} from "lucide-react"
import { StatusPagamento, MetodoPagamento, TipoRecibo } from "@/lib/financial-types"

// Mock data - você vai substituir isso com dados reais
const mockPagamentos = [
  {
    id: "1",
    colaboradorNome: "Rafael",
    periodo: "2026-02",
    dataVencimento: "2026-03-05",
    dataPagamento: "2026-03-01",
    horasTrabalhadas: 160,
    horasNormais: 152,
    horasExtras: 8,
    valorHoraNormal: 12.5,
    valorHoraExtra: 18.75,
    valorBruto: 2050,
    valorLiquido: 2050,
    valorPago: 2050,
    valorEmDivida: 0,
    status: "pago" as StatusPagamento,
    metodoPagamento: "transferencia" as MetodoPagamento,
    temRecibo: true,
    tipoRecibo: "recibo_verde" as TipoRecibo,
    numeroRecibo: "RV-2026-045",
  },
  {
    id: "2",
    colaboradorNome: "Tiago",
    periodo: "2026-02",
    dataVencimento: "2026-03-05",
    horasTrabalhadas: 152,
    horasNormais: 152,
    horasExtras: 0,
    valorHoraNormal: 11.5,
    valorHoraExtra: 17.25,
    valorBruto: 1748,
    valorLiquido: 1748,
    valorPago: 1000,
    valorEmDivida: 748,
    status: "parcial" as StatusPagamento,
    metodoPagamento: "transferencia" as MetodoPagamento,
    temRecibo: false,
  },
  {
    id: "3",
    colaboradorNome: "Leonardo",
    periodo: "2026-02",
    dataVencimento: "2026-03-05",
    horasTrabalhadas: 168,
    horasNormais: 152,
    horasExtras: 16,
    valorHoraNormal: 13.0,
    valorHoraExtra: 19.5,
    valorBruto: 2288,
    valorLiquido: 2288,
    valorPago: 0,
    valorEmDivida: 2288,
    status: "pendente" as StatusPagamento,
    temRecibo: false,
  },
]

export function FinanceiroTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [selectedPagamento, setSelectedPagamento] = useState<any>(null)
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false)
  const [showReciboDialog, setShowReciboDialog] = useState(false)

  // Filtrar pagamentos
  const pagamentosFiltrados = useMemo(() => {
    return mockPagamentos.filter((pag) => {
      const matchSearch = pag.colaboradorNome.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = statusFilter === "todos" || pag.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [searchQuery, statusFilter])

  // Calcular totais
  const totais = useMemo(() => {
    return pagamentosFiltrados.reduce(
      (acc, pag) => ({
        bruto: acc.bruto + pag.valorBruto,
        pago: acc.pago + pag.valorPago,
        pendente: acc.pendente + pag.valorEmDivida,
        horas: acc.horas + pag.horasTrabalhadas,
      }),
      { bruto: 0, pago: 0, pendente: 0, horas: 0 }
    )
  }, [pagamentosFiltrados])

  const getStatusBadge = (status: StatusPagamento) => {
    const configs = {
      pago: { variant: "default" as const, className: "bg-green-500 hover:bg-green-600", icon: CheckCircle2 },
      parcial: { variant: "secondary" as const, className: "bg-orange-500 hover:bg-orange-600 text-white", icon: Clock },
      pendente: { variant: "secondary" as const, className: "bg-blue-500 hover:bg-blue-600 text-white", icon: AlertCircle },
      atrasado: { variant: "destructive" as const, className: "", icon: AlertCircle },
    }
    const config = configs[status]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleRegistrarPagamento = (pagamento: any) => {
    setSelectedPagamento(pagamento)
    setShowPagamentoDialog(true)
  }

  const handleVerRecibo = (pagamento: any) => {
    setSelectedPagamento(pagamento)
    setShowReciboDialog(true)
  }

  return (
    <div className="space-y-6">
      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">€{totais.bruto.toFixed(2)}</div>
            <p className="text-blue-100 text-sm mt-1">Total Bruto</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">€{totais.pago.toFixed(2)}</div>
            <p className="text-green-100 text-sm mt-1">Total Pago</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-8 w-8 opacity-80" />
              <TrendingDown className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">€{totais.pendente.toFixed(2)}</div>
            <p className="text-orange-100 text-sm mt-1">Pendente</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 opacity-80" />
              <Calendar className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{totais.horas}h</div>
            <p className="text-purple-100 text-sm mt-1">Total Horas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              Gestão Financeira
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Novo Pagamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar colaborador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de Pagamentos */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900">
                  <TableHead className="font-semibold">Colaborador</TableHead>
                  <TableHead className="font-semibold">Período</TableHead>
                  <TableHead className="font-semibold text-right">Horas</TableHead>
                  <TableHead className="font-semibold text-right">Valor Bruto</TableHead>
                  <TableHead className="font-semibold text-right">Pago</TableHead>
                  <TableHead className="font-semibold text-right">Em Dívida</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Recibo</TableHead>
                  <TableHead className="font-semibold text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentosFiltrados.map((pag) => (
                  <TableRow key={pag.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {pag.colaboradorNome.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{pag.colaboradorNome}</div>
                          <div className="text-xs text-slate-500">
                            Venc: {new Date(pag.dataVencimento).toLocaleDateString("pt-PT")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {new Date(pag.periodo + "-01").toLocaleDateString("pt-PT", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">{pag.horasTrabalhadas}h</div>
                      <div className="text-xs text-slate-500">
                        {pag.horasNormais}n + {pag.horasExtras}e
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      €{pag.valorBruto.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600 font-semibold">
                        €{pag.valorPago.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={pag.valorEmDivida > 0 ? "text-orange-600 font-semibold" : "text-slate-400"}>
                        €{pag.valorEmDivida.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(pag.status)}</TableCell>
                    <TableCell className="text-center">
                      {pag.temRecibo ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerRecibo(pag)}
                          className="gap-2 text-green-600 hover:text-green-700"
                        >
                          <FileText className="h-4 w-4" />
                          {pag.numeroRecibo}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerRecibo(pag)}
                          className="gap-2 text-orange-600 hover:text-orange-700"
                        >
                          <Upload className="h-4 w-4" />
                          Enviar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRegistrarPagamento(pag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Registrar Pagamento */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento - {selectedPagamento?.colaboradorNome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor a Pagar</Label>
                <Input
                  type="number"
                  defaultValue={selectedPagamento?.valorEmDivida}
                  className="font-semibold text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select defaultValue="transferencia">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="mbway">MB WAY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Notas sobre este pagamento..." rows={3} />
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Valor Total:</span>
                <span className="font-semibold">€{selectedPagamento?.valorBruto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Já Pago:</span>
                <span className="text-green-600 font-semibold">€{selectedPagamento?.valorPago.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Em Dívida:</span>
                <span className="text-orange-600 font-semibold">€{selectedPagamento?.valorEmDivida.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoDialog(false)}>
              Cancelar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Recibo */}
      <Dialog open={showReciboDialog} onOpenChange={setShowReciboDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestão de Recibo - {selectedPagamento?.colaboradorNome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPagamento?.temRecibo ? (
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                  <FileText className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Recibo Disponível</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {selectedPagamento.tipoRecibo === "recibo_verde" && "Recibo Verde"}
                    {selectedPagamento.tipoRecibo === "fatura" && "Fatura"}
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    Nº {selectedPagamento.numeroRecibo}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto">
                    <Upload className="h-10 w-10 text-orange-600" />
                  </div>
                  <div className="font-semibold">Nenhum recibo enviado</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Faça upload do recibo para este pagamento
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Recibo</Label>
                  <Select defaultValue="recibo_verde">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recibo_verde">Recibo Verde</SelectItem>
                      <SelectItem value="fatura">Fatura</SelectItem>
                      <SelectItem value="sem_recibo">Sem Recibo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Número do Recibo</Label>
                  <Input placeholder="Ex: RV-2026-045" />
                </div>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm font-medium">Clique para fazer upload</div>
                  <div className="text-xs text-slate-500 mt-1">PDF, PNG, JPG até 5MB</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReciboDialog(false)}>
              Fechar
            </Button>
            {!selectedPagamento?.temRecibo && (
              <Button className="bg-green-600 hover:bg-green-700">
                Salvar Recibo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}