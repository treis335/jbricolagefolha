// components/admin/admin-bottom-nav.tsx (ATUALIZADO com Financeiro)
"use client"

import { LayoutDashboard, Users, FileText, Settings, Euro } from "lucide-react"

export type AdminTabType = "dashboard" | "collaborators" | "finance" | "reports" | "settings"

interface AdminBottomNavProps {
  activeTab: AdminTabType
  onTabChange: (tab: AdminTabType) => void
}

export function AdminBottomNav({ activeTab, onTabChange }: AdminBottomNavProps) {
  const tabs = [
    {
      id: "dashboard" as AdminTabType,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "collaborators" as AdminTabType,
      label: "Colaboradores",
      icon: Users,
    },
    {
      id: "finance" as AdminTabType,
      label: "Financeiro",
      icon: Euro,
    },
    {
      id: "reports" as AdminTabType,
      label: "Relatórios",
      icon: FileText,
    },
    {
      id: "settings" as AdminTabType,
      label: "Definições",
      icon: Settings,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
      <div className="max-w-7xl mx-auto px-2 py-2">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg
                  transition-colors duration-200
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}