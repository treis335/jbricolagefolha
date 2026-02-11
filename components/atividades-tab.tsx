"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Activity,
  Clock,
  CheckCircle2,
  Edit,
  Upload,
  Package,
  RefreshCw,
  Calendar,
  Users,
  TrendingUp,
  Eye,
  Building2,
} from "lucide-react"

// Mock data - substituir com dados reais
const mockAtividades = [
  {
    id: "1",
    tipo: "entrada_criada",
    colaboradorNome: "Rafael",
    timestamp: "2026-02-11T14:35:00",
    descricao: "Registrou 8 horas de trabalho",
    metadata: {
      obraNome: "Casa Sr. António - Telhado",
      horas: 8,
    },
  },
  {
    id: "2",
    tipo: "entrada_editada",
    colaboradorNome: "Tiago",
    timestamp: "2026-02-11T13:20:00",
    descricao: "Editou entrada do dia 10/02",
    metadata: {
      obraNome: "Loja Centro Comercial",
      horas: 7.5,
    },
  },
  {
    id: "3",
    tipo: "recibo_enviado",
    colaboradorNome: "Leonardo",
    timestamp: "2026-02-11T12:15:00",
    descricao: "Enviou recibo verde RV-2026-045",
    metadata: {},
  },
  {
    id: "4",
    tipo: "material_usado",
    colaboradorNome: "Joel",
    timestamp: "2026-02-11T11:30:00",
    descricao: "Registrou uso de materiais",
    metadata: {
      obraNome: "Remodelação Escritório",
    },
  },
  {
    id: "5",
    tipo: "entrada_criada",
    colaboradorNome: "Agostinho",
    timestamp: "2026-02-11T10:45:00",
    descricao: "Registrou 8 horas de trabalho",
    metadata: {
      obraNome: "Vivenda Cascais",
      horas: 8,
    },
  },
  {
    id: "6",
    tipo: "entrada_criada",
    colaboradorNome: "Frederico",
    timestamp: "2026-02-11T09:20:00",
    descricao: "Registrou 8 horas de trabalho",
    metadata: {
      obraNome: "Casa Sr. António - Telhado",
      horas: 8,
    },
  },
]

export function AtividadesTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])

  const atividadesFiltradas = useMemo(() => {
    return mockAtividades.filter((ativ) =>
      ativ.timestamp.startsWith(selectedDate)
    )
  }, [selectedDate])

  // Estatísticas do dia
  const stats = useMemo(() => {
    const colaboradoresUnicos = new Set(atividadesFiltradas.map((a) => a.colaboradorNome))
    const obrasUnicas = new Set(
      atividadesFiltradas
        .filter((a) => a.metadata.obraNome)
        .map((a) => a.metadata.obraNome)
    )
    const totalHoras = atividadesFiltradas
      .filter((a) => a.metadata.horas)
      .reduce((sum, a) => sum + (a.metadata.horas || 0), 0)

    return {
      totalAtividades: atividadesFiltradas.length,
      colaboradoresAtivos: colaboradoresUnicos.size,
      obrasAbertas: obrasUnicas.size,
      totalHoras,
    }
  }, [atividadesFiltradas])

  const getAtividadeIcon = (tipo: string) => {
    const icons = {
      entrada_criada: CheckCircle2,
      entrada_editada: Edit,
      pagamento_registrado: Clock,
      recibo_enviado: Upload,
      material_usado: Package,
    }
    return icons[tipo as keyof typeof icons] || Activity
  }

  const getAtividadeCor = (tipo: string) => {
    const cores = {
      entrada_criada: "text-green-600 bg-green-100 dark:bg-green-900/20",
      entrada_editada: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
      pagamento_registrado: "text-purple-600 bg-purple-100 dark:bg-purple-900/20",
      recibo_enviado: "text-orange-600 bg-orange-100 dark:bg-orange-900/20",
      material_usado: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20",
    }
    return cores[tipo as keyof typeof cores] || "text-slate-600 bg-slate-100"
  }

  const formatTempo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Agora mesmo"
    if (diffMins < 60) return `Há ${diffMins}m`
    if (diffMins < 1440) return `Há ${Math.floor(diffMins / 60)}h`
    return date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-6">
      {/* KPIs do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{stats.totalAtividades}</div>
            <p className="text-green-100 text-sm mt-1">Atividades Hoje</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{stats.colaboradoresAtivos}</div>
            <p className="text-blue-100 text-sm mt-1">Colaboradores Ativos</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{stats.obrasAbertas}</div>
            <p className="text-orange-100 text-sm mt-1">Obras Ativas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{stats.totalHoras}h</div>
            <p className="text-purple-100 text-sm mt-1">Horas Registadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Feed */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-green-600" />
              Atividades em Tempo Real
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <Button size="sm" variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timeline de Atividades */}
          <div className="space-y-4">
            {atividadesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  Nenhuma atividade registada neste dia
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  As atividades aparecerão aqui quando os colaboradores fizerem registos
                </p>
              </div>
            ) : (
              atividadesFiltradas.map((ativ, index) => {
                const Icon = getAtividadeIcon(ativ.tipo)
                const corClasses = getAtividadeCor(ativ.tipo)

                return (
                  <div key={ativ.id} className="flex gap-4 items-start group">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${corClasses}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      {index < atividadesFiltradas.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-2" />
                      )}
                    </div>

                    {/* Conteúdo */}
                    <Card className="flex-1 border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-900">
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
                                  {ativ.colaboradorNome.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-sm">{ativ.colaboradorNome}</div>
                                <div className="text-xs text-slate-500">{formatTempo(ativ.timestamp)}</div>
                              </div>
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                              {ativ.descricao}
                            </p>

                            {ativ.metadata.obraNome && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  {ativ.metadata.obraNome}
                                </Badge>
                                {ativ.metadata.horas && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {ativ.metadata.horas}h
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })
            )}
          </div>

          {/* Resumo do Dia */}
          {atividadesFiltradas.length > 0 && (
            <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Resumo do Dia
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.totalHoras}h</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Total de Horas
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.colaboradoresAtivos}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Colaboradores
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.obrasAbertas}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Obras Ativas
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}