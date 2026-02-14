//app/page.tsx
"use client"

import { useState } from "react"
import { useWorkTracker } from "@/lib/work-tracker-context"

import { CalendarView } from "@/components/calendar-view"
import { DayEntryForm } from "@/components/day-entry-form"
import { ReportsView } from "@/components/reports-view"
import { SettingsView } from "@/components/settings-view"
import { FinanceiroView } from "@/components/financeiro-view"
import { BottomNav, type TabType } from "@/components/bottom-nav"
import { Spinner } from "@/components/ui/spinner"

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>("calendar")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const { isLoading } = useWorkTracker()

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setFormOpen(true)
  }

  const handleAddToday = () => {
    setSelectedDate(new Date())
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setSelectedDate(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-muted-foreground text-sm">A carregar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-16">
        {activeTab === "calendar" && (
          <CalendarView
            onSelectDate={handleSelectDate}
            onAddToday={handleAddToday}
          />
        )}
        {activeTab === "reports" && <ReportsView />}
        {activeTab === "financeiro" && <FinanceiroView />}
        {activeTab === "settings" && <SettingsView />}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <DayEntryForm
        date={selectedDate}
        open={formOpen}
        onClose={handleCloseForm}
      />
    </div>
  )
}

export default function Page() {
  return <AppContent />
}
