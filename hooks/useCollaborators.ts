// hooks/useCollaborators.ts (VERSÃO COMPLETA FINAL)
/**
 * Hook personalizado para buscar e gerir colaboradores do Firebase
 * 
 * Funcionalidades:
 * - Busca todos os users com role "worker"
 * - Calcula horas totais do mês atual
 * - Calcula horas de todo o histórico
 * - Calcula custo do mês usando a taxa histórica de cada entry ✅
 * - Busca array de payments (pagamentos)
 * - Busca array de entries completo (para relatórios)
 * - Retorna estado de loading e erro
 * - Fornece função refetch para atualizar dados
 */

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Collaborator {
  id: string // UID do Firebase
  name: string
  username: string
  email: string
  currentRate: number // taxa horária atual (€/h)
  totalHoursThisMonth: number
  totalHoursAllTime: number
  role: string
  createdAt: any
  migrated?: boolean
  entries: any[] // Array completo de entries (para relatórios e calendário)
  payments: Array<{
    id: string
    date: string
    valor: number
    metodo: string
  }>
  // ✅ Custo calculado com taxa histórica por entry (não currentRate * horas)
  totalCostThisMonth: number
}

interface UseCollaboratorsReturn {
  collaborators: Collaborator[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// ✅ Helper: resolve a taxa de uma entry com todos os fallbacks possíveis
// 1. taxa na raiz da entry (formato correto mais recente)
// 2. taxa dentro de services[0] (formato intermédio gravado antes do fix)
// 3. fallback para a taxa atual do colaborador (entries muito antigas sem taxa gravada)
function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0)
    return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const s0Taxa = entry.services[0]?.taxaHoraria
    if (typeof s0Taxa === "number" && s0Taxa > 0) return s0Taxa
  }
  return currentRate
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
        const currentMonth = now.getMonth() // 0-11
        const currentYear = now.getFullYear()

        const entries = userData.workData?.entries || []
        const currentRate = userData.workData?.settings?.taxaHoraria || 0

        let totalHoursThisMonth = 0
        let totalHoursAllTime = 0
        let totalCostThisMonth = 0 // ✅ acumulado com taxa histórica

        entries.forEach((entry: any) => {
          const entryDate = entry.date // formato "YYYY-MM-DD"
          const totalHoras = entry.totalHoras || 0

          totalHoursAllTime += totalHoras

          if (entryDate) {
            try {
              const [year, month] = entryDate.split("-").map(Number)
              if (year === currentYear && month - 1 === currentMonth) {
                totalHoursThisMonth += totalHoras
                // ✅ Taxa histórica da entry em vez de sempre currentRate
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
          name: userData.name || userData.username || "Sem nome",
          username: userData.username || "",
          email: userData.email || "",
          currentRate,
          totalHoursThisMonth,
          totalHoursAllTime,
          role: userData.role || "worker",
          createdAt: userData.createdAt,
          migrated: userData.migrated || false,
          entries,
          payments: formattedPayments,
          totalCostThisMonth, // ✅ calculado com taxa histórica
        })

        console.log(
          `✅ ${userData.name}: ${totalHoursThisMonth.toFixed(1)}h este mês, custo ${totalCostThisMonth.toFixed(2)}€, ${formattedPayments.length} pagamentos`
        )
      }

      collabsData.sort((a, b) => a.name.localeCompare(b.name))
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