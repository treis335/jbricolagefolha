"use client"

import { CalendarDays, Wallet, Wrench, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabType = "calendar" | "financeiro" | "ferramentas" | "settings"

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs = [
  { id: "calendar"   as TabType, label: "Calendário", icon: CalendarDays },
  { id: "financeiro" as TabType, label: "Financeiro",  icon: Wallet       },
  { id: "ferramentas" as TabType, label: "Ferramentas", icon: Wrench       },
  { id: "settings"   as TabType, label: "Definições",  icon: Settings     },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 bg-card/80 backdrop-blur-xl border-t border-border/60"
        style={{ WebkitBackdropFilter: "blur(20px)" }}
      />

      <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto px-2 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5",
                "transition-all duration-200 ease-out press-effect",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active pill background */}
              {isActive && (
                <span
                  className="absolute inset-x-2 top-2 bottom-2 rounded-xl bg-primary/10 animate-scale-in"
                  aria-hidden
                />
              )}

              {/* Active top indicator bar */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                  style={{ animation: "nav-indicator 0.25s cubic-bezier(0.34,1.56,0.64,1) both" }}
                  aria-hidden
                />
              )}

              {/* Icon */}
              <span
                className={cn(
                  "relative z-10 transition-all duration-200",
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground/70 group-hover:text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "drop-shadow-[0_0_6px_oklch(0.55_0.18_250/0.4)]"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </span>

              {/* Label */}
              <span
                className={cn(
                  "relative z-10 text-[10px] font-semibold tracking-tight transition-all duration-200 leading-none",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/60"
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
