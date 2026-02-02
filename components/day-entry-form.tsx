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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Minus, X, Trash2, Users, Check } from "lucide-react"
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
import { getNomesColaboradores, getColaboradorByPin } from "@/lib/colaboradores"

interface DayEntryFormProps {
  date: Date | null
  open: boolean
  onClose: () => void
}

export function DayEntryForm({ date, open, onClose }: DayEntryFormProps) {
  const { getEntry, addEntry, deleteEntry } = useWorkTracker()

  const [totalHoras, setTotalHoras] = useState(8)
  const [descricao, setDescricao] = useState("")
  const [equipa, setEquipa] = useState<string[]>([])
  const [materiais, setMateriais] = useState<string[]>([])
  const [newMaterial, setNewMaterial] = useState("")

  // PIN dialog
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null)

  // Team selector
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [tempEquipa, setTempEquipa] = useState<string[]>([])
  const [teamFilter, setTeamFilter] = useState("")

  const todosColaboradores = useMemo(() => getNomesColaboradores(), [])

  const colaboradoresFiltrados = useMemo(() => {
    const filter = teamFilter.toLowerCase().trim()
    return todosColaboradores.filter(nome => nome.toLowerCase().includes(filter))
  }, [teamFilter, todosColaboradores])

  const meuNome = typeof window !== "undefined" ? localStorage.getItem("meuNome") : null

  const dateStr = date ? date.toISOString().split("T")[0] : ""
  const existingEntry = dateStr ? getEntry(dateStr) : undefined
  const isEditing = !!existingEntry

  const { normalHoras, extraHoras } = useMemo(() => {
    if (!dateStr) return { normalHoras: 0, extraHoras: 0 }
    return calculateHours(dateStr, totalHoras)
  }, [dateStr, totalHoras])

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

  // Normaliza equipa antiga ou nova, remove duplicados e limpa espaços
  const normalizeEquipa = (value: any): string[] => {
    let arr: string[] = []

    if (Array.isArray(value)) {
      arr = value.filter((item): item is string => typeof item === "string")
    } else if (typeof value === "string") {
      arr = value.split(/[,;]/)
    }

    // Limpa, remove duplicados (case-insensitive) e filtra vazios
    const unique = new Set<string>()
    arr.forEach(item => {
      const cleaned = item.trim()
      if (cleaned) unique.add(cleaned)
    })

    return Array.from(unique)
  }

  useEffect(() => {
    if (!date || !open) return

    let initialEquipa: string[] = []

    if (existingEntry) {
      setTotalHoras(existingEntry.totalHoras ?? 8)
      setDescricao(existingEntry.descricao ?? "")
      initialEquipa = normalizeEquipa(existingEntry.equipa)
      setMateriais(existingEntry.materiais ?? [])
    } else {
      setTotalHoras(8)
      setDescricao("")
      setMateriais([])
      initialEquipa = []
    }

    // Adiciona meuNome apenas se não existir (case-insensitive)
    if (meuNome) {
      const meuNomeLower = meuNome.toLowerCase().trim()
      const alreadyHas = initialEquipa.some(n => n.toLowerCase().trim() === meuNomeLower)
      if (!alreadyHas) {
        initialEquipa = [...initialEquipa, meuNome]
      }
    }

    // Define o estado uma única vez, com tudo correto
    setEquipa(initialEquipa)

    // Mostra PIN se não tiver nome salvo
    if (!meuNome) {
      setShowPinDialog(true)
    }

    setNewMaterial("")
  }, [date, open, existingEntry, meuNome]) // Dependências corretas

  const handlePinDialogChange = (open: boolean) => {
    setShowPinDialog(open)
    if (!open && !localStorage.getItem("meuNome")) {
      onClose()
    }
  }

  const handleDefinirPin = () => {
    const pin = pinInput.trim()
    if (!pin) {
      setPinError("Insere o teu PIN")
      return
    }

    const colaborador = getColaboradorByPin(pin)
    if (colaborador) {
      localStorage.setItem("meuPin", pin)
      localStorage.setItem("meuNome", colaborador.nome)

      setWelcomeMessage(`Bem-vindo, ${colaborador.nome}!`)
      setPinError(null)
      setPinInput("")

      // Adiciona ao estado atual sem duplicar (case-insensitive)
      setEquipa(prev => {
        const lower = colaborador.nome.toLowerCase().trim()
        if (prev.some(n => n.toLowerCase().trim() === lower)) return prev
        return [...prev, colaborador.nome]
      })

      setTimeout(() => {
        setWelcomeMessage(null)
        setShowPinDialog(false)
      }, 3000)
    } else {
      setPinError("PIN inválido. Tenta novamente.")
    }
  }

  const openTeamSelector = () => {
    setTempEquipa([...equipa])
    setTeamFilter("")
    setShowTeamDialog(true)
  }

  const toggleTempMember = (nome: string) => {
    setTempEquipa(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    )
  }

  const confirmTeamSelection = () => {
    setEquipa([...tempEquipa])
    setShowTeamDialog(false)
  }

  const handleSave = () => {
    if (!date || equipa.length === 0) {
      alert("Selecione pelo menos um colaborador antes de salvar.")
      return
    }

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

  const adjustHours = (delta: number) => {
    setTotalHoras(prev => Math.max(0, prev + delta))
  }

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setMateriais(prev => [...prev, newMaterial.trim()])
      setNewMaterial("")
    }
  }

  const removeMaterial = (index: number) => {
    setMateriais(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-border bg-background h-auto max-h-[92dvh] min-h-[60dvh] overflow-hidden pb-32"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="px-6 pt-6 pb-4 text-left shrink-0">
              <SheetTitle className="text-xl">{isEditing ? "Editar Dia" : "Novo Registo"}</SheetTitle>
              {date && <p className="text-sm text-muted-foreground capitalize">{formatDate(date)}</p>}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-12">
              {/* Total de Horas */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Total de Horas</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-14 w-14" onClick={() => adjustHours(-1)}>
                    <Minus className="h-6 w-6" />
                  </Button>
                  <Input
                    type="number"
                    value={totalHoras}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (!isNaN(val)) setTotalHoras(Math.max(0, Math.floor(val)))
                    }}
                    className="h-14 text-center text-2xl font-bold flex-1"
                    min={0}
                    step={1}
                  />
                  <Button variant="outline" size="icon" className="h-14 w-14" onClick={() => adjustHours(1)}>
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">{getDayTypeLabel()}</p>
              </div>

              {/* Horas normais / extras */}
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Selecionar Equipa</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openTeamSelector}
                    className="h-8 px-3 text-xs"
                  >
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Selecionar
                  </Button>
                </div>

                <div className="min-h-[42px] flex flex-wrap gap-2">
                  {equipa.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhum selecionado ainda</p>
                  ) : (
                    equipa.map((nome) => {
                      const isMeuNome = meuNome && nome.toLowerCase().trim() === meuNome.toLowerCase().trim()
                      return (
                        <Badge
                          key={nome}
                          variant="secondary"
                          className={`text-sm px-3 py-1.5 flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 transition-colors ${
                            isMeuNome ? "border-primary/50 border font-medium" : ""
                          }`}
                        >
                          {nome}
                          {!isMeuNome && (
                            <button
                              type="button"
                              onClick={() => setEquipa(prev => prev.filter(n => n !== nome))}
                              className="ml-1 hover:text-destructive transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </Badge>
                      )
                    })
                  )}

                  <Badge
                    variant="outline"
                    className="text-sm px-3 py-1.5 flex items-center justify-center bg-primary/5 hover:bg-primary/15 cursor-pointer transition-colors border-2 border-dashed border-primary/50 min-w-[80px]"
                    onClick={openTeamSelector}
                  >
                    <Plus className="h-5 w-5 text-primary" />
                  </Badge>
                </div>

                {equipa.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    * Obrigatório selecionar pelo menos uma pessoa
                  </p>
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

              <div className="h-32" />
            </div>

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
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
                  disabled={equipa.length === 0}
                >
                  Salvar
                </Button>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={handlePinDialogChange}>
        <DialogContent className="sm:max-w-md" data-hide-close-button="true">
          <DialogHeader>
            <DialogTitle>Quem és tu?</DialogTitle>
            <DialogDescription>
              Insere o teu PIN para continuar.<br />
              *fornecido por JBricolage*
            </DialogDescription>
          </DialogHeader>

          {welcomeMessage ? (
            <div className="py-8 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {welcomeMessage}
              </div>
              <p className="text-sm text-muted-foreground">
                A carregar o teu perfil...
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pin-dialog">O teu PIN</Label>
                <Input
                  id="pin-dialog"
                  type="password"
                  inputMode="numeric"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value)
                    setPinError(null)
                  }}
                  placeholder="ex: 1010"
                  className="h-12 text-lg"
                  maxLength={6}
                  onKeyDown={(e) => e.key === "Enter" && handleDefinirPin()}
                  autoFocus
                />
                {pinError && <p className="text-sm text-destructive">{pinError}</p>}
              </div>

              <Button
                onClick={handleDefinirPin}
                disabled={!pinInput.trim()}
                className="w-full"
              >
                Confirmar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Selector Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Equipa</DialogTitle>
            <DialogDescription>
              Clica nos nomes para adicionar ou remover. Confirma no final.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            <Input
              placeholder="Filtrar colaboradores..."
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full"
            />

            <div className="flex-1 overflow-y-auto border rounded-md divide-y bg-muted/30">
              {colaboradoresFiltrados.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum colaborador encontrado
                </div>
              ) : (
                colaboradoresFiltrados.map((nome) => {
                  const isSelected = tempEquipa.includes(nome)
                  const isMeuNome = meuNome != null && nome.toLowerCase().trim() === meuNome.toLowerCase().trim()
                  return (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => !isMeuNome && toggleTempMember(nome)}
                      disabled={isMeuNome}
                      className={`w-full text-left px-4 py-3.5 text-base flex justify-between items-center transition-colors ${
                        isSelected ? "bg-primary/10 font-medium" : "hover:bg-accent"
                      } ${isMeuNome ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        {nome}
                        {isMeuNome && (
                          <Badge variant="outline" className="text-xs bg-primary/10">
                            Eu
                          </Badge>
                        )}
                      </span>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmTeamSelection}>
              Confirmar Seleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}