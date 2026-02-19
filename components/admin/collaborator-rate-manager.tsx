// components/admin/collaborator-rate-manager.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Euro, TrendingUp, History, Pencil, Check, X, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface RateHistoryEntry {
  taxa: number
  taxaAnterior: number | null
  data: string        // ISO date string
  alteradoPor: string // "admin" ou email do admin
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
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedRate = parseFloat(newRate)
  const isValid = !isNaN(parsedRate) && parsedRate > 0
  const hasChanged = isValid && parsedRate !== currentRate

  const handleSave = async () => {
    if (!isValid || !hasChanged) return
    setSaving(true)
    setError(null)

    try {
      // ✅ Fix: usar spread condicional para evitar passar `undefined` ao Firebase
      const historyEntry: RateHistoryEntry = {
        taxa: parsedRate,
        taxaAnterior: currentRate,
        data: new Date().toISOString(),
        alteradoPor: "admin",
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      }

      const userRef = doc(db, "users", collaboratorId)

      // 1. Atualiza a taxa nos settings
      await updateDoc(userRef, {
        "workData.settings.taxaHoraria": parsedRate,
        "rateHistory": arrayUnion(historyEntry),
      })

      // 2. Lê o histórico atualizado
      const snap = await getDoc(userRef)
      const updatedHistory: RateHistoryEntry[] = snap.data()?.rateHistory || []

      onRateUpdated(parsedRate, updatedHistory)
      setIsEditing(false)
      setMotivo("")
      setShowConfirm(false)
    } catch (err: any) {
      console.error(err)
      setError("Erro ao guardar. Tenta novamente.")
    } finally {
      setSaving(false)
    }
  }

  const diff = rateHistory.length >= 2
    ? rateHistory[rateHistory.length - 1].taxa - rateHistory[rateHistory.length - 2].taxa
    : null

  return (
    <>
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-4 w-4 text-blue-600" />
            Taxa Horária
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Taxa atual */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Taxa Atual</p>
              {!isEditing ? (
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(currentRate)}<span className="text-base font-medium text-muted-foreground">/h</span>
                </p>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">€</span>
                    <Input
                      type="number"
                      step="0.50"
                      min="0"
                      value={newRate}
                      onChange={e => setNewRate(e.target.value)}
                      className="pl-7 w-28 h-10 text-lg font-bold"
                      autoFocus
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">/h</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {diff !== null && !isEditing && (
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  diff > 0 ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30"
                  : diff < 0 ? "text-red-600 bg-red-100 dark:bg-red-950/30"
                  : "text-muted-foreground bg-muted"
                }`}>
                  {diff > 0 ? <ArrowUp className="h-3 w-3" /> : diff < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {Math.abs(diff).toFixed(2)}€
                </span>
              )}
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setNewRate(currentRate.toFixed(2)); setIsEditing(true) }}
                  className="h-9"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Alterar
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => { setIsEditing(false); setMotivo(""); setError(null) }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!hasChanged || !isValid}
                    onClick={() => setShowConfirm(true)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Guardar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Motivo (quando a editar) */}
          {isEditing && (
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Motivo da alteração (opcional)</Label>
              <Input
                placeholder="ex: Aumento anual, Promoção..."
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className="h-10"
              />
            </div>
          )}

          {/* Preview da alteração */}
          {isEditing && hasChanged && (
            <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>
                <strong>{formatCurrency(currentRate)}/h</strong> → <strong>{formatCurrency(parsedRate)}/h</strong>
                {parsedRate > currentRate
                  ? ` (+${(parsedRate - currentRate).toFixed(2)} €)`
                  : ` (${(parsedRate - currentRate).toFixed(2)} €)`}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Histórico */}
          {rateHistory.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Histórico de alterações
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[...rateHistory].reverse().map((h, i) => {
                  const delta = h.taxaAnterior !== null ? h.taxa - h.taxaAnterior : null
                  return (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{formatCurrency(h.taxa)}/h</span>
                          {h.taxaAnterior !== null && (
                            <span className="text-xs text-muted-foreground">
                              ← {formatCurrency(h.taxaAnterior)}/h
                            </span>
                          )}
                          {delta !== null && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${
                                delta > 0
                                  ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30"
                                  : delta < 0
                                    ? "text-red-600 bg-red-100 dark:bg-red-950/30"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {delta > 0 ? "+" : ""}{delta.toFixed(2)}€
                            </Badge>
                          )}
                          {i === 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">atual</Badge>
                          )}
                        </div>
                        {h.motivo && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{h.motivo}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDate(h.data)}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize">{h.alteradoPor}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {rateHistory.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2 italic">
              Sem histórico de alterações — a primeira alteração ficará registada aqui.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de taxa?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Vais alterar a taxa de <strong className="text-foreground">{collaboratorName}</strong>:
                </p>
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
                    <div className="flex justify-between">
                      <span>Motivo:</span>
                      <span className="italic text-foreground">{motivo}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs">
                  Os dias já registados <strong>mantêm a taxa histórica</strong>. A nova taxa aplica-se apenas a registos futuros.
                </p>
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