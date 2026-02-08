//work-tracker-context.tsx - VERSÃO ULTRA-SEGURA

"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { useAuth } from "@/lib/AuthProvider"
import {
  type AppData,
  type DayEntry,
  type Payment,
  type PaymentMethod,
  type Settings,
  defaultAppData,
  calculatePaidStatus,
  calculateHours,
} from "./types"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"

interface WorkTrackerContextType {
  data: AppData
  isLoading: boolean
  paidDates: Set<string>
  addEntry: (entry: DayEntry) => void
  updateEntry: (date: string, entry: DayEntry) => void
  deleteEntry: (date: string) => void
  getEntry: (date: string) => DayEntry | undefined
  getPreviousDayEntry: (date: string) => DayEntry | undefined
  addPayment: (payment: { date: string; valor: number; metodo: PaymentMethod }) => void
  deletePayment: (id: string) => void
  updateSettings: (settings: Partial<Settings>) => void
  clearAllData: () => void
  getEntriesInRange: (startDate: string, endDate: string) => DayEntry[]
  getTotalValor: () => number
  getTotalPago: () => number
  getFaltaReceber: () => number
  importData: (appData: AppData) => void
}

const WorkTrackerContext = createContext<WorkTrackerContextType | null>(null)

export function WorkTrackerProvider({ children }: { children: ReactNode }) {
  const { user, isAuthLoading } = useAuth()
  const [data, setData] = useState<AppData>(defaultAppData)
  const [isLoading, setIsLoading] = useState(true)
  const [paidDates, setPaidDates] = useState<Set<string>>(new Set())
  const hasLoadedRef = useRef(false) // Previne re-loads

  // -------- Helper: Remove undefined values recursively --------
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null
    if (Array.isArray(obj)) return obj.map(removeUndefined)
    if (typeof obj === 'object') {
      const cleaned: any = {}
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = removeUndefined(obj[key])
        }
      }
      return cleaned
    }
    return obj
  }

  // -------- Load Data & Migrate from LocalStorage ONCE --------
  useEffect(() => {
    if (isAuthLoading || !user || hasLoadedRef.current) {
      if (!isAuthLoading && !user) {
        setIsLoading(false)
      }
      return
    }

    hasLoadedRef.current = true
    setIsLoading(true)

    const loadAndMigrate = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid)
        const snapshot = await getDoc(userDocRef)
        let finalData: AppData = defaultAppData

        if (snapshot.exists()) {
          const userData = snapshot.data()
          const workData = userData?.workData
          const migrated = userData?.migrated ?? false

          if (!migrated) {
            console.log(`🔄 Migração inicial para user ${user.uid}`)
            
            // ⚠️ MIGRAÇÃO ÚNICA: Tenta encontrar dados legacy APENAS DESTE USER
            const userSpecificKey = `trabalhoDiario_${user.uid}`
            const legacyKey = "trabalhoDiario"
            
            let localRaw = localStorage.getItem(userSpecificKey)
            let migratedFrom = userSpecificKey
            
            // Se não existir chave específica, tenta legacy (só na PRIMEIRA vez de qualquer user)
            if (!localRaw) {
              localRaw = localStorage.getItem(legacyKey)
              migratedFrom = legacyKey
            }
            
            const localData: AppData | null = localRaw ? JSON.parse(localRaw) : null

            if (localData) {
              console.log(`✅ Dados encontrados em ${migratedFrom}, migrando...`)
              finalData = localData
              
              // Salva no Firebase com flag migrated
              const cleanData = removeUndefined(finalData)
              await setDoc(userDocRef, { 
                workData: cleanData, 
                migrated: true,
                migratedAt: new Date().toISOString(),
                migratedFrom: migratedFrom
              }, { merge: true })
              
              // LIMPA as chaves do localStorage para este user
              localStorage.removeItem(userSpecificKey)
              
              // ⚠️ SÓ apaga a legacy se foi este user que a usou
              if (migratedFrom === legacyKey) {
                console.log("🗑️ Removendo chave legacy do localStorage")
                localStorage.removeItem(legacyKey)
              }
            } else {
              console.log("ℹ️ Sem dados para migrar, criando documento vazio")
              // Nenhum dado local, marca como migrado com dados vazios
              await setDoc(userDocRef, { 
                workData: defaultAppData,
                migrated: true,
                migratedAt: new Date().toISOString()
              }, { merge: true })
            }
          } else if (workData) {
            // Usuário já migrado, carrega do Firebase
            console.log(`✅ Carregando dados do Firebase para user ${user.uid}`)
            finalData = {
              entries: Array.isArray(workData.entries) ? workData.entries : [],
              payments: Array.isArray(workData.payments) ? workData.payments : [],
              settings: workData.settings
                ? { ...defaultAppData.settings, ...workData.settings }
                : defaultAppData.settings,
            }
          } else {
            console.log("⚠️ User migrado mas sem workData, usando defaults")
          }
        } else {
          // Documento não existe, criar novo
          console.log(`🆕 Criando novo documento para user ${user.uid}`)
          await setDoc(userDocRef, { 
            workData: defaultAppData,
            migrated: true,
            createdAt: new Date().toISOString()
          }, { merge: true })
        }

        setData(finalData)
        console.log(`✅ Dados carregados:`, {
          entries: finalData.entries.length,
          payments: finalData.payments.length,
          userId: user.uid
        })
      } catch (err) {
        console.error("❌ Erro ao carregar dados Firebase:", err)
        setData(defaultAppData)
      } finally {
        setIsLoading(false)
      }
    }

    loadAndMigrate()
  }, [user, isAuthLoading])

  // Reset hasLoadedRef quando user muda
  useEffect(() => {
    if (!user) {
      hasLoadedRef.current = false
      setData(defaultAppData)
    }
  }, [user])

  // -------- Calculate Paid Dates --------
  useEffect(() => {
    setPaidDates(calculatePaidStatus(data.entries, data.payments, data.settings.taxaHoraria))
  }, [data])

  // -------- Save Data to Firebase (SEM localStorage!) --------
  useEffect(() => {
    if (!user || !data || isLoading || !hasLoadedRef.current) return

    const saveData = async () => {
      try {
        const cleanData = removeUndefined(data)
        await setDoc(doc(db, "users", user.uid), { workData: cleanData }, { merge: true })
        console.log(`💾 Dados salvos no Firebase para user ${user.uid}`)
      } catch (err) {
        console.error("❌ Erro ao salvar dados Firebase:", err)
      }
    }

    // Debounce para evitar saves excessivos
    const timeoutId = setTimeout(saveData, 500)
    return () => clearTimeout(timeoutId)
  }, [data, user, isLoading])

  // -------- CRUD Functions --------
  const addEntry = (entry: DayEntry) => {
    const { normalHoras, extraHoras } = calculateHours(entry.date, entry.totalHoras)
    const newEntry: DayEntry = { 
      ...entry, 
      normalHoras, 
      extraHoras,
    }

    setData((prev) => ({
      ...prev,
      entries: [...prev.entries.filter((e) => e.date !== entry.date), newEntry].sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }

  const updateEntry = (date: string, entry: DayEntry) => {
    const { normalHoras, extraHoras } = calculateHours(entry.date, entry.totalHoras)
    const newEntry: DayEntry = { 
      ...entry, 
      normalHoras, 
      extraHoras,
    }

    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.date === date ? newEntry : e)),
    }))
  }

  const deleteEntry = (date: string) =>
    setData((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.date !== date) }))

  const getEntry = (date: string) => data.entries.find((e) => e.date === date)

  const getPreviousDayEntry = (date: string) => {
    const previousDate = new Date(date)
    previousDate.setDate(previousDate.getDate() - 1)
    const previousDateStr = previousDate.toISOString().split("T")[0]
    return data.entries.find((e) => e.date === previousDateStr)
  }

  const addPayment = (payment: { date: string; valor: number; metodo: PaymentMethod }) => {
    const newPayment: Payment = { ...payment, id: uuidv4() }
    setData((prev) => ({
      ...prev,
      payments: [...prev.payments, newPayment].sort((a, b) => b.date.localeCompare(a.date)),
    }))
  }

  const deletePayment = (id: string) =>
    setData((prev) => ({ ...prev, payments: prev.payments.filter((p) => p.id !== id) }))

  const updateSettings = (newSettings: Partial<Settings>) =>
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...newSettings } }))

  const clearAllData = () => {
    setData(defaultAppData)
    if (user) {
      const cleanData = removeUndefined(defaultAppData)
      setDoc(doc(db, "users", user.uid), { workData: cleanData }, { merge: true })
    }
  }

  // -------- Import (APENAS Firebase, ZERO localStorage) --------
  const importData = (appData: AppData) => {
    try {
      setData(appData)
      
      if (user) {
        const cleanData = removeUndefined(appData)
        setDoc(doc(db, "users", user.uid), { workData: cleanData }, { merge: true })
          .then(() => console.log("✅ Import concluído"))
          .catch(err => console.error("❌ Erro ao importar:", err))
      }
    } catch (err) {
      console.error("❌ Erro ao importar dados:", err)
    }
  }

  const getEntriesInRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return data.entries.filter((e) => {
      const entryDate = new Date(e.date)
      return entryDate >= start && entryDate <= end
    })
  }

  const getTotalValor = () => data.entries.reduce((sum, e) => sum + e.totalHoras * data.settings.taxaHoraria, 0)
  const getTotalPago = () => data.payments.reduce((sum, p) => sum + p.valor, 0)
  const getFaltaReceber = () => getTotalValor() - getTotalPago()

  return (
    <WorkTrackerContext.Provider
      value={{
        data,
        isLoading,
        paidDates,
        addEntry,
        updateEntry,
        deleteEntry,
        getEntry,
        getPreviousDayEntry,
        addPayment,
        deletePayment,
        updateSettings,
        clearAllData,
        getEntriesInRange,
        getTotalValor,
        getTotalPago,
        getFaltaReceber,
        importData,
      }}
    >
      {children}
    </WorkTrackerContext.Provider>
  )
}

export function useWorkTracker() {
  const context = useContext(WorkTrackerContext)
  if (!context) throw new Error("useWorkTracker must be used within a WorkTrackerProvider")
  return context
}
