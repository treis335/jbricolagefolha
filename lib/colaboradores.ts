// lib/colaboradores.ts

/**
 * Colaborador: representa um trabalhador da empresa
 * 
 * - nome: identificador único visual (usado nas equipas)
 * - uid: Firebase User ID (quando o colaborador tem conta no sistema)
 * - email: para futura autenticação/notificações
 * - ativo: se está ativo na empresa (para filtrar relatórios)
 * - dataAdmissao: quando entrou (útil para filtros temporais)
 * - taxaHoraNormal: taxa por hora normal (para cálculos futuros)
 * - taxaHoraExtra: taxa por hora extra
 */
export interface Colaborador {
  nome: string                    // Identificador único (ex: "Rafael")
  uid?: string                    // Firebase UID (quando tem conta)
  email?: string                  // Email (para auth futura)
  ativo?: boolean                 // Se está ativo (default: true)
  dataAdmissao?: string           // ISO date (ex: "2024-01-15")
  taxaHoraNormal?: number         // €/hora normal
  taxaHoraExtra?: number          // €/hora extra
  cargo?: string                  // Ex: "Pedreiro", "Carpinteiro", "Eletricista"
  foto?: string                   // URL da foto de perfil
}

/**
 * Lista principal de colaboradores
 * Preencher UIDs à medida que os colaboradores criarem contas Firebase
 */
export const COLABORADORES: Colaborador[] = [
  { 
    nome: "Agostinho",
    // uid: "firebase-uid-agostinho", // Preencher quando criar conta
    ativo: true,
  },
  { 
    nome: "Filipe",
    // uid: "firebase-uid-filipe",
    ativo: true,
  },
  { 
    nome: "Frederico",
    // uid: "firebase-uid-frederico",
    ativo: true,
  },
  { 
    nome: "Joel",
    // uid: "firebase-uid-joel",
    ativo: true,
  },
  { 
    nome: "Leonardo",
    // uid: "firebase-uid-leonardo",
    ativo: true,
  },
  { 
    nome: "Rafael",
    // uid: "firebase-uid-rafael",
    ativo: true,
  },
  { 
    nome: "Sibul",
    // uid: "firebase-uid-sibul",
    ativo: true,
  },
  { 
    nome: "Tiago",
    // uid: "firebase-uid-tiago",
    ativo: true,
  },
  { 
    nome: "Zé Vermelha",
    // uid: "firebase-uid-ze",
    ativo: true,
  },
  { 
    nome: "Dario",
    // uid: "firebase-uid-dario",
    ativo: true,
  },
  { 
    nome: "Guilherme",
    // uid: "firebase-uid-guilherme",
    ativo: true,
  },
  { 
    nome: "Silvio",
    // uid: "firebase-uid-silvio",
    ativo: true,
  },
]

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Retorna lista de nomes de colaboradores (para dropdowns, selects, etc.)
 */
export const getNomesColaboradores = (incluirInativos = false): string[] => {
  return COLABORADORES
    .filter(c => incluirInativos || c.ativo !== false)
    .map(c => c.nome)
    .sort()
}

/**
 * Busca colaborador por nome (case-insensitive)
 */
export const getColaboradorByNome = (nome: string): Colaborador | undefined => {
  return COLABORADORES.find(
    c => c.nome.toLowerCase() === nome.toLowerCase()
  )
}

/**
 * Busca colaborador por Firebase UID
 */
export const getColaboradorByUid = (uid: string): Colaborador | undefined => {
  return COLABORADORES.find(c => c.uid === uid)
}

/**
 * Retorna colaboradores que têm conta Firebase (têm UID)
 */
export const getColaboradoresComConta = (): Colaborador[] => {
  return COLABORADORES.filter(c => c.uid !== undefined)
}

/**
 * Retorna colaboradores sem conta Firebase (ainda não registados)
 */
export const getColaboradoresSemConta = (): Colaborador[] => {
  return COLABORADORES.filter(c => c.uid === undefined)
}

/**
 * Verifica se um nome existe na lista de colaboradores
 */
export const isColaboradorValido = (nome: string): boolean => {
  return getColaboradorByNome(nome) !== undefined
}

/**
 * Retorna colaboradores ativos
 */
export const getColaboradoresAtivos = (): Colaborador[] => {
  return COLABORADORES.filter(c => c.ativo !== false)
}