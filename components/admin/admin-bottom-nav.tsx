// components/admin/admin-bottom-nav.tsx
"use client"

import { LayoutDashboard, Users, FileText, Settings, Euro, HardHat } from "lucide-react"
import { cn } from "@/lib/utils"

export type AdminTabType = "dashboard" | "collaborators" | "finance" | "obras" | "reports" | "settings"

interface AdminBottomNavProps {
  activeTab: AdminTabType
  onTabChange: (tab: AdminTabType) => void
}

const tabs = [
  { id: "dashboard"     as AdminTabType, label: "Início",     icon: LayoutDashboard },
  { id: "collaborators" as AdminTabType, label: "Equipa",     icon: Users           },
  { id: "obras"         as AdminTabType, label: "Obras",      icon: HardHat         },
  { id: "finance"       as AdminTabType, label: "Finanças",   icon: Euro            },
  { id: "reports"       as AdminTabType, label: "Relat.", icon: FileText },
  { id: "settings"      as AdminTabType, label: "Config.", icon: Settings },
]

export function AdminBottomNav({ activeTab, onTabChange }: AdminBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Glassmorphism backdrop */}
      <div
        className="absolute inset-0 bg-card/85 backdrop-blur-xl border-t border-border/50"
        style={{ WebkitBackdropFilter: "blur(20px)" }}
      />

      <div className="relative grid grid-cols-6 max-w-2xl mx-auto px-0.5 pb-safe"
           style={{ height: "64px" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 h-full",
                "transition-all duration-200 ease-out press-effect",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active pill */}
              {isActive && (
                <span
                  className="absolute inset-x-0.5 top-1.5 bottom-1.5 rounded-xl bg-primary/12 dark:bg-primary/15 animate-scale-in"
                  aria-hidden
                />
              )}

              {/* Active top indicator */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary"
                  style={{ animation: "nav-indicator 0.25s cubic-bezier(0.34,1.56,0.64,1) both" }}
                  aria-hidden
                />
              )}

              {/* Icon */}
              <span className={cn(
                "relative z-10 transition-all duration-200",
                isActive ? "text-primary scale-110" : "text-muted-foreground/70"
              )}>
                <Icon
                  className={cn(
                    "transition-all duration-200",
                    isActive ? "h-[18px] w-[18px] drop-shadow-[0_0_6px_oklch(0.55_0.18_250/0.4)]" : "h-[18px] w-[18px]"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </span>

              {/* Label */}
              <span className={cn(
                "relative z-10 text-[9px] font-semibold tracking-tight transition-all duration-200 leading-none truncate w-full text-center",
                isActive ? "text-primary" : "text-muted-foreground/60"
              )}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
