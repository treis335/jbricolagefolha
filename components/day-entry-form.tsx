"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Plus, Minus, X, Copy, Trash2 } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { type DayEntry, calculateHours } from "@/lib/types"
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

interface DayEntryFormProps {
  date: Date | null
  open: boolean
  onClose: () => void
}

export function DayEntryForm({ date, open, onClose }: DayEntryFormProps) {
  const { getEntry, getPreviousDayEntry, addEntry, deleteEntry, data } = useWorkTracker()

  const [totalHoras, setTotalHoras] = useState(8)
  const [descricao, setDescricao] = useState("")
  const [equipa, setEquipa] = useState("")
  const [materiais, setMateriais] = useState<string[]>([])
  const [newMaterial, setNewMaterial] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const dateStr = date ? date.toISOString().split("T")[0] : ""
  const existingEntry = dateStr ? getEntry(dateStr) : undefined
  const previousEntry = dateStr ? getPreviousDayEntry(dateStr) : undefined
  const isEditing = !!existingEntry

  // Auto-calculate normal and extra hours based on weekday
  const { normalHoras, extraHoras } = useMemo(() => {
    if (!dateStr) return { normalHoras: 0, extraHoras: 0 }
    return calculateHours(dateStr, totalHoras)
  }, [dateStr, totalHoras])

  // Get the day type label for display
  const getDayTypeLabel = () => {
    if (!date) return ""
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0) return "Domingo - todas as horas são extras"
    if (dayOfWeek === 6) return "Sábado - primeiras 5h normais"
    return "Segunda a Sexta - primeiras 8h normais"
  }

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  // Reset form when date changes or sheet opens
  useEffect(() => {
    if (date && open) {
      if (existingEntry) {
        setTotalHoras(existingEntry.totalHoras)
        setDescricao(existingEntry.descricao)
        setEquipa(existingEntry.equipa)
        setMateriais(existingEntry.materiais)
      } else {
        setTotalHoras(8)
        setDescricao("")
        setEquipa("")
        setMateriais([])
      }
      setNewMaterial("")
      setShowSuggestions(false)
    }
  }, [date, open, existingEntry])

  const handleSave = () => {
    if (!date) return

    const entry: DayEntry = {
      date: dateStr,
      totalHoras,
      normalHoras,
      extraHoras,
      descricao,
      equipa,
      materiais,
    }

    addEntry(entry)
    onClose()
  }

  const handleDelete = () => {
    if (dateStr) {
      deleteEntry(dateStr)
      onClose()
    }
  }

  const handleCopyPrevious = () => {
    if (previousEntry) {
      setTotalHoras(previousEntry.totalHoras)
      setDescricao(previousEntry.descricao)
      setEquipa(previousEntry.equipa)
      setMateriais([...previousEntry.materiais])
    }
  }

  const adjustHours = (delta: number) => {
    const newValue = totalHoras + delta
    if (newValue >= 0) {
      setTotalHoras(newValue)
    }
  }

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setMateriais((prev) => [...prev, newMaterial.trim()])
      setNewMaterial("")
    }
  }

  const removeMaterial = (index: number) => {
    setMateriais((prev) => prev.filter((_, i) => i !== index))
  }

  // Get team suggestions from settings and previous entries
  const teamSuggestions = Array.from(
    new Set([
      ...data.settings.equipaComum,
      ...data.entries.map((e) => e.equipa).filter(Boolean),
    ])
  ).filter((s) => s.toLowerCase().includes(equipa.toLowerCase()) && s !== equipa)

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="bottom"
        className="
          rounded-t-2xl border-t border-border bg-background
          h-auto max-h-[92dvh] min-h-[60dvh]
          overflow-hidden pb-32
        "
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header fixo */}
          <SheetHeader className="px-6 pt-6 pb-4 text-left shrink-0">
            <SheetTitle className="text-xl">
              {isEditing ? "Editar Dia" : "Novo Registo"}
            </SheetTitle>
            {date && (
              <p className="text-sm text-muted-foreground capitalize">
                {formatDate(date)}
              </p>
            )}
          </SheetHeader>

          {/* Conteúdo principal com scroll */}
          <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-12">
            {/* Copiar do dia anterior */}
            {previousEntry && !isEditing && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyPrevious}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar do dia anterior
              </Button>
            )}

            {/* Total de Horas */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Total de Horas</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14"
                  onClick={() => adjustHours(-0.5)}
                >
                  <Minus className="h-6 w-6" />
                </Button>
                <Input
                  type="number"
                  value={totalHoras}
                  onChange={(e) => setTotalHoras(Math.max(0, Number(e.target.value)))}
                  className="h-14 text-center text-2xl font-bold flex-1"
                  step={0.5}
                  min={0}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14"
                  onClick={() => adjustHours(0.5)}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {getDayTypeLabel()}
              </p>
            </div>

            {/* Breakdown de horas */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Horas normais:</span>
                <span className="text-lg font-semibold text-primary">{normalHoras}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Horas extras:</span>
                <span className="text-lg font-semibold text-destructive">{extraHoras}h</span>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Descrição do trabalho</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="ex: Telhado andaimes Bombarral, pintar telhas, Quarto 21..."
                className="min-h-24 text-base resize-y"
              />
            </div>

            {/* Equipa */}
            <div className="space-y-2 relative">
              <Label className="text-base font-medium">Equipa</Label>
              <Input
                value={equipa}
                onChange={(e) => {
                  setEquipa(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="ex: Eu, Leo, Rafa"
                className="h-12 text-base"
              />
              {showSuggestions && teamSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {teamSuggestions.slice(0, 5).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-accent text-base"
                      onClick={() => {
                        setEquipa(suggestion)
                        setShowSuggestions(false)
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Materiais */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Materiais gastos</Label>
              <div className="flex gap-2">
                <Input
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMaterial())}
                  placeholder="ex: 1 isocril, Lata tinta 15L..."
                  className="h-12 text-base flex-1"
                />
                <Button onClick={addMaterial} className="h-12 px-4">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {materiais.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {materiais.map((material, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-sm py-1.5 px-3 flex items-center gap-1"
                    >
                      {material}
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Espaçador para evitar corte quando teclado abre */}
            <div className="h-32" />
          </div>

          {/* Footer fixo no fundo */}
          <SheetFooter className="shrink-0 border-t border-border bg-background p-4">
            <div className="flex gap-3 w-full">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="lg" className="h-14">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar registo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O registo será permanentemente apagado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Apagar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                onClick={handleSave}
                size="lg"
                className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
              >
                Salvar
              </Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}