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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import { v4 as uuidv4 } from "uuid"

interface DayEntryFormProps {
  date: Date | null
  open: boolean
  onClose: () => void
}

interface Service {
  id: string
  obraNome: string
  descricao: string
  equipa: string[]
  materiais: string[]
}

export function DayEntryForm({ date, open, onClose }: DayEntryFormProps) {
  const { getEntry, addEntry, deleteEntry } = useWorkTracker()

  const [totalHoras, setTotalHoras] = useState(8)
  const [services, setServices] = useState<Service[]>([])
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null)

  // Estado local para novo material (resetado por aba)
  const [newMaterialInput, setNewMaterialInput] = useState("")

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

  const normalizeEquipa = (value: any): string[] => {
    let arr: string[] = []

    if (Array.isArray(value)) {
      arr = value.filter((item): item is string => typeof item === "string")
    } else if (typeof value === "string") {
      arr = value.split(/[,;]/)
    }

    const unique = new Set<string>()
    arr.forEach(item => {
      const cleaned = item.trim()
      if (cleaned) unique.add(cleaned)
    })

    return Array.from(unique)
  }

  useEffect(() => {
    if (!date || !open) return

    if (existingEntry) {
      setTotalHoras(existingEntry.totalHoras ?? 8)

      // Compatibilidade com dados antigos
      if (existingEntry.services && existingEntry.services.length > 0) {
        setServices(existingEntry.services)
        setActiveServiceId(existingEntry.services[0]?.id || null)
      } else {
        const oldService: Service = {
          id: uuidv4(),
          obraNome: "",
          descricao: existingEntry.descricao ?? "",
          equipa: normalizeEquipa(existingEntry.equipa ?? []),
          materiais: existingEntry.materiais ?? [],
        }
        setServices([oldService])
        setActiveServiceId(oldService.id)
      }
    } else {
      const newService: Service = {
        id: uuidv4(),
        obraNome: "",
        descricao: "",
        equipa: meuNome ? [meuNome] : [],
        materiais: [],
      }
      setServices([newService])
      setActiveServiceId(newService.id)
      setTotalHoras(8)
    }

    if (!meuNome) {
      setShowPinDialog(true)
    }
  }, [date, open, existingEntry, meuNome])

  const activeService = useMemo(() => {
    return services.find(s => s.id === activeServiceId) || services[0]
  }, [services, activeServiceId])

  const handleAddService = () => {
    const newService: Service = {
      id: uuidv4(),
      obraNome: "",
      descricao: "",
      equipa: meuNome ? [meuNome] : [],
      materiais: [],
    }
    setServices(prev => [...prev, newService])
    setActiveServiceId(newService.id)
    setNewMaterialInput("")
  }

  const handleRemoveService = (id: string) => {
    if (services.length <= 1) return
    const newServices = services.filter(s => s.id !== id)
    setServices(newServices)
    setActiveServiceId(newServices[0]?.id || null)
    setNewMaterialInput("")
  }

  const updateActiveService = (updates: Partial<Service>) => {
    setServices(prev =>
      prev.map(s =>
        s.id === activeServiceId ? { ...s, ...updates } : s
      )
    )
  }

  const handleSave = () => {
    if (!date || services.length === 0) {
      alert("Adicione pelo menos um serviço.")
      return
    }

    const totalHorasSomados = totalHoras

    const entry: DayEntry = {
      date: dateStr,
      totalHoras: totalHorasSomados,
      normalHoras,
      extraHoras,
      services,
      descricao: services.length === 1 ? services[0].descricao : "Múltiplos serviços",
      equipa: services.flatMap(s => s.equipa),
      materiais: services.flatMap(s => s.materiais),
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

  const addMaterialToActive = () => {
    if (newMaterialInput.trim()) {
      updateActiveService({
        materiais: [...activeService.materiais, newMaterialInput.trim()]
      })
      setNewMaterialInput("")
    }
  }

  const removeMaterialFromActive = (index: number) => {
    updateActiveService({
      materiais: activeService.materiais.filter((_, i) => i !== index)
    })
  }

  const openTeamSelector = () => {
    setTempEquipa([...activeService.equipa])
    setTeamFilter("")
    setShowTeamDialog(true)
  }

  const toggleTempMember = (nome: string) => {
    setTempEquipa(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    )
  }

  const confirmTeamSelection = () => {
    updateActiveService({ equipa: [...tempEquipa] })
    setShowTeamDialog(false)
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

      updateActiveService({
        equipa: (() => {
          const prev = activeService.equipa
          const lower = colaborador.nome.toLowerCase().trim()
          if (prev.some(n => n.toLowerCase().trim() === lower)) return prev
          return [...prev, colaborador.nome]
        })()
      })

      setTimeout(() => {
        setWelcomeMessage(null)
        setShowPinDialog(false)
      }, 3000)
    } else {
      setPinError("PIN inválido. Tenta novamente.")
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-border bg-background h-auto max-h-[92dvh] min-h-[60dvh] overflow-hidden pb-2"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="px-6 pt-6 pb-4 text-left shrink-0">
              <SheetTitle className="text-xl">{isEditing ? "Editar Dia" : "Novo Registo"}</SheetTitle>
              {date && <p className="text-sm text-muted-foreground capitalize">{formatDate(date)}</p>}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-12">
              {/* Total de Horas */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Total de Horas do Dia</Label>
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

              {/* Serviços do Dia */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Serviços do Dia</Label>
                  <Button onClick={handleAddService} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Serviço
                  </Button>
                </div>

                {services.length > 0 ? (
                  <Tabs value={activeServiceId || ""} onValueChange={setActiveServiceId} className="w-full">
                    <TabsList className="w-full overflow-x-auto flex-nowrap justify-start bg-muted/50 rounded-lg">
                      {services.map((service) => (
                        <TabsTrigger
                          key={service.id}
                          value={service.id}
                          className="min-w-[140px] text-sm"
                        >
                          {service.obraNome || `Serviço ${services.indexOf(service) + 1}`}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {services.map((service) => (
                      <TabsContent key={service.id} value={service.id} className="space-y-6 mt-4">
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Nome da Obra / Serviço *</Label>
                          <Input
                            value={service.obraNome}
                            onChange={(e) => updateActiveService({ obraNome: e.target.value })}
                            placeholder="ex: Reabilitação Casa Sr. António - Telhado"
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base font-medium">Descrição</Label>
                          <Textarea
                            value={service.descricao}
                            onChange={(e) => updateActiveService({ descricao: e.target.value })}
                            placeholder="Descreva o que foi feito neste serviço..."
                            className="min-h-24 text-base resize-y"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-medium">Equipa deste serviço</Label>
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
                            {service.equipa.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">Nenhum selecionado</p>
                            ) : (
                              service.equipa.map((nome) => (
                                <Badge
                                  key={nome}
                                  variant="secondary"
                                  className="text-sm px-3 py-1.5 flex items-center gap-1.5"
                                >
                                  {nome}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newEquipa = service.equipa.filter(n => n !== nome)
                                      updateActiveService({ equipa: newEquipa })
                                    }}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base font-medium">Materiais gastos neste serviço</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newMaterialInput}
                              onChange={(e) => setNewMaterialInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMaterialToActive())}
                              placeholder="ex: 1 isocril, Lata tinta 15L..."
                              className="h-12 text-base flex-1"
                            />
                            <Button onClick={addMaterialToActive} className="h-12 px-4">
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>
                          {service.materiais.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {service.materiais.map((material, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-sm py-1.5 px-3 flex items-center gap-1"
                                >
                                  {material}
                                  <button
                                    type="button"
                                    onClick={() => removeMaterialFromActive(index)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {services.length > 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="mt-4"
                            onClick={() => handleRemoveService(service.id)}
                          >
                            Remover este serviço
                          </Button>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Adicione um serviço para começar
                  </p>
                )}
              </div>

              <div className="h-32" />
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-background p-3 pb-[env(safe-area-inset-bottom)]">
              <div className="flex gap-3 w-full">
                {isEditing && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="lg" className="h-12 sm:h-14 w-14 flex items-center justify-center">
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
                  className="flex-1 h-12 sm:h-14 text-base sm:text-lg bg-green-600 hover:bg-green-700 text-white"
                  disabled={services.length === 0}
                >
                  Salvar Dia
                </Button>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(open) => {
        setShowPinDialog(open)
        if (!open && !localStorage.getItem("meuNome")) {
          onClose()
        }
      }}>
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
            <DialogTitle>Selecionar Equipa para este serviço</DialogTitle>
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