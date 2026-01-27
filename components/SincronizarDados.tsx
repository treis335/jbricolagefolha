'use client'

import { useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Download, Upload, AlertCircle, CheckCircle2, Share } from "lucide-react" // Adiciona Share
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea" // Para colar texto

const STORAGE_KEY = "trabalhoDiario"

export function SincronizarDados() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)
  const [textoColado, setTextoColado] = useState('')

  // Função de exportar com Web Share (para sincronização local)
  const exportarParaSync = async () => {
    const conteudo = localStorage.getItem(STORAGE_KEY)
    if (!conteudo) {
      setMensagem("Não há dados para exportar.")
      setIsSuccess(false)
      return
    }

    const blob = new Blob([conteudo], { type: 'application/json' })
    const file = new File([blob], `meus-horas-backup-${new Date().toISOString().split('T')[0]}.json`, { type: 'application/json' })

    const shareData = {
      files: [file],
      title: 'Backup dos Meus Dados',
      text: 'Transfere este ficheiro para o teu outro dispositivo para sincronizar as horas de trabalho.',
    }

    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        setMensagem("Partilhado! Envia para ti mesmo via WhatsApp/Email e importa no outro dispositivo.")
        setIsSuccess(true)
        return
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Erro ao partilhar:", err)
      }
    }

    // Fallback 1: Copiar texto
    try {
      await navigator.clipboard.writeText(conteudo)
      setMensagem("Copiado para a área de transferência! Cola no WhatsApp/Email e envia para ti mesmo.")
      setIsSuccess(true)
    } catch {
      // Fallback 2: Download clássico
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
      setMensagem("Backup descarregado! Encontra na pasta Downloads.")
      setIsSuccess(true)
    }
  }

  // Função de importar (mantém a tua + nova opção de texto colado)
  const importarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const texto = ev.target?.result as string
        const parsed = JSON.parse(texto)
        if (!parsed || typeof parsed !== 'object' || 
            (!parsed.entries && !parsed.payments && !parsed.settings)) {
          throw new Error("Formato inválido")
        }
        localStorage.setItem(STORAGE_KEY, texto)
        setMensagem("Dados importados! Recarregando a app...")
        setIsSuccess(true)
        setTimeout(() => window.location.reload(), 2000)
      } catch {
        setMensagem("Erro: ficheiro inválido.")
        setIsSuccess(false)
      }
    }
    reader.readAsText(file)
  }

  const importarTextoColado = () => {
    if (!textoColado.trim()) {
      setMensagem("Cole algum texto primeiro.")
      setIsSuccess(false)
      return
    }
    try {
      const parsed = JSON.parse(textoColado)
      if (!parsed || typeof parsed !== 'object' || 
          (!parsed.entries && !parsed.payments && !parsed.settings)) {
        throw new Error("Formato inválido")
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      setMensagem("Dados importados do texto! Recarregando...")
      setIsSuccess(true)
      setTimeout(() => window.location.reload(), 2000)
    } catch {
      setMensagem("Texto inválido. Certifica-te que é JSON completo.")
      setIsSuccess(false)
    }
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
            onClick={exportarParaSync}
            variant="outline"
            className="flex-1"
          >
            <Share className="h-4 w-4 mr-2" />
            Exportar para Sync (WhatsApp/Email)
          </Button>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={importarArquivo}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Arquivo
          </Button>
        </div>

        {/* Opção de importar texto colado */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Ou cola o texto JSON aqui:</label>
          <Textarea
            value={textoColado}
            onChange={(e) => setTextoColado(e.target.value)}
            placeholder="Cole o conteúdo JSON copiado..."
            className="h-32 font-mono text-sm"
          />
          <Button 
            onClick={importarTextoColado}
            disabled={!textoColado.trim()}
          >
            Importar Texto Colado
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
          Funciona offline. Usa WhatsApp/Email para transferir entre dispositivos.
        </p>
      </CardContent>
    </Card>
  )
}