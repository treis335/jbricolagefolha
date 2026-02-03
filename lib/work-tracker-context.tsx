"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  type AppData,
  type DayEntry,
  type Payment,
  type PaymentMethod,
  type Settings,
  defaultAppData,
  calculatePaidStatus,
} from "./types"

const STORAGE_KEY = "trabalhoDiario"

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
}

const WorkTrackerContext = createContext<WorkTrackerContextType | null>(null)

export function WorkTrackerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultAppData)
  const [isLoading, setIsLoading] = useState(true)
  const [paidDates, setPaidDates] = useState<Set<string>>(new Set())

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AppData
        // Handle migration from old format (caso haja campos antigos ou novos)
        const settings = {
          taxaHoraria: parsed.settings?.taxaHoraria ?? parsed.settings?.taxaNormal ?? 10,
          equipaComum: parsed.settings?.equipaComum || [],
        }
        // Garante que entries tenham services como array vazio se não existir (segurança)
        const entries = (parsed.entries || []).map(entry => ({
          ...entry,
          services: entry.services || undefined, // mantém se existir, senão undefined
        }))
        setData({
          entries,
          payments: (parsed.payments || []).map((p: Payment) => ({
            ...p,
            metodo: p.metodo || "Dinheiro",
          })),
          settings,
        })
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Calculate paid status whenever data changes
  useEffect(() => {
    if (!isLoading) {
      const newPaidDates = calculatePaidStatus(
        data.entries,
        data.payments,
        data.settings.taxaHoraria
      )
      setPaidDates(newPaidDates)
    }
  }, [data.entries, data.payments, data.settings.taxaHoraria, isLoading])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (error) {
        console.error("Failed to save data to localStorage:", error)
        alert("Erro ao salvar dados!")
      }
    }
  }, [data, isLoading])

  const addEntry = (entry: DayEntry) => {
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries.filter((e) => e.date !== entry.date), entry].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
  }

  const updateEntry = (date: string, entry: DayEntry) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.date === date ? entry : e)),
    }))
  }

  const deleteEntry = (date: string) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.date !== date),
    }))
  }

  const getEntry = (date: string) => {
    return data.entries.find((e) => e.date === date)
  }

  const getPreviousDayEntry = (date: string) => {
    const currentDate = new Date(date)
    const previousDate = new Date(currentDate)
    previousDate.setDate(previousDate.getDate() - 1)
    const previousDateStr = previousDate.toISOString().split("T")[0]
    return data.entries.find((e) => e.date === previousDateStr)
  }

  const addPayment = (payment: { date: string; valor: number; metodo: PaymentMethod }) => {
    const newPayment: Payment = {
      ...payment,
      id: Date.now().toString(),
    }
    setData((prev) => ({
      ...prev,
      payments: [...prev.payments, newPayment].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
  }

  const deletePayment = (id: string) => {
    setData((prev) => ({
      ...prev,
      payments: prev.payments.filter((p) => p.id !== id),
    }))
  }

  const updateSettings = (newSettings: Partial<Settings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }))
  }

  const clearAllData = () => {
    setData(defaultAppData)
    localStorage.removeItem(STORAGE_KEY)
  }

  const getEntriesInRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return data.entries.filter((e) => {
      const entryDate = new Date(e.date)
      return entryDate >= start && entryDate <= end
    })
  }

  const getTotalValor = () => {
    return data.entries.reduce(
      (sum, e) => sum + e.totalHoras * data.settings.taxaHoraria,
      0
    )
  }

  const getTotalPago = () => {
    return data.payments.reduce((sum, p) => sum + p.valor, 0)
  }

  const getFaltaReceber = () => {
    return getTotalValor() - getTotalPago()
  }

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
      }}
    >
      {children}
    </WorkTrackerContext.Provider>
  )
}

export function useWorkTracker() {
  const context = useContext(WorkTrackerContext)
  if (!context) {
    throw new Error("useWorkTracker must be used within a WorkTrackerProvider")
  }
  return context
}