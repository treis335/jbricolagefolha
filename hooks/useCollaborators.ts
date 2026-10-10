// hooks/useCollaborators.ts
"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where, type DocumentData, type QuerySnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { DayEntry } from "@/lib/types"

export interface RateHistoryEntry {
  taxa: number
  taxaAnterior: number | null
  data: string           // ISO datetime — quando foi registado
  dataVigencia?: string  // "YYYY-MM-DD" — a partir de que dia vale (opcional)
  alteradoPor: string
  motivo?: string
}

export interface Collaborator {
  id: string
  name: string
  username: string
  legacyName: string
  email: string
  currentRate: number
  rateHistory: RateHistoryEntry[]
  totalHoursThisMonth: number
  totalHoursAllTime: number
  totalCostThisMonth: number
  role: string
  createdAt: string | null
  migrated?: boolean
  ativo: boolean
  fotoUrl?: string
  tipoContrato?: "funcionario" | "independente"
  pendingAmount: number
  unlockedDays: import("@/lib/useGlobalSettings").UnlockedDay[]
  entries: DayEntry[]
  payments: Array<{ id: string; date: string; valor: number; metodo: string }>
}

interface UseCollaboratorsReturn {
  collaborators: Collaborator[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function resolveDisplayName(userData: any): string {
  return (userData.username || "").trim() || (userData.name || "").trim() || "Sem nome"
}

function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const t = entry.services[0]?.taxaHoraria
    if (typeof t === "number" && t > 0) return t
  }
  return currentRate
}

// Vários componentes montam ao mesmo tempo e pediam, cada um, TODOS os documentos dos colaboradores.
// Pedidos simultâneos partilham agora a mesma leitura. Não há cache: uma leitura nova
// (e o refetch, sempre) vai ao servidor, por isso os dados nunca ficam desatualizados.
let leituraEmCurso: Promise<QuerySnapshot<DocumentData>> | null = null
function lerColaboradores(forcar: boolean): Promise<QuerySnapshot<DocumentData>> {
  if (forcar || !leituraEmCurso) {
    const leitura = getDocs(query(collection(db, "users"), where("role", "==", "worker")))
    const limpar = () => { if (leituraEmCurso === leitura) leituraEmCurso = null }
    leitura.then(limpar, limpar)
    leituraEmCurso = leitura
  }
  return leituraEmCurso!
}

export function useCollaborators(): UseCollaboratorsReturn {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const fetchCollaborators = async (forcar = false) => {
    setLoading(true)
    setError(null)
    try {
      const snap = await lerColaboradores(forcar)
      const now  = new Date()
      const curM = now.getMonth(), curY = now.getFullYear()

      const data: Collaborator[] = snap.docs.map(userDoc => {
        const d    = userDoc.data()
        const uid  = userDoc.id

        const currentRate: number = d.workData?.settings?.taxaHoraria || 0
        const ativo: boolean      = d.ativo !== false
        const entries: any[]      = d.workData?.entries || []
        const rawPayments: any[]  = d.workData?.payments || []
        const rateHistory: RateHistoryEntry[] = Array.isArray(d.rateHistory) ? d.rateHistory : []

        let totalHoursThis = 0, totalHoursAll = 0, totalCostThis = 0

        entries.forEach((e: any) => {
          const h = e.totalHoras || 0
          totalHoursAll += h
          if (e.date) {
            const [y, m] = e.date.split("-").map(Number)
            if (y === curY && m - 1 === curM) {
              totalHoursThis += h
              totalCostThis  += h * resolveEntryTaxa(e, currentRate)
            }
          }
        })

        const payments = rawPayments.map((p: any) => ({
          id: p.id || "", date: p.date || "", valor: p.valor || 0, metodo: p.metodo || "—",
        }))

        return {
          id:                uid,
          name:              resolveDisplayName(d),
          username:          d.username || "",
          legacyName:        d.name     || "",
          email:             d.email    || "",
          currentRate,
          rateHistory,
          totalHoursThisMonth: totalHoursThis,
          totalHoursAllTime:   totalHoursAll,
          totalCostThisMonth:  totalCostThis,
          role:              d.role     || "worker",
          createdAt:         d.createdAt || null,
          migrated:          d.migrated  || false,
          ativo,
          fotoUrl: d.fotoUrl || undefined,
          tipoContrato: d.tipoContrato === "independente" ? "independente" : "funcionario",
          pendingAmount: 0,
          unlockedDays: Array.isArray(d.unlockedDays) ? d.unlockedDays : [],
          entries,
          payments,
        }
      })

      data.sort((a, b) => {
        if (a.ativo !== b.ativo) return a.ativo ? -1 : 1
        return a.name.localeCompare(b.name, "pt")
      })

      setCollaborators(data)
    } catch (err) {
      setError("Erro ao carregar colaboradores.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCollaborators() }, [])

  return { collaborators, loading, error, refetch: () => fetchCollaborators(true) }
}
