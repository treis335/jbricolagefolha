// lib/analytics.ts

import { DayEntry } from "./types"
import { 
  getColaboradorByNome, 
  getNomesColaboradores, 
  Colaborador,
  getColaboradoresAtivos 
} from "./colaboradores"
import {
  ColaboradorStats,
  ObraStats,
  PeriodoStats,
  RankingColaborador,
  RelatorioFiltros,
} from "./analytics-types"

// ============================================================================
// ANÁLISE POR COLABORADOR
// ============================================================================

/**
 * Calcula estatísticas completas de um colaborador específico
 */
export function getColaboradorStats(
  colaboradorNome: string,
  entries: DayEntry[],
  filtros?: RelatorioFiltros
): ColaboradorStats | null {
  const colaborador = getColaboradorByNome(colaboradorNome)
  if (!colaborador) return null

  // Filtra entries onde este colaborador participou
  let entriesDoColaborador = entries.filter(entry =>
    entry.equipa?.includes(colaboradorNome) ||
    entry.services?.some(s => s.equipa?.includes(colaboradorNome))
  )

  // Aplica filtros de data se fornecidos
  if (filtros?.dataInicio) {
    entriesDoColaborador = entriesDoColaborador.filter(
      e => e.date >= filtros.dataInicio!
    )
  }
  if (filtros?.dataFim) {
    entriesDoColaborador = entriesDoColaborador.filter(
      e => e.date <= filtros.dataFim!
    )
  }

  if (entriesDoColaborador.length === 0) {
    return {
      nome: colaboradorNome,
      uid: colaborador.uid,
      totalHoras: 0,
      horasNormais: 0,
      horasExtras: 0,
      diasTrabalhados: 0,
      obrasParticipadas: [],
      periodoInicio: "",
      periodoFim: "",
    }
  }

  // Calcula totais
  let totalHoras = 0
  let horasNormais = 0
  let horasExtras = 0
  const obrasSet = new Set<string>()

  entriesDoColaborador.forEach(entry => {
    // Se o serviço tem horas específicas por colaborador, usa isso
    // Senão, divide as horas totais do dia pela equipa
    const servicesDoColaborador = entry.services?.filter(s =>
      s.equipa?.includes(colaboradorNome)
    ) || []

    if (servicesDoColaborador.length > 0) {
      servicesDoColaborador.forEach(service => {
        if (service.totalHoras) {
          // Serviço tem horas específicas
          totalHoras += service.totalHoras
        } else {
          // Divide horas do dia pela equipa do serviço
          const equipaSize = service.equipa?.length || 1
          totalHoras += entry.totalHoras / equipaSize
        }

        if (service.obraNome) {
          obrasSet.add(service.obraNome)
        }
      })
    } else {
      // Fallback: divide horas totais do dia pela equipa geral
      const equipaSize = entry.equipa?.length || 1
      totalHoras += entry.totalHoras / equipaSize
    }

    // Acumula horas normais e extras (aproximação)
    const ratio = entry.totalHoras > 0 ? entry.normalHoras / entry.totalHoras : 0
    horasNormais += totalHoras * ratio
    horasExtras += totalHoras * (1 - ratio)
  })

  // Ordena datas
  const datas = entriesDoColaborador.map(e => e.date).sort()

  // Calcula valor estimado se colaborador tiver taxas definidas
  let valorTotalEstimado: number | undefined
  if (colaborador.taxaHoraNormal && colaborador.taxaHoraExtra) {
    valorTotalEstimado =
      horasNormais * colaborador.taxaHoraNormal +
      horasExtras * colaborador.taxaHoraExtra
  }

  return {
    nome: colaboradorNome,
    uid: colaborador.uid,
    totalHoras: Math.round(totalHoras * 100) / 100,
    horasNormais: Math.round(horasNormais * 100) / 100,
    horasExtras: Math.round(horasExtras * 100) / 100,
    diasTrabalhados: entriesDoColaborador.length,
    obrasParticipadas: Array.from(obrasSet).sort(),
    periodoInicio: datas[0],
    periodoFim: datas[datas.length - 1],
    valorTotalEstimado,
  }
}

/**
 * Calcula estatísticas de todos os colaboradores
 */
export function getTodosColaboradoresStats(
  entries: DayEntry[],
  filtros?: RelatorioFiltros
): ColaboradorStats[] {
  const nomes = getNomesColaboradores(filtros?.apenasAtivos !== false)
  
  return nomes
    .map(nome => getColaboradorStats(nome, entries, filtros))
    .filter((stat): stat is ColaboradorStats => stat !== null)
    .sort((a, b) => b.totalHoras - a.totalHoras)
}

// ============================================================================
// ANÁLISE POR OBRA
// ============================================================================

/**
 * Calcula estatísticas de uma obra específica
 */
export function getObraStats(
  nomeObra: string,
  entries: DayEntry[]
): ObraStats | null {
  // Filtra entries que mencionam esta obra
  const entriesDaObra = entries.filter(entry =>
    entry.services?.some(s => 
      s.obraNome?.toLowerCase().includes(nomeObra.toLowerCase())
    )
  )

  if (entriesDaObra.length === 0) return null

  let totalHoras = 0
  const colaboradoresSet = new Set<string>()
  const materiaisSet = new Set<string>()
  const datasSet = new Set<string>()

  entriesDaObra.forEach(entry => {
    const servicesRelevantes = entry.services?.filter(s =>
      s.obraNome?.toLowerCase().includes(nomeObra.toLowerCase())
    ) || []

    servicesRelevantes.forEach(service => {
      // Acumula horas
      totalHoras += service.totalHoras || entry.totalHoras

      // Acumula colaboradores
      service.equipa?.forEach(nome => colaboradoresSet.add(nome))

      // Acumula materiais
      service.materiais?.forEach(m => materiaisSet.add(m))
    })

    datasSet.add(entry.date)
  })

  const datas = Array.from(datasSet).sort()

  return {
    nomeObra,
    totalHoras: Math.round(totalHoras * 100) / 100,
    totalDias: datas.length,
    colaboradoresUnicos: Array.from(colaboradoresSet).sort(),
    materiaisUsados: Array.from(materiaisSet).sort(),
    dataInicio: datas[0],
    dataFim: datas[datas.length - 1],
  }
}

