// lib/analytics-types.ts

import { DayEntry } from "./types"
import { Colaborador } from "./colaboradores"

/**
 * TIPOS PARA ANÁLISE DE DADOS E RELATÓRIOS ADMIN
 */

// ============================================================================
// Estatísticas por Colaborador
// ============================================================================

export interface ColaboradorStats {
  nome: string
  uid?: string
  totalHoras: number              // Total de horas trabalhadas
  horasNormais: number            // Horas normais
  horasExtras: number             // Horas extras
  diasTrabalhados: number         // Número de dias com registo
  obrasParticipadas: string[]     // Lista de obras únicas onde trabalhou
  periodoInicio: string           // Primeira data de trabalho (ISO)
  periodoFim: string              // Última data de trabalho (ISO)
  valorTotalEstimado?: number     // Se tiver taxa definida
}

// ============================================================================
// Estatísticas por Obra
// ============================================================================

export interface ObraStats {
  nomeObra: string
  totalHoras: number
  totalDias: number
  colaboradoresUnicos: string[]   // Nomes únicos que trabalharam
  materiaisUsados: string[]       // Todos os materiais únicos
  custoMateriais?: number         // Se implementar tracking de custos
  valorTotalMaoObra?: number      // Estimativa baseada em horas × taxas
  dataInicio: string              // Primeira entrada (ISO)
  dataFim: string                 // Última entrada (ISO)
}

// ============================================================================
// Estatísticas por Período
// ============================================================================

export interface PeriodoStats {
  periodoInicio: string
  periodoFim: string
  totalHoras: number
  horasNormais: number
  horasExtras: number
  totalDias: number
  colaboradoresAtivos: number
  obrasAbertas: number
}

// ============================================================================
// Ranking de Produtividade
// ============================================================================

export interface RankingColaborador {
  posicao: number
  nome: string
  totalHoras: number
  mediaDiaria: number             // Horas médias por dia trabalhado
  consistencia: number            // % de dias trabalhados no período
}

// ============================================================================
// Análise de Equipa
// ============================================================================

export interface EquipaAnalysis {
  data: string                    // Data ISO
  obra: string
  membros: string[]
  totalHoras: number
  horasPorMembro: { [nome: string]: number }
  eficiencia?: number             // Métrica customizada
}

// ============================================================================
// Filtros para Relatórios
// ============================================================================

export interface RelatorioFiltros {
  dataInicio?: string             // ISO date
  dataFim?: string                // ISO date
  colaboradores?: string[]        // Filtrar por nomes específicos
  obras?: string[]                // Filtrar por obras específicas
  apenasAtivos?: boolean          // Só colaboradores ativos
  apenasComConta?: boolean        // Só colaboradores com UID
  minHoras?: number               // Horas mínimas para incluir
}

// ============================================================================
// Tipos de Relatório Disponíveis
// ============================================================================

export type TipoRelatorio = 
  | "colaborador-individual"      // Detalhes de um colaborador específico
  | "todos-colaboradores"         // Resumo de todos
  | "obra-especifica"             // Detalhes de uma obra
  | "todas-obras"                 // Resumo de todas as obras
  | "periodo-comparativo"         // Compara períodos (mês a mês, etc)
  | "ranking-produtividade"       // Top performers
  | "equipa-eficiencia"           // Análise de equipas
  | "evolucao-temporal"           // Gráfico de evolução ao longo do tempo

// ============================================================================
// Resultado de Relatório
// ============================================================================

export interface RelatorioResult {
  tipo: TipoRelatorio
  geradoEm: string                // Timestamp ISO
  filtros: RelatorioFiltros
  dados: any                      // Específico ao tipo de relatório
  resumo: {
    totalRegistos: number
    totalHoras: number
    periodoAnalisado: string
  }
}