// components/admin/admin-reports-view.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AdminReportsView() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Análises e exportações
          </p>
        </div>

        {/* Available Reports */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Relatório Mensal
              </CardTitle>
              <CardDescription>
                Resumo de horas e custos por colaborador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar (Em breve)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Relatório Anual
              </CardTitle>
              <CardDescription>
                Análise completa do ano fiscal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar (Em breve)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Histórico de Taxas
              </CardTitle>
              <CardDescription>
                Alterações de taxas horárias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar (Em breve)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="border-blue-500/30 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              💡 <strong>Em desenvolvimento:</strong> Funcionalidades de exportação e análise avançada estarão disponíveis em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}