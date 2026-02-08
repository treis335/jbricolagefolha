// lib/colaboradores.ts
export interface Colaborador {
  nome: string
  // pin: string          ← REMOVIDO completamente
  // uid?: string         ← podemos adicionar depois, quando chegarmos à parte de conectar com users reais
  // email?: string       ← idem, para futura ligação
}

export const COLABORADORES: Colaborador[] = [
  { nome: "Agostinho"    },
  { nome: "Filipe"       },
  { nome: "Frederico"    },
  { nome: "Joel"         },
  { nome: "Leonardo"     },
  { nome: "Rafael"       },
  { nome: "Sibul"        },
  { nome: "Tiago"        },
  { nome: "Zé Vermelha"  },
  { nome: "Dario"        }, 
  { nome: "Guilherme"    }, 
  { nome: "Silvio"       }, 
]

// Funções auxiliares – atualizadas e limpas
export const getNomesColaboradores = () => 
  COLABORADORES.map(c => c.nome).sort()

// Removida completamente a função que usava PIN
// export const getColaboradorByPin = ... → já não existe

// Se quiseres adicionar funções futuras (ex: por nome, por UID), fica fácil
export const getColaboradorByNome = (nome: string): Colaborador | undefined => {
  return COLABORADORES.find(c => c.nome.toLowerCase() === nome.toLowerCase())
}