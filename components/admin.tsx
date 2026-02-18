"use client"

import { useState, useMemo } from "react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import {
  getTodosColaboradoresStats,
  getTodasObrasStats,
  getRankingColaboradores,
  getStatsPorMes,
  formatHoras,
  calcularPercentagem,
} from "@/lib/analytics"
import { FinanceiroTab } from "./financeiro-tab"
import { MateriaisTab } from "./materiais-tab"
import { AtividadesTab } from "./atividades-tab"
import { RelatoriosTab } from "./relatorios-tab"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Users,
  Building2,
  Clock,
  Award,
  Calendar,
  DollarSign,
  MapPin,
  BarChart3,
  Activity,
  Target,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  Phone,
  FileText,
  Euro,
  Package,
  Wrench,
  FileBarChart,
} from "lucide-react"

export function AdminDashboard() {
  const { data } = useWorkTracker()
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Estatísticas calculadas
  const statsColaboradores = useMemo(() => {
    return getTodosColaboradoresStats(data.entries, {
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    })
  }, [data.entries, dataInicio, dataFim])

  const statsObras = useMemo(() => {
    return getTodasObrasStats(data.entries)
  }, [data.entries])

  const ranking = useMemo(() => {
    return getRankingColaboradores(data.entries, {
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    })
  }, [data.entries, dataInicio, dataFim])

  const statsPorMes = useMemo(() => {
    return getStatsPorMes(data.entries)
  }, [data.entries])

  const totaisGerais = useMemo(() => {
    const total = statsColaboradores.reduce(
      (acc, stat) => ({
        horas: acc.horas + stat.totalHoras,
        horasNormais: acc.horasNormais + stat.horasNormais,
        horasExtras: acc.horasExtras + stat.horasExtras,
        valor: acc.valor + (stat.valorTotalEstimado || 0),
      }),
      { horas: 0, horasNormais: 0, horasExtras: 0, valor: 0 }
    )
    return total
  }, [statsColaboradores])

  const colaboradoresFiltrados = useMemo(() => {
    if (!searchQuery) return statsColaboradores
    return statsColaboradores.filter(c =>
      c.nome.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [statsColaboradores, searchQuery])

  const mesAtual = new Date().toISOString().substring(0, 7)
  const mesAnterior = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toISOString()
    .substring(0, 7)

  const statsMesAtual = statsPorMes[mesAtual]
  const statsMesAnterior = statsPorMes[mesAnterior]

  const crescimentoHoras = statsMesAtual && statsMesAnterior
    ? ((statsMesAtual.totalHoras - statsMesAnterior.totalHoras) / statsMesAnterior.totalHoras) * 100
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard Administrativo
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Visão completa do negócio em tempo real
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button size="sm" className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <FileText className="h-4 w-4" />
                Novo Relatório
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filtros */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-indigo-600" />
                Filtros Avançados
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDataInicio("")
                  setDataFim("")
                  setSearchQuery("")
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Data Início
                </label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Data Fim
                </label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pesquisar
                </label>
                <Input
                  placeholder="Buscar colaborador, obra..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card className="border-0 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {crescimentoHoras > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(crescimentoHoras).toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl lg:text-4xl font-bold">{formatHoras(totaisGerais.horas)}</div>
              <p className="text-white/80 text-sm mt-2">Total de Horas</p>
              <p className="text-white/60 text-xs mt-1">
                {formatHoras(totaisGerais.horasNormais)} normais · {formatHoras(totaisGerais.horasExtras)} extras
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 bg-gradient-to-br from-blue-500 to-cyan-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <CheckCircle2 className="h-5 w-5 text-white/80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl lg:text-4xl font-bold">{statsColaboradores.length}</div>
              <p className="text-white/80 text-sm mt-2">Colaboradores</p>
              <p className="text-white/60 text-xs mt-1">
                {statsColaboradores.filter(s => s.diasTrabalhados > 0).length} ativos este período
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 bg-gradient-to-br from-orange-500 to-red-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                <Activity className="h-5 w-5 text-white/80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl lg:text-4xl font-bold">{statsObras.length}</div>
              <p className="text-white/80 text-sm mt-2">Obras em Curso</p>
              <p className="text-white/60 text-xs mt-1">
                {data.entries.length} dias registados
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-green-200/50 dark:shadow-green-900/30 bg-gradient-to-br from-green-500 to-emerald-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
                <Target className="h-5 w-5 text-white/80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl lg:text-4xl font-bold">
                {totaisGerais.valor > 0 ? `€${totaisGerais.valor.toFixed(0)}` : "---"}
              </div>
              <p className="text-white/80 text-sm mt-2">Valor Estimado</p>
              <p className="text-white/60 text-xs mt-1">
                Baseado em taxas horárias
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com todas as seções */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-9 gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-2 rounded-xl border-0 shadow-lg overflow-x-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="colaboradores" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Colaboradores
            </TabsTrigger>
            <TabsTrigger value="obras" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-2" />
              Obras
            </TabsTrigger>
            <TabsTrigger value="ranking" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-orange-600 data-[state=active]:text-white">
              <Award className="h-4 w-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="mensal" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-2" />
              Mensal
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white">
              <Euro className="h-4 w-4 mr-2" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="materiais" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-yellow-600 data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-2" />
              Materiais
            </TabsTrigger>
            <TabsTrigger value="atividades" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white">
              <Wrench className="h-4 w-4 mr-2" />
              Atividades
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <FileBarChart className="h-4 w-4 mr-2" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-600" />
                    Top 5 Colaboradores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ranking.slice(0, 5).map((item, idx) => (
                      <div key={item.nome} className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${
                          idx === 0 ? 'text-yellow-500' :
                          idx === 1 ? 'text-slate-400' :
                          idx === 2 ? 'text-orange-600' :
                          'text-slate-300'
                        }`}>
                          {idx === 0 && "🥇"}
                          {idx === 1 && "🥈"}
                          {idx === 2 && "🥉"}
                          {idx > 2 && `#${item.posicao}`}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{item.nome}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {formatHoras(item.totalHoras)} · Média {formatHoras(item.mediaDiaria)}/dia
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {item.consistencia}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-600" />
                    Obras Mais Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statsObras.slice(0, 5).map((obra) => (
                      <div key={obra.nomeObra} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium truncate flex-1">{obra.nomeObra}</div>
                          <div className="text-sm font-semibold text-indigo-600">
                            {formatHoras(obra.totalHoras)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {obra.colaboradoresUnicos.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {obra.totalDias} dias
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full"
                            style={{
                              width: `${Math.min(100, (obra.totalHoras / totaisGerais.horas) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Evolução Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(statsPorMes)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 6)
                    .map(([mes, stat]) => {
                      const mesNome = new Date(mes + "-01").toLocaleDateString("pt-PT", {
                        month: "long",
                        year: "numeric",
                      })
                      return (
                        <div key={mes} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium capitalize">{mesNome}</div>
                            <div className="text-sm font-semibold text-indigo-600">
                              {formatHoras(stat.totalHoras)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                            <span>{stat.totalDias} dias</span>
                            <span>{stat.colaboradoresAtivos} colaboradores</span>
                            <span>{stat.obrasAbertas} obras</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (stat.totalHoras / Math.max(...Object.values(statsPorMes).map(s => s.totalHoras))) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Colaboradores */}
          <TabsContent value="colaboradores" className="space-y-6">
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Todos os Colaboradores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {colaboradoresFiltrados.map((stat) => (
                    <Card key={stat.nome} className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{stat.nome}</h3>
                            {stat.uid && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Conta ativa
                              </Badge>
                            )}
                          </div>
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-xl">
                            {stat.nome.charAt(0)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Total Horas</span>
                            <span className="font-bold text-indigo-600">{formatHoras(stat.totalHoras)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Dias Trabalhados</span>
                            <span className="font-semibold">{stat.diasTrabalhados}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Obras</span>
                            <span className="font-semibold">{stat.obrasParticipadas.length}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                            <span>Normal: {formatHoras(stat.horasNormais)}</span>
                            <span>Extra: {formatHoras(stat.horasExtras)}</span>
                          </div>
                        </div>

                        {stat.valorTotalEstimado && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-center">
                              <div className="text-xs text-slate-600 dark:text-slate-400">Valor Estimado</div>
                              <div className="text-lg font-bold text-green-600">
                                €{stat.valorTotalEstimado.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Phone className="h-3 w-3 mr-1" />
                            Contato
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <FileText className="h-3 w-3 mr-1" />
                            Relatório
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Obras */}
          <TabsContent value="obras" className="space-y-6">
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Todas as Obras</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statsObras.map((obra) => (
                    <Card key={obra.nomeObra} className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{obra.nomeObra}</h3>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatHoras(obra.totalHoras)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {obra.totalDias} dias
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {obra.colaboradoresUnicos.length} colaboradores
                              </span>
                            </div>
                            <div className="mt-3 text-xs text-slate-500">
                              {new Date(obra.dataInicio).toLocaleDateString("pt-PT")} até{" "}
                              {new Date(obra.dataFim).toLocaleDateString("pt-PT")}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-3xl font-bold text-orange-600">
                              {formatHoras(obra.totalHoras)}
                            </div>
                            <Button size="sm" variant="outline">
                              Ver Detalhes
                            </Button>
                          </div>
                        </div>

                        {obra.colaboradoresUnicos.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Equipa:</div>
                            <div className="flex flex-wrap gap-2">
                              {obra.colaboradoresUnicos.map((nome) => (
                                <Badge key={nome} variant="secondary">
                                  {nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranking */}
          <TabsContent value="ranking" className="space-y-6">
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-yellow-600" />
                  Ranking de Produtividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ranking.map((item) => (
                    <div
                      key={item.nome}
                      className={`p-4 rounded-xl border transition-all ${
                        item.posicao === 1
                          ? "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-300 dark:border-yellow-800"
                          : item.posicao === 2
                          ? "bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-slate-950/20 dark:to-zinc-950/20 border-slate-300 dark:border-slate-700"
                          : item.posicao === 3
                          ? "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-300 dark:border-orange-800"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold w-12 text-center">
                          {item.posicao === 1 && "🥇"}
                          {item.posicao === 2 && "🥈"}
                          {item.posicao === 3 && "🥉"}
                          {item.posicao > 3 && `#${item.posicao}`}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{item.nome}</div>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                            <span>Total: {formatHoras(item.totalHoras)}</span>
                            <span>Média: {formatHoras(item.mediaDiaria)}/dia</span>
                            <span>Consistência: {item.consistencia}%</span>
                          </div>
                        </div>
                        <div className="hidden lg:block">
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="text-2xl font-bold">{item.posicao}</div>
                              <div className="text-[10px]">POS</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mensal */}
          <TabsContent value="mensal" className="space-y-6">
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-green-600" />
                  Análise Mensal Detalhada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(statsPorMes)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([mes, stat]) => {
                      const mesNome = new Date(mes + "-01").toLocaleDateString("pt-PT", {
                        month: "long",
                        year: "numeric",
                      })
                      const percentExtra = calcularPercentagem(stat.horasExtras, stat.totalHoras)

                      return (
                        <Card key={mes} className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-xl capitalize">{mesNome}</h3>
                              <Badge variant="secondary" className="text-lg px-4 py-1">
                                {formatHoras(stat.totalHoras)}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-900">
                                <div className="text-2xl font-bold text-indigo-600">{stat.totalDias}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Dias</div>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-900">
                                <div className="text-2xl font-bold text-blue-600">{stat.colaboradoresAtivos}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Colaboradores</div>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-900">
                                <div className="text-2xl font-bold text-orange-600">{stat.obrasAbertas}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Obras</div>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-900">
                                <div className="text-2xl font-bold text-green-600">{percentExtra}%</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Horas Extra</div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Horas Normais</span>
                                <span className="font-semibold">{formatHoras(stat.horasNormais)}</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full"
                                  style={{ width: `${100 - percentExtra}%` }}
                                />
                              </div>

                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Horas Extras</span>
                                <span className="font-semibold">{formatHoras(stat.horasExtras)}</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full"
                                  style={{ width: `${percentExtra}%` }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financeiro" className="space-y-6">
            <FinanceiroTab />
          </TabsContent>

          {/* Materiais */}
          <TabsContent value="materiais" className="space-y-6">
            <MateriaisTab />
          </TabsContent>

          {/* Atividades */}
          <TabsContent value="atividades" className="space-y-6">
            <AtividadesTab />
          </TabsContent>

          {/* Relatórios */}
          <TabsContent value="relatorios" className="space-y-6">
            <RelatoriosTab />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600 dark:text-slate-400 py-8">
          <p>Dashboard Administrativo · J.Bricolage</p>
          <p className="text-xs mt-1">Última atualização: {new Date().toLocaleString("pt-PT")}</p>
        </div>
      </div>
    </div>
  )
}