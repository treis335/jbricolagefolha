"use client"

import { CalendarDays, BarChart3, Wallet, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabType = "calendar" | "reports" | "financeiro" | "settings"

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "calendar" as TabType, label: "Calendário", icon: CalendarDays },
    { id: "reports" as TabType, label: "Relatórios", icon: BarChart3 },
    { id: "financeiro" as TabType, label: "Financeiro", icon: Wallet },
    { id: "settings" as TabType, label: "Definições", icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
