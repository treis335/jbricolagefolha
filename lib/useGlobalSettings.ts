// lib/useGlobalSettings.ts
// Configurações globais geridas pelo admin — guardadas em Firestore config/global
// Todos os colaboradores lêem, só o admin escreve.
"use client"

import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface GlobalSettings {
  diasBloqueio: number           // 0 = desativado, N = dias de janela de edição
  /** UIDs com desbloqueio temporário — admin pode conceder acesso a dias antigos */
  unlockedUsers?: Record<string, string>  // uid → ISO date "unlock until"
}

const DEFAULT: GlobalSettings = { diasBloqueio: 0, unlockedUsers: {} }
const REF = () => doc(db, "config", "global")

/** Hook de leitura em tempo real — para colaboradores e admin */
export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(REF(), snap => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT, ...(snap.data() as Partial<GlobalSettings>) })
      } else {
        setSettings(DEFAULT)
      }
      setLoading(false)
    }, () => { setSettings(DEFAULT); setLoading(false) })
    return unsub
  }, [])

  return { settings, loading }
}

/** Função de escrita — só chamada pelo admin */
export async function saveGlobalSettings(data: Partial<GlobalSettings>): Promise<void> {
  const ref = REF()
  const snap = await getDoc(ref)
  const current = snap.exists() ? (snap.data() as GlobalSettings) : DEFAULT
  await setDoc(ref, { ...current, ...data }, { merge: true })
}

/** Returns true if this user has been granted a temporary unlock by admin */
export function isUserUnlocked(settings: GlobalSettings, uid: string): boolean {
  if (!settings.unlockedUsers || !uid) return false
  const until = settings.unlockedUsers[uid]
  if (!until) return false
  return new Date(until) >= new Date()
}

/** Admin: grant temporary unlock to a user until end of today */
export async function unlockUserUntilEndOfDay(uid: string): Promise<void> {
  const ref = REF()
  const snap = await getDoc(ref)
  const current: GlobalSettings = snap.exists() ? (snap.data() as GlobalSettings) : DEFAULT
  const until = new Date()
  until.setHours(23, 59, 59, 999)
  await setDoc(ref, {
    ...current,
    unlockedUsers: { ...(current.unlockedUsers ?? {}), [uid]: until.toISOString() }
  }, { merge: true })
}

/** Admin: revoke unlock for a specific user */
export async function revokeUserUnlock(uid: string): Promise<void> {
  const ref = REF()
  const snap = await getDoc(ref)
  const current: GlobalSettings = snap.exists() ? (snap.data() as GlobalSettings) : DEFAULT
  const unlockedUsers = { ...(current.unlockedUsers ?? {}) }
  delete unlockedUsers[uid]
  await setDoc(ref, { ...current, unlockedUsers }, { merge: true })
}
