// lib/report-utils.ts
// Lógica partilhada pelos relatórios admin

export interface RateHistoryEntry {
  taxa: number
  taxaAnterior: number | null
  data: string          // ISO datetime — quando foi registado
  dataVigencia?: string // "YYYY-MM-DD" — a partir de que dia vale
  alteradoPor: string
  motivo?: string
}

/**
 * Resolve a taxa horária correta para uma data específica.
 * Percorre o histórico de taxas e devolve a taxa ativa nessa data.
 * Fallback para currentRate se não houver histórico.
 */
export function resolveTaxaForDate(
  date: string, // "YYYY-MM-DD"
  rateHistory: RateHistoryEntry[],
  currentRate: number
): number {
  if (!rateHistory || rateHistory.length === 0) return currentRate

  // Ordena por dataVigencia DESC (mais recente primeiro)
  // Fallback para data (primeiros registos sem dataVigencia)
  const sorted = [...rateHistory].sort((a, b) => {
    const va = a.dataVigencia ?? (a.data ? a.data.slice(0, 10) : "")
    const vb = b.dataVigencia ?? (b.data ? b.data.slice(0, 10) : "")
    return vb.localeCompare(va)
  })

  // Encontra a taxa cuja vigência é <= à data do registo
  for (const h of sorted) {
    const vigencia = h.dataVigencia ?? (h.data ? h.data.slice(0, 10) : "")
    if (vigencia && vigencia <= date) return h.taxa
  }

  // Antes de qualquer registo de taxa — usa a taxa mais antiga conhecida
  return sorted[sorted.length - 1]?.taxaAnterior ?? currentRate
}

/**
 * Resolve taxa de uma entry — tenta campos internos primeiro, depois histórico
 */
export function resolveEntryTaxaFull(
  entry: any,
  rateHistory: RateHistoryEntry[],
  currentRate: number
): number {
  // 1. Taxa guardada directamente na entry (mais fiável)
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0)
    return entry.taxaHoraria

  // 2. Taxa guardada no primeiro serviço
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const t = entry.services[0]?.taxaHoraria
    if (typeof t === "number" && t > 0) return t
  }

  // 3. Histórico de taxas para a data da entry
  if (entry.date) {
    return resolveTaxaForDate(entry.date, rateHistory, currentRate)
  }

  return currentRate
}

export interface MonthRow {
  name: string
  email: string
  rate: number         // taxa do mês (histórica)
  normalHoras: number
  extraHoras: number
  totalHoras: number
  custo: number
  pago: number
  pendente: number     // pendente REAL acumulado até este mês
}

export interface MonthData {
  periodo: string      // "YYYY-MM"
  hours: number
  cost: number
  paid: number
  pending: number
}

/**
 * Constrói os dados financeiros mensais de um colaborador
 * com taxa histórica correcta e pendente acumulado real
 */
export function buildCollabMonthData(collab: any): MonthData[] {
  if (!collab) return []
  const entries: any[]  = Array.isArray(collab.entries)  ? collab.entries  : []
  const payments: any[] = [...(Array.isArray(collab.payments) ? collab.payments : [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const rateHistory: RateHistoryEntry[] = collab.rateHistory || []
  const currentRate: number = collab.currentRate || 0

  const monthMap = new Map<string, MonthData>()

  entries.forEach((e: any) => {
    const p = (e.date || "").slice(0, 7)
    if (!p) return
    if (!monthMap.has(p)) monthMap.set(p, { periodo: p, hours: 0, cost: 0, paid: 0, pending: 0 })
    const m = monthMap.get(p)!
    const taxa = resolveEntryTaxaFull(e, rateHistory, currentRate)
    const eh = Number.isFinite(e.totalHoras) ? e.totalHoras : 0
    const et = Number.isFinite(taxa) ? taxa : 0
    m.hours += eh
    m.cost  += et * eh
  })

  // Distribuir pagamentos cronologicamente pelos meses
  const allMonths = Array.from(monthMap.values()).sort((a, b) => a.periodo.localeCompare(b.periodo))

  let pi = 0, rem = 0
  for (const m of allMonths) {
    let left = m.cost
    while (left > 0 && (pi < payments.length || rem > 0)) {
      if (rem <= 0 && pi < payments.length) { rem = payments[pi].valor || 0; pi++ }
      if (rem > 0) {
        const apply = Math.min(left, rem)
        m.paid += apply; left -= apply; rem -= apply
      } else break
    }
    const costSafe = Number.isFinite(m.cost) ? m.cost : 0
    const paidSafe = Number.isFinite(m.paid) ? m.paid : 0
    m.cost    = costSafe
    m.paid    = paidSafe
    m.pending = Math.max(0, costSafe - paidSafe)
  }

  return allMonths
}

/**
 * Constrói as linhas do relatório mensal para um mês específico
 */
export function buildMonthRows(collaborators: any[], monthKey: string): MonthRow[] {
  if (!Array.isArray(collaborators)) return []
  return collaborators
    .filter(c => c.ativo !== false)
    .map(collab => {
      const entries = (collab.entries || []).filter((e: any) => (e.date || "").startsWith(monthKey))
      const rateHistory: RateHistoryEntry[] = collab.rateHistory || []
      const currentRate = collab.currentRate || 0

      let normalHoras = 0, extraHoras = 0, totalHoras = 0, custo = 0

      entries.forEach((e: any) => {
        const h    = e.totalHoras || 0
        const taxa = resolveEntryTaxaFull(e, rateHistory, currentRate)
        totalHoras += h
        normalHoras += typeof e.normalHoras === "number" ? e.normalHoras : Math.min(h, 8)
        extraHoras  += typeof e.extraHoras  === "number" ? e.extraHoras  : Math.max(0, h - 8)
        custo += h * taxa
      })

      // Pagamentos deste mês
      const monthPayments = (collab.payments || []).filter((p: any) => (p.date || "").startsWith(monthKey))
      const pago = monthPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0)
      const pendente = Math.max(0, custo - pago)

      // Taxa representativa do mês (última taxa ativa nesse mês)
      const monthEnd = `${monthKey}-28`
      const taxa = resolveTaxaForDate(monthEnd, rateHistory, currentRate)

      // Ensure every numeric field is a finite number (never NaN / undefined)
      const safe = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0)

      return {
        name:        collab.name  || "—",
        email:       collab.email || "",
        rate:        Number.isFinite(taxa) ? taxa : 0,
        normalHoras: safe(normalHoras * 10) / 10,
        extraHoras:  safe(extraHoras  * 10) / 10,
        totalHoras:  safe(totalHoras  * 10) / 10,
        custo:       safe(custo),
        pago:        safe(pago),
        pendente:    safe(pendente),
      }
    })
    .filter(r => r.totalHoras > 0 || r.pago > 0)
    .sort((a, b) => b.totalHoras - a.totalHoras)
}
