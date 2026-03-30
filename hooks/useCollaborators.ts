// hooks/useCollaborators.ts
/**
 * Hook personalizado para buscar e gerir colaboradores do Firebase
 *
 * Funcionalidades:
 * - Busca todos os users com role "worker"
 * - Expõe campo `ativo` (boolean, default true) para soft-disable
 * - Calcula horas totais do mês atual
 * - Calcula horas de todo o histórico
 * - Calcula custo do mês usando a taxa histórica de cada entry ✅
 * - Busca array de payments (pagamentos)
 * - Busca array de entries completo (para relatórios)
 * - Retorna estado de loading e erro
 * - Fornece função refetch para atualizar dados
 *
 * ✅ NOME: usa sempre `username` (campo editável pelo user nas Definições).
 *    Fallback para `name` (campo legado) e depois "Sem nome".
 */

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Collaborator {
  id: string
  /** Nome resolvido — sempre `username` se existir, senão `name` legado */
  name: string
  /** Campo raw do Firestore — nome editável pelo user nas Definições */
  username: string
  /** Campo raw legado — usado apenas como fallback */
  legacyName: string
  email: string
  currentRate: number
  totalHoursThisMonth: number
  totalHoursAllTime: number
  role: string
  createdAt: any
  migrated?: boolean
  ativo: boolean
  entries: any[]
  payments: Array<{
    id: string
    date: string
    valor: number
    metodo: string
  }>
  totalCostThisMonth: number
}

interface UseCollaboratorsReturn {
  collaborators: Collaborator[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0)
    return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const s0Taxa = entry.services[0]?.taxaHoraria
    if (typeof s0Taxa === "number" && s0Taxa > 0) return s0Taxa
  }
  return currentRate
}

/**
 * Resolve o nome de exibição de um user.
 * Prioridade: username (editável pelo user) → name (legado) → "Sem nome"
 */
function resolveDisplayName(userData: any): string {
  const username = (userData.username || "").trim()
  const name = (userData.name || "").trim()
  return username || name || "Sem nome"
}

export function useCollaborators(): UseCollaboratorsReturn {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollaborators = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🔄 Iniciando busca de colaboradores...")

      const usersRef = collection(db, "users")
      const workersQuery = query(usersRef, where("role", "==", "worker"))
      const usersSnapshot = await getDocs(workersQuery)

      console.log(`📊 Encontrados ${usersSnapshot.size} colaboradores no Firebase`)

      const collabsData: Collaborator[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        const userId = userDoc.id

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const entries = userData.workData?.entries || []
        const currentRate = userData.workData?.settings?.taxaHoraria || 0
        const ativo: boolean = userData.ativo !== false

        // ✅ Nome resolvido: username primeiro, depois name legado
        const displayName = resolveDisplayName(userData)

        let totalHoursThisMonth = 0
        let totalHoursAllTime = 0
        let totalCostThisMonth = 0

        entries.forEach((entry: any) => {
          const entryDate = entry.date
          const totalHoras = entry.totalHoras || 0

          totalHoursAllTime += totalHoras

          if (entryDate) {
            try {
              const [year, month] = entryDate.split("-").map(Number)
              if (year === currentYear && month - 1 === currentMonth) {
                totalHoursThisMonth += totalHoras
                totalCostThisMonth += totalHoras * resolveEntryTaxa(entry, currentRate)
              }
            } catch (e) {
              console.warn(`⚠️ Data inválida para entrada: ${entryDate}`)
            }
          }
        })

        const payments = userData.workData?.payments || []
        const formattedPayments = payments.map((p: any) => ({
          id: p.id || "",
          date: p.date || "",
          valor: p.valor || 0,
          metodo: p.metodo || "Desconhecido",
        }))

        collabsData.push({
          id: userId,
          name: displayName,           // ✅ sempre username se existir
          username: userData.username || "",
          legacyName: userData.name || "",
          email: userData.email || "",
          currentRate,
          totalHoursThisMonth,
          totalHoursAllTime,
          role: userData.role || "worker",
          createdAt: userData.createdAt,
          migrated: userData.migrated || false,
          ativo,
          entries,
          payments: formattedPayments,
          totalCostThisMonth,
        })

        console.log(
          `${ativo ? "✅" : "🔴"} ${displayName} (uid: ${userId}): ${totalHoursThisMonth.toFixed(1)}h este mês, custo ${totalCostThisMonth.toFixed(2)}€, ativo: ${ativo}`
        )
      }

      collabsData.sort((a, b) => {
        if (a.ativo !== b.ativo) return a.ativo ? -1 : 1
        return a.name.localeCompare(b.name, "pt")
      })

      setCollaborators(collabsData)
      console.log(`✅ Total processados: ${collabsData.length} colaboradores`)
    } catch (err) {
      console.error("❌ Erro ao buscar colaboradores:", err)
      setError("Erro ao carregar colaboradores. Verifica a consola para mais detalhes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollaborators()
  }, [])

  return {
    collaborators,
    loading,
    error,
    refetch: fetchCollaborators,
  }
}