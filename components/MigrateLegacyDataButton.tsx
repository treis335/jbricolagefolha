"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"

// Função auxiliar para normalizar equipa antiga → array
function normalizeLegacyEquipa(equipa: unknown): string[] {
  if (Array.isArray(equipa)) {
    // já está no formato novo → limpa apenas
    return equipa
      .filter((item): item is string => typeof item === "string")
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  if (typeof equipa === "string") {
    // formato antigo: "Eu, leo, pai" ou "Eu; Leo" ou "Eu Leo"
    return equipa
      .split(/[,;]\s*|\s+/)          // divide por , ; ou espaços múltiplos
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  // qualquer outro caso (null, undefined, objeto estranho...)
  return []
}

export function MigrateLegacyDataButton() {
  const { data, updateEntry } = useWorkTracker()

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState<string>("")
  const [migratedCount, setMigratedCount] = useState(0)

  // Verifica se há algo para migrar
  const entriesToMigrate = data.entries.filter(entry => typeof entry.equipa === "string")
  const hasLegacy = entriesToMigrate.length > 0

  if (!hasLegacy) {
    return null // ou podes mostrar algo como "Dados já atualizados"
  }

  const handleMigrate = async () => {
    setStatus("loading")
    setMessage(`A migrar ${entriesToMigrate.length} registos antigos...`)
    setMigratedCount(0)

    try {
      let count = 0

      for (const entry of entriesToMigrate) {
        const newEquipa = normalizeLegacyEquipa(entry.equipa)

        // Atualiza apenas o campo equipa (mantém o resto igual)
        updateEntry(entry.date, {
          ...entry,
          equipa: newEquipa
        })

        count++
        setMigratedCount(count)
      }

      setStatus("success")
      setMessage(`Migração concluída! ${count} registos atualizados para o formato array.`)
    } catch (err) {
      console.error("Erro durante a migração:", err)
      setStatus("error")
      setMessage("Ocorreu um erro ao atualizar os registos. Verifica o console.")
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Migrar dados antigos</h3>
          <p className="text-sm text-muted-foreground">
            {entriesToMigrate.length} registos ainda usam <code>equipa</code> como texto (formato antigo).
          </p>
        </div>

        <Button
          onClick={handleMigrate}
          disabled={status === "loading"}
          variant={status === "success" ? "default" : status === "error" ? "destructive" : "secondary"}
        >
          {status === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === "loading"
            ? `A migrar... (${migratedCount}/${entriesToMigrate.length})`
            : status === "success"
              ? "Concluído!"
              : "Iniciar migração"}
        </Button>
      </div>

      {status !== "idle" && (
        <Alert variant={status === "success" ? "default" : "destructive"}>
          {status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : status === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : null}
          <AlertTitle>
            {status === "success" ? "Sucesso" : status === "error" ? "Erro" : "Em progresso"}
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}