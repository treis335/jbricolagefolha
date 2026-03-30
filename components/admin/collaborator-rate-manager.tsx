// components/admin/collaborator-rate-manager.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Euro, TrendingUp, History, Pencil, Check, X,
  ArrowUp, ArrowDown, Minus, ChevronRight,
} from "lucide-react"
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface RateHistoryEntry {
  taxa: number
  taxaAnterior: number | null
  data: string
  alteradoPor: string
  motivo?: string
}

interface CollaboratorRateManagerProps {
  collaboratorId: string
  collaboratorName: string
  currentRate: number
  rateHistory: RateHistoryEntry[]
  onRateUpdated: (newRate: number, newHistory: RateHistoryEntry[]) => void
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <Minus className="h-3 w-3 text-muted-foreground" />
  const positive = delta > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
      positive
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
        : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
    }`}>
      {positive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(delta).toFixed(2)}€
    </span>
  )
}

function HistoryRow({ h, isLatest }: { h: RateHistoryEntry; isLatest: boolean }) {
  const delta = h.taxaAnterior !== null ? h.taxa - h.taxaAnterior : null
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{formatCurrency(h.taxa)}/h</span>
          {h.taxaAnterior !== null && (
            <span className="text-xs text-muted-foreground">← {formatCurrency(h.taxaAnterior)}/h</span>
          )}
          {delta !== null && <DeltaBadge delta={delta} />}
          {isLatest && <Badge variant="outline" className="text-[10px] px-1.5 py-0">atual</Badge>}
        </div>
        {h.motivo && (
          <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{h.motivo}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(h.data)}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{h.alteradoPor}</p>
      </div>
    </div>
  )
}

export function CollaboratorRateManager({
  collaboratorId,
  collaboratorName,
  currentRate,
  rateHistory,
  onRateUpdated,
}: CollaboratorRateManagerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newRate, setNewRate] = useState<string>(currentRate.toFixed(2))
  const [motivo, setMotivo] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedRate = parseFloat(newRate)
  const isValid = !isNaN(parsedRate) && parsedRate > 0
  const hasChanged = isValid && parsedRate !== currentRate

  const sorted = [...rateHistory].reverse()
  const latest = sorted[0] ?? null

  const handleSave = async () => {
    if (!isValid || !hasChanged) return
    setSaving(true)
    setError(null)
    try {
      const historyEntry: RateHistoryEntry = {
        taxa: parsedRate,
        taxaAnterior: currentRate,
        data: new Date().toISOString(),
        alteradoPor: "admin",
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      }
      const userRef = doc(db, "users", collaboratorId)
      await updateDoc(userRef, {
        "workData.settings.taxaHoraria": parsedRate,
        "rateHistory": arrayUnion(historyEntry),
      })
      const snap = await getDoc(userRef)
      const updatedHistory: RateHistoryEntry[] = snap.data()?.rateHistory || []
      onRateUpdated(parsedRate, updatedHistory)
      setIsEditing(false)
      setMotivo("")
      setShowConfirm(false)
    } catch (err) {
      console.error(err)
      setError("Erro ao guardar. Tenta novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <Euro className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Taxa Horária</h3>
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* Rate display / edit */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Taxa atual</p>
              {!isEditing ? (
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(currentRate)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/h</span>
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    <Input
                      type="number" step="0.50" min="0"
                      value={newRate}
                      onChange={e => setNewRate(e.target.value)}
                      className="pl-6 w-24 h-9 text-base font-bold"
                      autoFocus
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">/h</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isEditing ? (
                <Button size="sm" variant="outline" className="h-8 text-xs"
                  onClick={() => { setNewRate(currentRate.toFixed(2)); setIsEditing(true) }}>
                  <Pencil className="h-3 w-3 mr-1.5" />Alterar
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => { setIsEditing(false); setMotivo(""); setError(null) }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!hasChanged || !isValid}
                    onClick={() => setShowConfirm(true)}>
                    <Check className="h-3 w-3 mr-1.5" />Guardar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Motivo */}
          {isEditing && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Motivo (opcional)</Label>
              <Input
                placeholder="ex: Aumento anual, Promoção..."
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Preview */}
          {isEditing && hasChanged && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>{formatCurrency(currentRate)}/h</strong> → <strong>{formatCurrency(parsedRate)}/h</strong>
                <span className="ml-1 opacity-70">
                  ({parsedRate > currentRate ? "+" : ""}{(parsedRate - currentRate).toFixed(2)} €)
                </span>
              </span>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* History preview — only latest entry */}
          {rateHistory.length > 0 && !isEditing && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <History className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Última alteração
                  </span>
                </div>
                {rateHistory.length > 1 && (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-0.5 text-[10px] text-primary hover:underline font-medium"
                  >
                    Ver todos ({rateHistory.length})
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              {latest && <HistoryRow h={latest} isLatest={true} />}
            </div>
          )}

          {rateHistory.length === 0 && !isEditing && (
            <p className="text-xs text-muted-foreground text-center py-1 italic">
              Sem histórico — a primeira alteração ficará registada aqui.
            </p>
          )}
        </div>
      </div>

      {/* ── Full History Dialog ── */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Histórico de Alterações
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-2 pr-1 mt-2">
            {sorted.map((h, i) => (
              <HistoryRow key={i} h={h} isLatest={i === 0} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Dialog ── */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Alterar taxa de <strong className="text-foreground">{collaboratorName}</strong>:</p>
                <div className="bg-muted rounded-xl px-4 py-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span>Atual:</span>
                    <strong className="text-foreground">{formatCurrency(currentRate)}/h</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nova:</span>
                    <strong className="text-emerald-600">{formatCurrency(parsedRate)}/h</strong>
                  </div>
                  {motivo && (
                    <div className="flex justify-between gap-4">
                      <span>Motivo:</span>
                      <span className="italic text-foreground text-right">{motivo}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs">Os dias já registados <strong>mantêm a taxa histórica</strong>. A nova taxa aplica-se apenas a registos futuros.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "A guardar..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}