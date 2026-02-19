// lib/types.ts

import { v4 as uuidv4 } from "uuid"

// Tipo para cada serviço individual dentro do dia
export interface Service {
  id: string
  obraNome: string
  descricao: string
  equipa: string[]
  materiais: string[]
  totalHoras?: number
}

// Tipo principal do dia
export interface DayEntry {
  id: string
  date: string
  totalHoras: number
  normalHoras: number
  extraHoras: number

  // ✅ Taxa horária vigente no dia do registo (histórica)
  // Gravada no momento da criação/edição — não muda com alterações futuras à taxa
  taxaHoraria?: number

  // Campos legacy (compatibilidade total com dados antigos)
  descricao?: string
  equipa?: string[]
  materiais?: string[]

  // Serviços detalhados (opcional — dados antigos não têm)
  services?: Service[]
}

// Calculate normal and extra hours based on weekday rules
export function calculateHours(
  date: string,
  totalHoras: number
): { normalHoras: number; extraHoras: number } {
  const dayOfWeek = new Date(date).getDay() // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 0) {
    // Sunday: all extra
    return { normalHoras: 0, extraHoras: totalHoras }
  }

  if (dayOfWeek === 6) {
    // Saturday: first 5 normal
    const normalHoras = Math.min(totalHoras, 5)
    const extraHoras = Math.max(0, totalHoras - 5)
    return { normalHoras, extraHoras }
  }

  // Mon-Fri: first 8 normal
  const normalHoras = Math.min(totalHoras, 8)
  const extraHoras = Math.max(0, totalHoras - 8)
  return { normalHoras, extraHoras }
}

export type PaymentMethod = "MBWay" | "Dinheiro" | "Transferência"

export interface Payment {
  id: string
  date: string // YYYY-MM-DD
  valor: number
  metodo: PaymentMethod
  source?: "admin" | undefined
}

export interface Settings {
  taxaHoraria: number
  equipaComum: string[]
}

export interface AppData {
  entries: DayEntry[]
  payments: Payment[]
  settings: Settings
}

export const defaultSettings: Settings = {
  taxaHoraria: 10,
  equipaComum: [],
}

export const defaultAppData: AppData = {
  entries: [],
  payments: [],
  settings: defaultSettings,
}

// Calculate which days are paid based on sequential payments (FIFO)
// ✅ Usa a taxa histórica de cada entry (entry.taxaHoraria) com fallback para taxaHoraria atual
export function calculatePaidStatus(
  entries: DayEntry[],
  payments: Payment[],
  taxaHoraria: number // taxa atual — usada como fallback para entries sem taxa gravada
): Set<string> {
  const paidDates = new Set<string>()

  // Sort entries by date (oldest first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Total paid amount
  const totalPaid = payments.reduce((sum, p) => sum + p.valor, 0)

  // Mark days as paid until we run out of paid amount
  // ✅ Cada dia usa a sua própria taxa histórica para o cálculo
  let cumulativeValor = 0
  for (const entry of sortedEntries) {
    const taxa = entry.taxaHoraria ?? taxaHoraria
    const dayValor = entry.totalHoras * taxa
    cumulativeValor += dayValor

    if (cumulativeValor <= totalPaid) {
      paidDates.add(entry.date)
    } else {
      break
    }
  }

  return paidDates
}