// hooks/usePendingSuggestions.ts
"use client"

import { useState, useEffect } from "react"
import { doc, onSnapshot, updateDoc, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/AuthProvider"
import type { PendingSuggestion } from "@/lib/suggestions"

export function usePendingSuggestions() {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([])

  useEffect(() => {
    if (!user) { setSuggestions([]); return }

    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      if (!snap.exists()) { setSuggestions([]); return }
      const raw = snap.data().pendingSuggestions
      setSuggestions(Array.isArray(raw) ? raw : [])
    }, () => setSuggestions([]))

    return unsub
  }, [user])

  const dismiss = async (s: PendingSuggestion) => {
    if (!user) return
    setSuggestions(prev => prev.filter(x => x.id !== s.id))
    await updateDoc(doc(db, "users", user.uid), {
      pendingSuggestions: arrayRemove(s),
    }).catch(() => {})
  }

  return { suggestions, dismiss }
}
