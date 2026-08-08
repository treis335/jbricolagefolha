import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatação monetária (instância única, não recriada a cada render) ────────
const _eurFormatter = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })
const _shortMonthFormatter = new Intl.DateTimeFormat("pt-PT", { month: "short" })
const _longMonthFormatter  = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" })

export const fmt         = (v: number) => _eurFormatter.format(v)
export const fmtMonth    = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return _longMonthFormatter.format(new Date(y, m - 1, 1))
}
export const fmtShortMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return _shortMonthFormatter.format(new Date(y, m - 1, 1))
}

// ── Resolve taxa horária de uma entry (histórica ou atual) ───────────────────
export function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const t = entry.services[0]?.taxaHoraria
    if (typeof t === "number" && t > 0) return t
  }
  return currentRate
}

/**
 * Returns true if the given date is locked for editing.
 * diasBloqueio=0 means no locking.
 * diasBloqueio=5 means days older than 5 days are locked.
 */
export function isDayLocked(dateISO: string, diasBloqueio: number): boolean {
  if (!diasBloqueio || diasBloqueio <= 0) return false
  const date = new Date(dateISO + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > diasBloqueio
}
