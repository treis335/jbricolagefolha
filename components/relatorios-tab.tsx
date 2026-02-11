"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FileText,
  Download,
  Calendar,
  Users,
  Building2,
  Clock,
  DollarSign,
  TrendingUp,
  Package,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart,
  Eye,
  Printer,
} from "lucide-react"

export function RelatoriosTab() {
  const [tipoRelatorio, setTipoRelatorio] = useState("colaborador")
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState("")
  const [obraSelecionada, setObraSelecionada] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")

  // Mock data
  const colaboradores = ["Rafael", "Tiago", "Leonardo", "Joel", "Agostinho"]
  const obras = [
    "Casa Sr. António - Telhado",
    "Loja Centro Comercial",
    "Vivenda Cascais",
    "Remodelação Escritório",
  ]

  const relatorioColaborador = {
    nome: "Rafael",
    periodo: "Fevereiro 2026",
    totalHoras: 168,
    horasNormais: 152,
    horasExtras: 16,
    diasTrabalhados: 21,
    valorBruto: 2288,
    valorPago: 2288,
    valorPendente: 0,
    obrasParticipadas: [
      {
        nome: "Casa Sr. António - Telhado",
        horas: 96,
        dias: 12,
      },
      {
        nome: "Vivenda Cascais",
        horas: 72,
        dias: 9,
      },
    ],
    materiais: [
      "Tinta Branca 15L",
      "Cimento Portland 25kg",
      "Cabo Elétrico 2.5mm",
    ],
    pagamentos: [
      {
        data: "2026-02-28",
        valor: 2288,
        metodo: "Transferência",
        status: "Pago",
      },
    ],
  }

  const relatorioObra = {
    nome: "Casa Sr. António - Telhado",
    periodo: "Janeiro - Fevereiro 2026",
    status: "Em Andamento",
    totalHoras: 456,
    totalDias: 38,
    custoMaoObra: 6840,
    custoMateriais: 1250,
    custoTotal: 8090,
    colaboradores: [
      {
        nome: "Rafael",
        horas: 96,
        valor: 1440,
      },
      {
        nome: "Frederico",
        horas: 88,
        valor: 1320,
      },
      {
        nome: "Tiago",
        horas: 104,
        valor: 1560,
      },
      {
        nome: "Leonardo",
        horas: 80,
        valor: 1200,
      },
      {
        nome: "Joel",
        horas: 88,
        valor: 1320,
      },
    ],
    materiaisUsados: [
      {
        nome: "Tinta Branca Premium 15L",
        quantidade: 12,
        valor: 551.88,
      },
      {
        nome: "Cimento Portland 25kg",
        quantidade: 48,
        valor: 408,
      },
      {
        nome: "Telhas Cerâmicas",
        quantidade: 200,
        valor: 290.12,
      },
    ],
    timeline: [
      {
        data: "2026-01-15",
        evento: "Início da Obra",
      },
      {
        data: "2026-02-01",
        evento: "Conclusão Fase 1 - Estrutura",
      },
      {
        data: "2026-02-15",
        evento: "Início Fase 2 - Acabamentos",
      },
    ],
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Tipo de Relatório */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            Gerar Relatório Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tipo de Relatório */}
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">Por Colaborador</SelectItem>
                  <SelectItem value="obra">Por Obra</SelectItem>
                  <SelectItem value="periodo">Por Período</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Colaborador (se tipo = colaborador) */}
            {tipoRelatorio === "colaborador" && (
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select value={colaboradorSelecionado} onValueChange={setColaboradorSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Obra (se tipo = obra) */}
            {tipoRelatorio === "obra" && (
              <div className="space-y-2">
                <Label>Obra</Label>
                <Select value={obraSelecionada} onValueChange={setObraSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {obras.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Data Início */}
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <BarChart3 className="h-4 w-4" />
              Gerar Relatório
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview do Relatório - Colaborador */}
      {tipoRelatorio === "colaborador" && (
        <div className="space-y-6">
          {/* Header do Relatório */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold">{relatorioColaborador.nome}</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Relatório de Atividades - {relatorioColaborador.periodo}
                  </p>
                </div>
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {relatorioColaborador.nome.charAt(0)}
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                  <Clock className="h-8 w-8 text-green-600 mb-2" />
                  <div className="text-2xl font-bold">{relatorioColaborador.totalHoras}h</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total Horas</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="text-2xl font-bold">{relatorioColaborador.diasTrabalhados}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Dias</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                  <Building2 className="h-8 w-8 text-orange-600 mb-2" />
                  <div className="text-2xl font-bold">{relatorioColaborador.obrasParticipadas.length}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Obras</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                  <DollarSign className="h-8 w-8 text-purple-600 mb-2" />
                  <div className="text-2xl font-bold">€{relatorioColaborador.valorBruto}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Valor Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribuição de Horas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Horas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Horas Normais</span>
                      <span className="text-sm font-bold">{relatorioColaborador.horasNormais}h</span>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full"
                        style={{
                          width: `${(relatorioColaborador.horasNormais / relatorioColaborador.totalHoras) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Horas Extras</span>
                      <span className="text-sm font-bold">{relatorioColaborador.horasExtras}h</span>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full"
                        style={{
                          width: `${(relatorioColaborador.horasExtras / relatorioColaborador.totalHoras) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Status Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Valor Bruto:</span>
                    <span className="font-bold text-lg">€{relatorioColaborador.valorBruto}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Valor Pago:</span>
                    <span className="font-bold text-lg text-green-600">€{relatorioColaborador.valorPago}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Pendente:</span>
                    <span className="font-bold text-lg text-orange-600">€{relatorioColaborador.valorPendente}</span>
                  </div>
                  <div className="pt-4 border-t">
                    {relatorioColaborador.valorPendente === 0 ? (
                      <Badge className="bg-green-500 w-full justify-center py-2">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Totalmente Pago
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-orange-500 text-white w-full justify-center py-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Pagamento Pendente
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Obras Participadas */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Obras Participadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {relatorioColaborador.obrasParticipadas.map((obra, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium">{obra.nome}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {obra.dias} dias trabalhados
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-indigo-600">{obra.horas}h</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview do Relatório - Obra */}
      {tipoRelatorio === "obra" && (
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold">{relatorioObra.nome}</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{relatorioObra.periodo}</p>
                </div>
                <Badge className="bg-blue-500 text-lg px-4 py-2">{relatorioObra.status}</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <Clock className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="text-2xl font-bold">{relatorioObra.totalHoras}h</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total Horas</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                  <Users className="h-8 w-8 text-green-600 mb-2" />
                  <div className="text-2xl font-bold">{relatorioObra.colaboradores.length}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Colaboradores</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                  <DollarSign className="h-8 w-8 text-purple-600 mb-2" />
                  <div className="text-2xl font-bold">€{relatorioObra.custoMaoObra}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Mão de Obra</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                  <Package className="h-8 w-8 text-orange-600 mb-2" />
                  <div className="text-2xl font-bold">€{relatorioObra.custoMateriais}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Materiais</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colaboradores */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Colaboradores na Obra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {relatorioObra.colaboradores.map((colab, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {colab.nome.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{colab.nome}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{colab.horas}h trabalhadas</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-green-600">€{colab.valor}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}