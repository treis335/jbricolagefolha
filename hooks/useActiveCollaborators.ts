// hooks/useActiveCollaborators.ts
/**
 * Hook que expõe apenas colaboradores ativos, com o nome atual do Firestore
 * (campo `username` editável nas Definições).
 *
 * Exporta também `syncCollaboratorName` — função utilitária para atualizar
 * o nome de um colaborador em todos os registos de entrada (entries) onde
 * ele aparece como membro de equipa, identificado pelo seu UID.
 *
 * Uso típico:
 *   Após um user mudar o username nas Definições, chamar:
 *   await syncCollaboratorName(uid, novoNome)
 *
 * Isso percorre todos os workers, encontra entries onde `equipaUids` contém
 * o uid, e atualiza o nome correspondente no array `equipa`.
 */

import { useState, useEffect, useMemo } from "react"
import { useCollaborators } from "./useCollaborators"
import {
  collection, getDocs, query, where, doc, updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface ActiveCollaborator {
  uid: string
  nome: string
  email?: string
  currentRate?: number
}

interface UseActiveCollaboratorsReturn {
  activeCollaborators: ActiveCollaborator[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// syncCollaboratorName
// Atualiza o nome de um colaborador (por UID) em todos os registos de equipa
// de todos os workers. Deve ser chamada sempre que o username muda.
// ─────────────────────────────────────────────────────────────────────────────
export async function syncCollaboratorName(
  uid: string,
  novoNome: string
): Promise<{ updated: number; errors: number }> {
  let updated = 0
  let errors = 0

  try {
    const usersRef = collection(db, "users")
    const workersQuery = query(usersRef, where("role", "==", "worker"))
    const snapshot = await getDocs(workersQuery)

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data()
      const entries: any[] = userData.workData?.entries || []

      let changed = false
      const updatedEntries = entries.map((entry: any) => {
        // entries podem ter services[] com equipa/equipaUids
        // ou ter equipa/equipaUids diretamente (legado)
        let entryChanged = false

        // ── Formato novo: services[] ──
        if (Array.isArray(entry.services)) {
          const updatedServices = entry.services.map((svc: any) => {
            const uids: string[] = svc.equipaUids || []
            const nomes: string[] = svc.equipa || []
            const idx = uids.indexOf(uid)
            if (idx === -1) return svc

            const novosNomes = [...nomes]
            novosNomes[idx] = novoNome
            entryChanged = true
            return { ...svc, equipa: novosNomes }
          })
          if (entryChanged) {
            changed = true
            return { ...entry, services: updatedServices }
          }
          return entry
        }

        // ── Formato legado: equipa/equipaUids diretamente na entry ──
        const uids: string[] = entry.equipaUids || []
        const nomes: string[] = entry.equipa || []
        const idx = uids.indexOf(uid)
        if (idx === -1) return entry

        const novosNomes = [...nomes]
        novosNomes[idx] = novoNome
        changed = true
        return { ...entry, equipa: novosNomes }
      })

      if (changed) {
        try {
          await updateDoc(doc(db, "users", userDoc.id), {
            "workData.entries": updatedEntries,
          })
          updated++
          console.log(`✅ Nome atualizado em registos de ${userDoc.id}`)
        } catch (e) {
          errors++
          console.error(`❌ Erro ao atualizar registos de ${userDoc.id}:`, e)
        }
      }
    }
  } catch (e) {
    console.error("❌ Erro no syncCollaboratorName:", e)
    errors++
  }

  console.log(`🔄 syncCollaboratorName(${uid}, "${novoNome}"): ${updated} documentos atualizados, ${errors} erros`)
  return { updated, errors }
}

// ─────────────────────────────────────────────────────────────────────────────
// useActiveCollaborators
// ─────────────────────────────────────────────────────────────────────────────
export function useActiveCollaborators(): UseActiveCollaboratorsReturn {
  const { collaborators, loading, error, refetch } = useCollaborators()

  const activeCollaborators = useMemo((): ActiveCollaborator[] => {
    return collaborators
      .filter(c => c.ativo === true)
      .map(c => ({
        uid: c.id,
        // ✅ c.name já é resolvido pelo useCollaborators como username || name
        nome: c.name,
        email: c.email,
        currentRate: c.currentRate,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt"))
  }, [collaborators])

  return {
    activeCollaborators,
    loading,
    error,
    refetch,
  }
}