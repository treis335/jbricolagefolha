// lib/useGlobalSettings.ts
// Configurações globais geridas pelo admin — guardadas em Firestore config/global
// Todos os colaboradores lêem, só o admin escreve.
"use client"

import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface GlobalSettings {
  diasBloqueio: number   // 0 = desativado, N = dias de janela de edição
}

const DEFAULT: GlobalSettings = { diasBloqueio: 0 }
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
