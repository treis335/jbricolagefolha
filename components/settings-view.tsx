"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Euro, Users, Trash2, Plus, X, HardHat, Info } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"

export function SettingsView() {
  const { data, updateSettings, clearAllData } = useWorkTracker()
  const [newTeamMember, setNewTeamMember] = useState("")

  const handleTaxaChange = (value: string) => {
    const num = Number(value)
    if (!Number.isNaN(num) && num >= 0) {
      updateSettings({ taxaHoraria: num })
    }
  }

  const addTeamMember = () => {
    if (newTeamMember.trim() && !data.settings.equipaComum.includes(newTeamMember.trim())) {
      updateSettings({
        equipaComum: [...data.settings.equipaComum, newTeamMember.trim()],
      })
      setNewTeamMember("")
    }
  }

  const removeTeamMember = (member: string) => {
    updateSettings({
      equipaComum: data.settings.equipaComum.filter((m) => m !== member),
    })
  }

  const totalHoras = data.entries.reduce((sum, e) => sum + e.totalHoras, 0)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-4">
        {/* App Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
            <HardHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">JBricolage - Horas</h1>
          <p className="text-sm text-muted-foreground">Versão 1.0</p>
        </div>

        {/* Hourly Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Taxa Horária Única
            </CardTitle>
            <CardDescription>
              Defina a taxa para todas as horas (normais e extras)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxaHoraria">Taxa Horária (€/h)</Label>
              <Input
                id="taxaHoraria"
                type="number"
                value={data.settings.taxaHoraria}
                onChange={(e) => handleTaxaChange(e.target.value)}
                min={0}
                step={0.5}
                className="h-12 text-lg"
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                O valor é calculado automaticamente: Total Horas × Taxa Horária
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Equipa Frequente
            </CardTitle>
            <CardDescription>Adicione nomes para sugestões rápidas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTeamMember}
                onChange={(e) => setNewTeamMember(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTeamMember())}
                placeholder="Nome do membro..."
                className="h-12"
              />
              <Button onClick={addTeamMember} className="h-12 px-4">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            {data.settings.equipaComum.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.settings.equipaComum.map((member) => (
                  <Badge
                    key={member}
                    variant="secondary"
                    className="text-sm py-1.5 px-3 flex items-center gap-1"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum membro adicionado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Total de registos</span>
              <span className="font-semibold">{data.entries.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Total de pagamentos</span>
              <span className="font-semibold">{data.payments.length}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Horas totais registadas</span>
              <span className="font-semibold">{totalHoras}h</span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>Ações irreversíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12">
                  Limpar Todos os Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá apagar permanentemente todos os registos, pagamentos e definições.
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, Apagar Tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Info Note */}
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Dados guardados localmente</p>
            <p className="mt-1">
              Todos os dados ficam guardados no seu telemóvel. Não é necessária internet.
            </p>
          </div>
        </div>

        {/* Credits */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Desenvolvido por JoelReis</p>
        </div>
      </div>
    </ScrollArea>
  )
}
