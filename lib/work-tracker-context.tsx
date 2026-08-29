//work-tracker-context.tsx - VERSÃO ULTRA-SEGURA

"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { useAuth } from "@/lib/AuthProvider"
import { formatLocalDate } from "@/lib/date-utils"
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
  const hasLoadedRef = useRef(false)

  // -------- Helper: Remove undefined values recursively --------
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null
    if (Array.isArray(obj)) return obj.map(removeUndefined)
    if (typeof obj === "object") {
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
      if (!isAuthLoading && !user) setIsLoading(false)
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
            const userSpecificKey = `trabalhoDiario_${user.uid}`
            const legacyKey = "trabalhoDiario"
            let localRaw = localStorage.getItem(userSpecificKey)
            let migratedFrom = userSpecificKey
            if (!localRaw) { localRaw = localStorage.getItem(legacyKey); migratedFrom = legacyKey }
            const localData: AppData | null = localRaw ? JSON.parse(localRaw) : null

            if (localData) {
              finalData = localData
              const cleanData = removeUndefined(finalData)
              await setDoc(userDocRef, {
                workData: cleanData,
                migrated: true,
                migratedAt: new Date().toISOString(),
                migratedFrom,
              }, { merge: true })
              localStorage.removeItem(userSpecificKey)
              if (migratedFrom === legacyKey) {
                localStorage.removeItem(legacyKey)
              }
            } else {
              await setDoc(userDocRef, {
                workData: defaultAppData,
                migrated: true,
                migratedAt: new Date().toISOString(),
              }, { merge: true })
            }
          } else if (workData) {
            const settings = workData.settings
              ? { ...defaultAppData.settings, ...workData.settings }
              : defaultAppData.settings
            const currentRate = settings.taxaHoraria ?? 0

            // ── Migração silenciosa de entries antigas sem taxaHoraria ──
            // Estampa a taxa actual em entries que não têm o campo.
            // Isto garante que um aumento futuro da taxa global NÃO afecta
            // dias já registados — cada dia fica com o valor que devia ter.
            const rawEntries = Array.isArray(workData.entries) ? workData.entries : []
            const needsMigration = rawEntries.some((e: any) => typeof e.taxaHoraria !== "number")
            const entries = rawEntries.map((e: any) => ({
              ...e,
              taxaHoraria: typeof e.taxaHoraria === "number" ? e.taxaHoraria : currentRate,
            }))

            finalData = { entries, payments: Array.isArray(workData.payments) ? workData.payments : [], settings }

            // Persiste a migração no Firebase se necessário
            if (needsMigration && currentRate > 0) {
              // JSON roundtrip elimina undefined — equivalente a removeUndefined
              const clean = JSON.parse(JSON.stringify(finalData))
              setDoc(userDocRef, { workData: clean }, { merge: true })
                .catch(() => {}) // silencioso — não bloqueia o carregamento
            }
          } else {
          }
        } else {
          await setDoc(userDocRef, {
            workData: defaultAppData,
            migrated: true,
            createdAt: new Date().toISOString(),
          }, { merge: true })
        }

        setData(finalData)
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

  // -------- Save Data to Firebase --------
  useEffect(() => {
    if (!user || !data || isLoading || !hasLoadedRef.current) return
    const saveData = async () => {
      try {
        const cleanData = removeUndefined(data)
        await setDoc(doc(db, "users", user.uid), { workData: cleanData }, { merge: true })
      } catch (err) {
        console.error("❌ Erro ao salvar dados Firebase:", err)
      }
    }
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
      // ✅ Grava sempre o taxaHoraria vigente nesta entry
      taxaHoraria: entry.taxaHoraria ?? data.settings.taxaHoraria,
    }
    setData((prev) => ({
      ...prev,
      entries: [
        ...prev.entries.filter((e) => e.date !== entry.date),
        newEntry,
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }

  const updateEntry = (date: string, entry: DayEntry) => {
    const { normalHoras, extraHoras } = calculateHours(entry.date, entry.totalHoras)
    const newEntry: DayEntry = {
      ...entry,
      normalHoras,
      extraHoras,
      // ✅ Preserva o taxaHoraria já gravado na entry; se não existir, usa o atual
      taxaHoraria: entry.taxaHoraria ?? data.settings.taxaHoraria,
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
  const previousDateStr = formatLocalDate(previousDate)
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

  const importData = (appData: AppData) => {
    try {
      setData(appData)
      if (user) {
        const cleanData = removeUndefined(appData)
        setDoc(doc(db, "users", user.uid), { workData: cleanData }, { merge: true })
          .catch((err) => console.error("❌ Erro ao importar:", err))
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

  // ✅ getTotalValor usa o taxaHoraria de cada entry como fallback
  const getTotalValor = () =>
    data.entries.reduce(
      (sum, e) => sum + e.totalHoras * (e.taxaHoraria ?? data.settings.taxaHoraria),
      0
    )

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