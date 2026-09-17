// lib/useGlobalSettings.ts
// Configurações globais geridas pelo admin — guardadas em Firestore config/global
// Todos os colaboradores lêem, só o admin escreve.
"use client"

import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from "firebase/firestore"
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

// ── Desbloqueio de dias específicos por colaborador ──────────────────────────
// Guardado em users/{uid}.unlockedDays — separado do config/global
// O global define o prazo; o per-day define excepções pontuais

export interface UnlockedDay {
  date: string        // "YYYY-MM-DD"
  unlockedUntil: string  // ISO timestamp — expira automaticamente
  unlockedByUid: string  // quem desbloqueou
}

/** Verifica se um dia específico está desbloqueado e a janela não expirou */
export function isDayUnlocked(unlockedDays: UnlockedDay[], date: string): boolean {
  if (!Array.isArray(unlockedDays)) return false
  const entry = unlockedDays.find(u => u.date === date)
  if (!entry) return false
  return new Date(entry.unlockedUntil) > new Date()
}

/** Admin: desbloqueia dias específicos de um colaborador por N horas */
export async function unlockDaysForUser(
  collaboratorUid: string,
  dates: string[],
  hours: number,
  adminUid: string
): Promise<void> {
  const until = new Date()
  until.setHours(until.getHours() + hours)
  const untilISO = until.toISOString()

  const ref = doc(db, "users", collaboratorUid)
  const snap = await getDoc(ref)
  const current: UnlockedDay[] = snap.exists()
    ? (snap.data().unlockedDays ?? [])
    : []

  // Replace or add each date
  const filtered = current.filter(u => !dates.includes(u.date))
  const newEntries: UnlockedDay[] = dates.map(date => ({
    date,
    unlockedUntil: untilISO,
    unlockedByUid: adminUid,
  }))

  await updateDoc(ref, { unlockedDays: [...filtered, ...newEntries] })
}

/** Admin: volta a trancar dias específicos (remove o desbloqueio) */
export async function relockDaysForUser(
  collaboratorUid: string,
  dates: string[]
): Promise<void> {
  const ref = doc(db, "users", collaboratorUid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const current: UnlockedDay[] = snap.data().unlockedDays ?? []
  await updateDoc(ref, {
    unlockedDays: current.filter(u => !dates.includes(u.date))
  })
}