/**
 * Lista todas as obras únicas nos registos
 */
export function getTodasObras(entries: DayEntry[]): string[] {
  const obrasSet = new Set<string>()
  
  entries.forEach(entry => {
    entry.services?.forEach(service => {
      if (service.obraNome) {
        obrasSet.add(service.obraNome)
      }
    })
  })

  return Array.from(obrasSet).sort()
}

/**
 * Estatísticas de todas as obras
 */
export function getTodasObrasStats(entries: DayEntry[]): ObraStats[] {
  const obras = getTodasObras(entries)
  
  return obras
    .map(obra => getObraStats(obra, entries))
    .filter((stat): stat is ObraStats => stat !== null)
    .sort((a, b) => b.totalHoras - a.totalHoras)
}

// ============================================================================
// ANÁLISE POR PERÍODO
// ============================================================================

/**
 * Calcula estatísticas de um período específico
 */
export function getPeriodoStats(
  entries: DayEntry[],
  dataInicio: string,
  dataFim: string
): PeriodoStats {
  const entriesFiltradas = entries.filter(
    e => e.date >= dataInicio && e.date <= dataFim
  )

  let totalHoras = 0
  let horasNormais = 0
  let horasExtras = 0
  const colaboradoresSet = new Set<string>()
  const obrasSet = new Set<string>()

  entriesFiltradas.forEach(entry => {
    totalHoras += entry.totalHoras
    horasNormais += entry.normalHoras
    horasExtras += entry.extraHoras

    entry.equipa?.forEach(nome => colaboradoresSet.add(nome))
    entry.services?.forEach(s => {
      if (s.obraNome) obrasSet.add(s.obraNome)
    })
  })

  return {
    periodoInicio: dataInicio,
    periodoFim: dataFim,
    totalHoras: Math.round(totalHoras * 100) / 100,
    horasNormais: Math.round(horasNormais * 100) / 100,
    horasExtras: Math.round(horasExtras * 100) / 100,
    totalDias: entriesFiltradas.length,
    colaboradoresAtivos: colaboradoresSet.size,
    obrasAbertas: obrasSet.size,
  }
}

// ============================================================================
// RANKING E COMPARAÇÕES
// ============================================================================

/**
 * Gera ranking de colaboradores por produtividade
 */
export function getRankingColaboradores(
  entries: DayEntry[],
  filtros?: RelatorioFiltros
): RankingColaborador[] {
  const stats = getTodosColaboradoresStats(entries, filtros)
  
  // Calcula dias totais no período para consistência
  let diasTotais = 0
  if (filtros?.dataInicio && filtros?.dataFim) {
    const inicio = new Date(filtros.dataInicio)
    const fim = new Date(filtros.dataFim)
    diasTotais = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  } else {
    // Pega o range de todas as entries
    const datas = entries.map(e => e.date).sort()
    if (datas.length > 0) {
      const inicio = new Date(datas[0])
      const fim = new Date(datas[datas.length - 1])
      diasTotais = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  const ranking = stats
    .filter(s => s.totalHoras > 0)
    .map(stat => ({
      nome: stat.nome,
      totalHoras: stat.totalHoras,
      mediaDiaria: stat.diasTrabalhados > 0 
        ? Math.round((stat.totalHoras / stat.diasTrabalhados) * 100) / 100
        : 0,
      consistencia: diasTotais > 0
        ? Math.round((stat.diasTrabalhados / diasTotais) * 100)
        : 0,
    }))
    .sort((a, b) => b.totalHoras - a.totalHoras)
    .map((item, index) => ({
      posicao: index + 1,
      ...item,
    }))

  return ranking
}

// ============================================================================
// COMPARAÇÃO MENSAL/SEMANAL
// ============================================================================

/**
 * Agrupa entries por mês e retorna estatísticas
 */
export function getStatsPorMes(entries: DayEntry[]): Record<string, PeriodoStats> {
  const porMes: Record<string, DayEntry[]> = {}

  entries.forEach(entry => {
    const mesAno = entry.date.substring(0, 7) // "2026-02"
    if (!porMes[mesAno]) porMes[mesAno] = []
    porMes[mesAno].push(entry)
  })

  const resultado: Record<string, PeriodoStats> = {}

  Object.keys(porMes).forEach(mesAno => {
    const entriesDoMes = porMes[mesAno]
    const datas = entriesDoMes.map(e => e.date).sort()
    
    resultado[mesAno] = getPeriodoStats(
      entries,
      datas[0],
      datas[datas.length - 1]
    )
  })

  return resultado
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Formata número de horas para exibição
 */
export function formatHoras(horas: number): string {
  return `${horas.toFixed(1)}h`
}

/**
 * Formata valor monetário
 */
export function formatValor(valor: number): string {
  return `€${valor.toFixed(2)}`
}

/**
 * Calcula percentagem
 */
export function calcularPercentagem(parte: number, total: number): number {
  if (total === 0) return 0
  return Math.round((parte / total) * 100)
}