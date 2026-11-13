// components/admin/data-backup-tools.tsx
// Ferramentas de segurança dos dados (só leitura — não altera nada):
//  1) Cópia completa de todas as coleções num ficheiro JSON
//  2) Relatório de tamanho dos documentos dos colaboradores vs. limite de 1 MB do Firestore
"use client"

import { useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { Loader2, Download, Gauge, CheckCircle2, AlertCircle } from "lucide-react"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"

const LIMITE = 1_048_576 // 1 MiB por documento no Firestore
const COLECOES = [
  "users", "obras", "escalas", "ferramentas", "ferramentasHistorico",
  "alertasHoras", "recibos", "subDias", "subPagamentos", "config",
] as const

const bytesDe = (v: unknown) => new Blob([JSON.stringify(v)]).size
const kb = (n: number) => n >= 1_048_576 ? `${(n / 1_048_576).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`

interface LinhaTamanho { id: string; nome: string; bytes: number; dias: number; pagamentos: number }

export function DataBackupTools() {
  const [backup, setBackup] = useState<"idle" | "loading" | "ok" | "erro">("idle")
  const [backupInfo, setBackupInfo] = useState("")
  const [tamanho, setTamanho] = useState<"idle" | "loading" | "erro">("idle")
  const [linhas, setLinhas] = useState<LinhaTamanho[] | null>(null)

  const exportarTudo = async () => {
    setBackup("loading"); setBackupInfo("")
    try {
      const out: Record<string, Record<string, unknown>> = {}
      const erros: string[] = []
      let total = 0
      for (const nome of COLECOES) {
        try {
          const snap = await getDocs(collection(db, nome))
          out[nome] = {}
          snap.forEach(d => { out[nome][d.id] = d.data(); total++ })
        } catch (e) {
          erros.push(`${nome}: ${(e as { code?: string })?.code ?? "erro"}`)
        }
      }
      const payload = { _geradoEm: new Date().toISOString(), _documentos: total, _erros: erros, ...out }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jbricolage-backup-completo-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setBackup("ok")
      setBackupInfo(`${total} documentos em ${Object.keys(out).length} coleções${erros.length ? ` · sem acesso a: ${erros.join(", ")}` : ""}`)
    } catch (e) {
      setBackup("erro"); setBackupInfo((e as Error)?.message ?? "Erro desconhecido")
    }
  }

  const analisar = async () => {
    setTamanho("loading")
    try {
      const snap = await getDocs(collection(db, "users"))
      const l: LinhaTamanho[] = snap.docs.map(d => {
        const x = d.data()
        return {
          id: d.id,
          nome: x.username || x.name || x.email || d.id,
          bytes: bytesDe(x),
          dias: Array.isArray(x.workData?.entries) ? x.workData.entries.length : 0,
          pagamentos: Array.isArray(x.workData?.payments) ? x.workData.payments.length : 0,
        }
      }).sort((a, b) => b.bytes - a.bytes)
      setLinhas(l); setTamanho("idle")
    } catch { setTamanho("erro") }
  }

  // estimativa para o maior: ~22 dias úteis por mês
  const maior = linhas?.[0]
  const mesesAteLimite = maior && maior.dias > 0
    ? Math.floor((LIMITE * 0.9 - maior.bytes) / ((maior.bytes / maior.dias) * 22))
    : null

  return (
    <div className="space-y-5">
      {/* Cópia completa */}
      <div className="space-y-2.5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Cópia completa: utilizadores, obras, escalas, ferramentas, recibos, dias e pagamentos dos empreiteiros e configurações. Faz uma antes de qualquer alteração grande.
        </p>
        <button onClick={exportarTudo} disabled={backup === "loading"}
          className={cn("w-full h-11 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            backup === "ok" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : backup === "erro" ? "border-red-500 text-red-600 dark:text-red-400" : "border-border hover:bg-muted")}>
          {backup === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : backup === "ok" ? <CheckCircle2 className="h-4 w-4" />
            : backup === "erro" ? <AlertCircle className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {backup === "loading" ? "A exportar…" : backup === "ok" ? "Download concluído" : "Exportar cópia completa"}
        </button>
        {backupInfo && <p className={cn("text-xs px-1", backup === "erro" ? "text-red-500" : "text-muted-foreground")}>{backupInfo}</p>}
      </div>

      {/* Tamanho */}
      <div className="space-y-2.5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Cada colaborador guarda todos os dias num só documento, e o Firestore só aceita 1 MB por documento. Aqui vês quão perto cada um está.
        </p>
        <button onClick={analisar} disabled={tamanho === "loading"}
          className="w-full h-11 rounded-xl border border-border hover:bg-muted text-sm font-medium flex items-center justify-center gap-2">
          {tamanho === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
          {tamanho === "loading" ? "A analisar…" : "Analisar tamanho dos dados"}
        </button>
        {tamanho === "erro" && <p className="text-xs text-red-500 px-1">Não foi possível ler os dados.</p>}

        {linhas && (
          <div className="space-y-2 pt-1">
            {linhas.map(l => {
              const pct = Math.min(100, (l.bytes / LIMITE) * 100)
              return (
                <div key={l.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold truncate">{l.nome}</span>
                    <span className="text-muted-foreground shrink-0">{kb(l.bytes)} · {l.dias} dias · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", pct > 70 ? "bg-red-500" : pct > 40 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                </div>
              )
            })}
            {maior && (
              <p className="text-xs rounded-xl bg-muted/50 p-3 leading-relaxed">
                O maior é <b>{maior.nome}</b> com {kb(maior.bytes)} ({((maior.bytes / LIMITE) * 100).toFixed(1)}% do limite).
                {mesesAteLimite !== null && (mesesAteLimite > 0
                  ? <> Ao ritmo atual (~22 dias por mês) chega a 90% em cerca de <b>{mesesAteLimite >= 12 ? `${(mesesAteLimite / 12).toFixed(1)} anos` : `${mesesAteLimite} meses`}</b>.</>
                  : <> Já está a 90% ou mais — convém migrar já.</>)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
