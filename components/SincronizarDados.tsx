'use client'

import { useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" // não usamos input aqui, mas para consistência
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const STORAGE_KEY = "trabalhoDiario"

export function SincronizarDados() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)

  const exportar = () => {
    const conteudo = localStorage.getItem(STORAGE_KEY)
    if (!conteudo) {
      setMensagem("Não há dados para exportar.")
      setIsSuccess(false)
      return
    }

    const blob = new Blob([conteudo], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jbricolage-horas-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    setMensagem("Backup criado! Guarda o ficheiro e transfere para o outro dispositivo.")
    setIsSuccess(true)
  }

  const importar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const texto = ev.target?.result as string
        const parsed = JSON.parse(texto)

        // Validação simples
        if (!parsed || typeof parsed !== 'object' || 
            (!parsed.entries && !parsed.payments && !parsed.settings)) {
          throw new Error("Formato inválido")
        }

        localStorage.setItem(STORAGE_KEY, texto)
        setMensagem("Dados importados com sucesso! Recarregando a app...")
        setIsSuccess(true)

        setTimeout(() => window.location.reload(), 2200)
      } catch (err) {
        setMensagem("Erro: ficheiro inválido ou corrompido.")
        setIsSuccess(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" />
          Backup & Sincronização
        </CardTitle>
        <CardDescription>
          Transfere os teus dados entre telemóvel e computador sem servidores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={exportar}
            variant="outline"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Dados (JSON)
          </Button>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={importar}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Dados
          </Button>
        </div>

        {mensagem && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-md ${
            isSuccess ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                       : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          }`}>
            {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {mensagem}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Transfere por email, WhatsApp, USB, etc. Funciona offline.
        </p>
      </CardContent>
    </Card>
  )
}