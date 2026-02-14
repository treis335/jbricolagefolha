// components/admin/admin-bottom-nav.tsx
"use client"

import { LayoutDashboard, Users, FileText, Settings } from "lucide-react"

export type AdminTabType = "dashboard" | "collaborators" | "reports" | "settings"

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
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto px-2">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex flex-col items-center justify-center py-2 px-1 transition-colors
                  ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <Icon className={`h-5 w-5 mb-1 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium leading-none">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}