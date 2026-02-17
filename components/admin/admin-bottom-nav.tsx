// components/admin/admin-bottom-nav.tsx
"use client"

import { LayoutDashboard, Users, FileText, Settings, Euro } from "lucide-react"

export type AdminTabType = "dashboard" | "collaborators" | "finance" | "reports" | "settings"

interface AdminBottomNavProps {
  activeTab: AdminTabType
  onTabChange: (tab: AdminTabType) => void
}

export function AdminBottomNav({ activeTab, onTabChange }: AdminBottomNavProps) {
  const tabs = [
    { id: "dashboard" as AdminTabType,     label: "Início",    icon: LayoutDashboard },
    { id: "collaborators" as AdminTabType, label: "Equipa",    icon: Users },
    { id: "finance" as AdminTabType,       label: "Finanças",  icon: Euro },
    { id: "reports" as AdminTabType,       label: "Relatórios",icon: FileText },
    { id: "settings" as AdminTabType,      label: "Config.",   icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg">
      {/* Safe area padding for iOS */}
      <div className="px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="grid grid-cols-5 gap-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5 py-2 px-0.5 rounded-xl
                  transition-all duration-200 min-w-0
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {/* Active pill indicator */}
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-primary/10" />
                )}

                {/* Icon */}
                <Icon className={`h-[22px] w-[22px] shrink-0 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />

                {/* Label — truncated, never wraps */}
                <span className={`text-[10px] font-medium leading-none truncate w-full text-center transition-colors ${isActive ? "text-primary" : ""}`}>
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