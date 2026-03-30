// hooks/useActiveCollaborators.ts
import { useState, useEffect, useMemo } from "react"
import { useCollaborators } from "./useCollaborators"

export interface ActiveCollaborator {
  uid: string
  nome: string
  email?: string
  currentRate?: number
}

export function useActiveCollaborators() {
  const { collaborators, loading, error, refetch } = useCollaborators()

  const activeCollaborators = useMemo((): ActiveCollaborator[] => {
    return collaborators
      .filter(c => c.ativo === true)
      .map(c => ({
        uid: c.id,
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