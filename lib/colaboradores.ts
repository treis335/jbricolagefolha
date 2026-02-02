// lib/colaboradores.ts

// lib/colaboradores.ts
export interface Colaborador {
  nome: string
  pin: string          // PIN secreto (4 dígitos ou string)
}

export const COLABORADORES: Colaborador[] = [
  { nome: "Agostinho", pin: "1001" },
  { nome: "Filipe",    pin: "1010" },
  { nome: "Frederico", pin: "1020" },
  { nome: "Joel",      pin: "1030" },
  { nome: "Leonardo",  pin: "1040" },
  { nome: "Rafael",    pin: "1050" },
  { nome: "Sibul",     pin: "1060" },
  { nome: "Tiago",     pin: "1070" },
  { nome: "Zé Vermelha", pin: "1080" },
]

// Funções auxiliares
export const getNomesColaboradores = () => COLABORADORES.map(c => c.nome).sort()

export const getColaboradorByPin = (pin: string): Colaborador | undefined => {
  return COLABORADORES.find(c => c.pin === pin)
}