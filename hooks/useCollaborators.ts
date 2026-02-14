// hooks/useCollaborators.ts
/**
 * Hook personalizado para buscar e gerir colaboradores do Firebase
 * 
 * Funcionalidades:
 * - Busca todos os users com role "worker"
 * - Calcula horas totais do mês atual
 * - Calcula horas de todo o histórico
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
}

interface UseCollaboratorsReturn {
  collaborators: Collaborator[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
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

      // 1. Buscar todos os users com role "worker"
      const usersRef = collection(db, "users")
      const workersQuery = query(usersRef, where("role", "==", "worker"))
      const usersSnapshot = await getDocs(workersQuery)

      console.log(`📊 Encontrados ${usersSnapshot.size} colaboradores no Firebase`)

      const collabsData: Collaborator[] = []

      // 2. Para cada colaborador, processar os dados
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        const userId = userDoc.id

        // 3. Calcular horas do mês atual
        const now = new Date()
        const currentMonth = now.getMonth() // 0-11
        const currentYear = now.getFullYear()

        let totalHoursThisMonth = 0
        let totalHoursAllTime = 0

        // Verificar se tem workData.entries (array de entradas de trabalho)
        const entries = userData.workData?.entries || []

        if (entries.length > 0) {
          entries.forEach((entry: any) => {
            const entryDate = entry.date // formato "YYYY-MM-DD"
            const totalHoras = entry.totalHoras || 0

            // Somar total de todas as horas (histórico completo)
            totalHoursAllTime += totalHoras

            // Verificar se a entrada é do mês atual
            if (entryDate) {
              try {
                const [year, month] = entryDate.split("-").map(Number)
                // month no formato YYYY-MM-DD é 1-12, por isso fazemos month - 1
                if (year === currentYear && month - 1 === currentMonth) {
                  totalHoursThisMonth += totalHoras
                }
              } catch (e) {
                console.warn(`⚠️ Data inválida para entrada: ${entryDate}`)
              }
            }
          })
        }

        // 4. Pegar a taxa horária atual
        // Por agora vem de workData.settings.taxaHoraria
        // TODO: No futuro, buscar de uma coleção separada de taxas com histórico
        const currentRate = userData.workData?.settings?.taxaHoraria || 0

        // 5. Adicionar ao array
        collabsData.push({
          id: userId,
          name: userData.name || userData.username || "Sem nome",
          username: userData.username || "",
          email: userData.email || "",
          currentRate: currentRate,
          totalHoursThisMonth: totalHoursThisMonth,
          totalHoursAllTime: totalHoursAllTime,
          role: userData.role || "worker",
          createdAt: userData.createdAt,
          migrated: userData.migrated || false,
        })

        console.log(
          `✅ ${userData.name}: ${totalHoursThisMonth.toFixed(1)}h este mês, ${totalHoursAllTime.toFixed(1)}h total`
        )
      }

      // 6. Ordenar alfabeticamente por nome
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

  // Executar fetch ao montar o componente
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