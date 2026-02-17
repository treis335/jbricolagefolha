// app/admin/collaborator/[id]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft, Calendar as CalendarIcon, FileText, User,
  Euro, Clock, TrendingUp, Mail, AtSign, Layers,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"

import { CollaboratorCalendarView } from "@/components/admin/collaborator-calendar-view"
import { CollaboratorReportsView } from "@/components/admin/collaborator-reports-view"
import { CollaboratorOverview } from "@/components/admin/collaborator-overview"

export default function CollaboratorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const collaboratorId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [collaborator, setCollaborator] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCollaborator = async () => {
      if (!collaboratorId) return
      try {
        setLoading(true)
        const userSnap = await getDoc(doc(db, "users", collaboratorId))
        if (!userSnap.exists()) { setError("Colaborador não encontrado"); return }

        const userData = userSnap.data()
        const entries = userData.workData?.entries || []
        const currentRate = userData.workData?.settings?.taxaHoraria || 0

        let totalHoursThisMonth = 0, totalHoursAllTime = 0
        const now = new Date()

        entries.forEach((entry: any) => {
          const h = entry.totalHoras || 0
          totalHoursAllTime += h
          if (entry.date) {
            const [year, month] = entry.date.split("-").map(Number)
            if (year === now.getFullYear() && month - 1 === now.getMonth())
              totalHoursThisMonth += h
          }
        })

        setCollaborator({
          id: collaboratorId,
          name: userData.name || userData.username || "Sem nome",
          username: userData.username || "",
          email: userData.email || "",
          currentRate,
          totalHoursThisMonth,
          totalHoursAllTime,
          entries,
          role: userData.role || "worker",
          createdAt: userData.createdAt,
          migrated: userData.migrated || false,
        })
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar dados do colaborador")
      } finally {
        setLoading(false)
      }
    }
    fetchCollaborator()
  }, [collaboratorId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">A carregar colaborador...</p>
        </div>
      </div>
    )
  }

  if (error || !collaborator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">{error || "Colaborador não encontrado"}</p>
              <Button onClick={() => router.push("/admin")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = collaborator.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()

  const costThisMonth = collaborator.totalHoursThisMonth * collaborator.currentRate

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="max-w-7xl mx-auto">

          {/* ── Hero / Profile Header ── */}
          <div className="relative bg-gradient-to-br from-primary/5 via-primary/3 to-background border-b">
            <div className="px-4 pt-5 pb-6 md:px-8 md:pt-8 md:pb-8 box-border w-full">

              {/* Back button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
                className="mb-5 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Colaboradores
              </Button>

              {/* Profile row */}
              <div className="flex items-start gap-4">

                {/* Avatar */}
                <div className="flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 text-primary font-bold text-xl md:text-3xl shrink-0 shadow-sm">
                  {initials}
                </div>

                {/* Name / meta */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h1 className="text-xl md:text-3xl font-bold tracking-tight leading-tight break-words">
                      {collaborator.name}
                    </h1>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge
                      className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"
                      variant="outline"
                    >
                      {collaborator.role === "admin" ? "Administrador" : "Colaborador"}
                    </Badge>
                    {collaborator.migrated && (
                      <Badge variant="outline" className="text-xs">Migrado</Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {collaborator.email && (
                      <span className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{collaborator.email}</span>
                      </span>
                    )}
                    {collaborator.username && (
                      <span className="flex items-center gap-1.5">
                        <AtSign className="h-3 w-3 shrink-0" />
                        <span className="truncate">{collaborator.username}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── KPI Strip ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 w-full">
                {[
                  {
                    icon: <Euro className="h-4 w-4" />,
                    label: "Taxa Horária",
                    value: `${collaborator.currentRate.toFixed(2)} €/h`,
                    theme: "blue",
                  },
                  {
                    icon: <Clock className="h-4 w-4" />,
                    label: "Horas (Mês)",
                    value: `${collaborator.totalHoursThisMonth.toFixed(1)}h`,
                    theme: "purple",
                  },
                  {
                    icon: <TrendingUp className="h-4 w-4" />,
                    label: "Custo (Mês)",
                    value: `${costThisMonth.toFixed(2)} €`,
                    theme: "emerald",
                  },
                  {
                    icon: <Layers className="h-4 w-4" />,
                    label: "Horas Totais",
                    value: `${collaborator.totalHoursAllTime.toFixed(1)}h`,
                    theme: "orange",
                  },
                ].map((kpi) => {
                  const themes: Record<string, string> = {
                    blue:    "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
                    purple:  "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
                    emerald: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
                    orange:  "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
                  }
                  const iconThemes: Record<string, string> = {
                    blue:    "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
                    purple:  "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
                    emerald: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
                    orange:  "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400",
                  }
                  return (
                    <div
                      key={kpi.label}
                      className={`flex items-center gap-2 md:gap-3 px-3 py-3 md:px-4 md:py-3.5 rounded-xl border ${themes[kpi.theme]}`}
                    >
                      <div className={`p-1.5 md:p-2 rounded-lg shrink-0 ${iconThemes[kpi.theme]}`}>
                        {kpi.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium opacity-70 leading-none mb-1.5 truncate">{kpi.label}</p>
                        <p className="text-sm md:text-lg font-bold leading-none truncate">{kpi.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="px-4 py-6 md:px-8 md:py-8 space-y-6 box-border w-full">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="h-11 p-1 bg-muted/60 rounded-xl w-full grid grid-cols-3 md:w-auto md:grid md:grid-cols-3">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-9"
                >
                  <User className="h-4 w-4" />
                  <span>Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="flex items-center gap-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-9"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>Calendário</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="flex items-center gap-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-9"
                >
                  <FileText className="h-4 w-4" />
                  <span>Relatórios</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 focus-visible:outline-none">
                <CollaboratorOverview collaborator={collaborator} />
              </TabsContent>

              <TabsContent value="calendar" className="mt-6 focus-visible:outline-none">
                <CollaboratorCalendarView
                  collaboratorId={collaborator.id}
                  collaboratorName={collaborator.name}
                  currentRate={collaborator.currentRate}
                  entries={collaborator.entries}
                />
              </TabsContent>

              <TabsContent value="reports" className="mt-6 focus-visible:outline-none">
                <CollaboratorReportsView collaborator={collaborator} />
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </ScrollArea>
    </div>
  )
}