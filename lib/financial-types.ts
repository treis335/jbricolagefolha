// lib/financial-types.ts

/**
 * SISTEMA FINANCEIRO - TIPOS E INTERFACES
 */

// ============================================================================
// Pagamentos
// ============================================================================

export type StatusPagamento = "pendente" | "pago" | "parcial" | "atrasado"
export type MetodoPagamento = "transferencia" | "dinheiro" | "cheque" | "mbway"
export type TipoRecibo = "recibo_verde" | "fatura" | "sem_recibo"

export interface Pagamento {
  id: string
  colaboradorNome: string
  colaboradorUid?: string
  periodo: string                  // "2026-02" (ano-mês)
  dataVencimento: string           // ISO date
  dataPagamento?: string           // ISO date (quando foi pago)
  
  // Valores
  horasTrabalhadas: number
  horasNormais: number
  horasExtras: number
  valorHoraNormal: number
  valorHoraExtra: number
  valorBruto: number               // Total antes de descontos
  descontos?: number               // Descontos aplicados
  valorLiquido: number             // Valor final a pagar
  valorPago: number                // Quanto já foi pago
  valorEmDivida: number            // Quanto falta pagar
  
  // Status e Documentação
  status: StatusPagamento
  metodoPagamento?: MetodoPagamento
  temRecibo: boolean
  tipoRecibo?: TipoRecibo
  numeroRecibo?: string
  ficheirRecibo?: string           // URL do ficheiro
  
  // Observações
  observacoes?: string
  criadoPor?: string               // UID do admin
  criadoEm: string                 // ISO timestamp
  atualizadoEm: string             // ISO timestamp
}

// ============================================================================
// Resumo Financeiro por Colaborador
// ============================================================================

export interface ResumoFinanceiroColaborador {
  colaboradorNome: string
  colaboradorUid?: string
  
  // Totais gerais
  totalGanho: number               // Tudo que já ganhou
  totalPago: number                // Tudo que já recebeu
  totalEmDivida: number            // Quanto a empresa deve
  
  // Período atual (mês corrente)
  periodoAtual: {
    mes: string                    // "2026-02"
    horasTrabalhadas: number
    valorAReceber: number
    status: StatusPagamento
  }
  
  // Últimos pagamentos
  ultimosPagamentos: Pagamento[]
  
  // Estatísticas
  mediaHorasPorMes: number
  mediaValorPorMes: number
  mesesComPagamentosAtrasados: number
  percentualRecibosEmitidos: number
}

// ============================================================================
// Materiais
// ============================================================================

export interface Material {
  id: string
  nome: string
  categoria?: string               // "Tintas", "Ferramentas", "Elétrico", etc.
  unidade?: string                 // "L", "kg", "m", "unidade", etc.
  precoUnitario?: number
  fornecedor?: string
  observacoes?: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface MaterialCategoria {
  id: string
  nome: string
  cor?: string                     // Cor para UI
  icone?: string                   // Nome do ícone lucide
}

// Categorias pré-definidas
export const CATEGORIAS_MATERIAIS: MaterialCategoria[] = [
  { id: "tintas", nome: "Tintas e Vernizes", cor: "#ef4444", icone: "Paintbrush" },
  { id: "ferramentas", nome: "Ferramentas", cor: "#f59e0b", icone: "Wrench" },
  { id: "eletrico", nome: "Elétrico", cor: "#eab308", icone: "Zap" },
  { id: "canalizacao", nome: "Canalização", cor: "#3b82f6", icone: "Droplet" },
  { id: "madeira", nome: "Madeira", cor: "#78350f", icone: "TreeDeciduous" },
  { id: "cimento", nome: "Cimento e Argamassa", cor: "#6b7280", icone: "Package" },
  { id: "outros", nome: "Outros", cor: "#8b5cf6", icone: "Box" },
]

// ============================================================================
// Uso de Material (tracking de gastos)
// ============================================================================

export interface UsoMaterial {
  id: string
  materialId: string
  materialNome: string
  quantidade: number
  unidade: string
  obraNome: string
  data: string                     // ISO date
  colaborador: string
  valorEstimado?: number
}

// ============================================================================
// Atividade do Dia (Live Feed)
// ============================================================================

export type TipoAtividade = 
  | "entrada_criada"
  | "entrada_editada"
  | "pagamento_registrado"
  | "recibo_enviado"
  | "material_usado"

export interface AtividadeDia {
  id: string
  tipo: TipoAtividade
  colaboradorNome: string
  colaboradorUid?: string
  timestamp: string                // ISO timestamp
  descricao: string                // Texto descritivo
  metadata?: {                     // Dados extras dependendo do tipo
    entryId?: string
    pagamentoId?: string
    materialId?: string
    obraNome?: string
    horas?: number
  }
}

// ============================================================================
// Relatórios
// ============================================================================

export type TipoRelatorioFinanceiro =
  | "colaborador-detalhado"
  | "obra-custos"
  | "periodo-financeiro"
  | "materiais-gastos"
  | "recibos-pendentes"

export interface RelatorioFinanceiro {
  id: string
  tipo: TipoRelatorioFinanceiro
  titulo: string
  geradoEm: string
  periodo?: {
    inicio: string
    fim: string
  }
  filtros?: Record<string, any>
  dados: any
  resumo: {
    totalHoras?: number
    totalValor?: number
    totalPago?: number
    totalPendente?: number
  }
}

// ============================================================================
// Dashboard Financeiro (Métricas)
// ============================================================================

export interface MetricasFinanceiras {
  // Valores totais
  totalAPagar: number              // Total pendente este mês
  totalPagoMesAtual: number        // Já pago este mês
  totalEmAtraso: number            // Pagamentos atrasados
  totalRecibosEmFalta: number      // Quantidade de recibos não enviados
  
  // Por categoria
  porColaborador: {
    nome: string
    valorPendente: number
    status: StatusPagamento
  }[]
  
  // Evolução
  evolucaoMensal: {
    mes: string
    totalPago: number
    totalHoras: number
  }[]
}