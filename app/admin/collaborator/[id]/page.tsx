// app/admin/collaborator/[id]/page.tsx (ATUALIZADO com componentes melhorados)
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Calendar as CalendarIcon, FileText, User } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"

// Componentes das tabs - VERSÕES MELHORADAS
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

  // Buscar dados do colaborador
  useEffect(() => {
    const fetchCollaborator = async () => {
      if (!collaboratorId) return

      try {
        setLoading(true)
        const userRef = doc(db, "users", collaboratorId)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
          setError("Colaborador não encontrado")
          return
        }

        const userData = userSnap.data()

        // Calcular estatísticas
        const entries = userData.workData?.entries || []
        const currentRate = userData.workData?.settings?.taxaHoraria || 0

        let totalHoursThisMonth = 0
        let totalHoursAllTime = 0

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        entries.forEach((entry: any) => {
          const totalHoras = entry.totalHoras || 0
          totalHoursAllTime += totalHoras

          if (entry.date) {
            const [year, month] = entry.date.split("-").map(Number)
            if (year === currentYear && month - 1 === currentMonth) {
              totalHoursThisMonth += totalHoras
            }
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
        console.error("Erro ao carregar colaborador:", err)
        setError("Erro ao carregar dados do colaborador")
      } finally {
        setLoading(false)
      }
    }

    fetchCollaborator()
  }, [collaboratorId])

  // Loading state
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

  // Error state
  if (error || !collaborator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">
                {error || "Colaborador não encontrado"}
              </p>
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

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="p-4 pb-24 space-y-6">
          {/* Header com botão voltar */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{collaborator.name}</h1>
              <p className="text-sm text-muted-foreground">{collaborator.email}</p>
            </div>
            {collaborator.migrated && (
              <Badge variant="outline" className="text-xs">
                Migrado
              </Badge>
            )}
          </div>

          {/* Info Cards Rápidos */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-blue-900 dark:text-blue-200 mb-1 font-medium">
                  Taxa Horária
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {collaborator.currentRate.toFixed(2)} €/h
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-green-900 dark:text-green-200 mb-1 font-medium">
                  Horas (Mês)
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {collaborator.totalHoursThisMonth.toFixed(1)}h
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Navigation */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Calendário</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Relatórios</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <CollaboratorOverview collaborator={collaborator} />
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <CollaboratorCalendarView
                collaboratorId={collaborator.id}
                collaboratorName={collaborator.name}
                currentRate={collaborator.currentRate}
                entries={collaborator.entries}
              />
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
              <CollaboratorReportsView collaborator={collaborator} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}