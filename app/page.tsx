//app/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { CalendarView } from "@/components/calendar-view"
import { BottomNav, type TabType } from "@/components/bottom-nav"
import { SideNav } from "@/components/side-nav"
import dynamic from "next/dynamic"

const DayEntryForm   = dynamic(() => import("@/components/day-entry-form").then(m => ({ default: m.DayEntryForm })))
const MinhasFerramentasView = dynamic(() => import("@/components/minhas-ferramentas-view").then(m => ({ default: m.MinhasFerramentasView })))
const SettingsView   = dynamic(() => import("@/components/settings-view").then(m => ({ default: m.SettingsView })))
const FinanceiroView = dynamic(() => import("@/components/financeiro-view").then(m => ({ default: m.FinanceiroView })))

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="20" width="24" height="4" rx="2" fill="currentColor" className="text-primary" />
              <rect x="8" y="14" width="16" height="4" rx="2" fill="currentColor" className="text-primary opacity-70" />
              <rect x="12" y="8" width="8" height="4" rx="2" fill="currentColor" className="text-primary opacity-40" />
            </svg>
          </div>
          <svg className="absolute -inset-2 animate-spin-smooth" width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeDasharray="56 170" className="text-primary/30" />
          </svg>
        </div>
        <div className="text-center animate-fade-in delay-100">
          <p className="text-sm font-black tracking-widest text-foreground/80 uppercase">JBRICOLAGE</p>
          <p className="text-xs text-muted-foreground/50 mt-1">A carregar dados…</p>
        </div>
        <div className="flex flex-col gap-2 w-48 animate-fade-in delay-150">
          <div className="skeleton h-2 w-full" />
          <div className="skeleton h-2 w-3/4" />
          <div className="skeleton h-2 w-5/6" />
        </div>
      </div>
    </div>
  )
}

// Keeps tabs mounted after first visit (no re-fetch)
function TabPane({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [everActive, setEverActive] = useState(active)
  useEffect(() => { if (active) setEverActive(true) }, [active])
  if (!everActive) return null
  return (
    <div style={{
      display: active ? undefined : "none",
      animation: active ? "fade-in-up 0.25s cubic-bezier(0.16,1,0.3,1) both" : "none",
    }}>
      {children}
    </div>
  )
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>("calendar")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const { isLoading } = useWorkTracker()

  // O botão Ferramentas do cabeçalho (mobile) muda o separador; o cabeçalho é informado do separador ativo
  useEffect(() => {
    const h = (e: Event) => {
      const t = (e as CustomEvent<TabType>).detail
      if (t) setActiveTab(t)
    }
    window.addEventListener("jb:set-tab", h)
    return () => window.removeEventListener("jb:set-tab", h)
  }, [])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("jb:tab-changed", { detail: activeTab }))
  }, [activeTab])

  const handleSelectDate = (date: Date) => { setSelectedDate(date); setFormOpen(true) }
  const handleAddToday   = () => { setSelectedDate(new Date()); setFormOpen(true) }
  const handleCloseForm  = () => { setFormOpen(false); setSelectedDate(null) }

  if (isLoading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-background flex">

      {/* Desktop Sidebar (≥ lg) */}
      <SideNav activeTab={activeTab} onTabChange={setActiveTab} onAddToday={handleAddToday} />

      {/* Main content */}
      <div className="flex-1 min-w-0 lg:pl-64 overflow-hidden">
        <main className="flex-1 pb-16 lg:pb-0">
          <TabPane active={activeTab === "calendar"}>
            <CalendarView onSelectDate={handleSelectDate} onAddToday={handleAddToday} />
          </TabPane>
          <TabPane active={activeTab === "financeiro"}>
            <FinanceiroView />
          </TabPane>
          <TabPane active={activeTab === "ferramentas"}>
            <MinhasFerramentasView />
          </TabPane>
          <TabPane active={activeTab === "settings"}>
            <SettingsView />
          </TabPane>
        </main>
      </div>

      {/* Mobile Bottom Nav (< lg) */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <DayEntryForm date={selectedDate} open={formOpen} onClose={handleCloseForm} />
    </div>
  )
}

export default function Page() {
  return <AppContent />
}
