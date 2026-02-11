"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Box,
  Paintbrush,
  Wrench,
  Zap,
  Droplet,
  TreeDeciduous,
  Filter,
  Download,
  TrendingUp,
  DollarSign,
} from "lucide-react"
import { CATEGORIAS_MATERIAIS } from "@/lib/financial-types"

// Mock data - substituir com dados reais
const mockMateriais = [
  {
    id: "1",
    nome: "Tinta Branca Premium 15L",
    categoria: "tintas",
    unidade: "L",
    precoUnitario: 45.99,
    fornecedor: "Tintas Silva",
    ativo: true,
  },
  {
    id: "2",
    nome: "Berbequim Bosch Professional",
    categoria: "ferramentas",
    unidade: "unidade",
    precoUnitario: 189.90,
    fornecedor: "Ferramentas Central",
    ativo: true,
  },
  {
    id: "3",
    nome: "Cabo Elétrico 2.5mm (rolo 100m)",
    categoria: "eletrico",
    unidade: "m",
    precoUnitario: 95.00,
    fornecedor: "Elétrica Porto",
    ativo: true,
  },
  {
    id: "4",
    nome: "Cimento Portland 25kg",
    categoria: "cimento",
    unidade: "kg",
    precoUnitario: 8.50,
    fornecedor: "Materiais Construção Lda",
    ativo: true,
  },
  {
    id: "5",
    nome: "Tubo PVC 50mm (barra 6m)",
    categoria: "canalizacao",
    unidade: "m",
    precoUnitario: 12.30,
    fornecedor: "Canalização Total",
    ativo: true,
  },
]

export function MateriaisTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState("todas")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Filtrar materiais
  const materiaisFiltrados = useMemo(() => {
    return mockMateriais.filter((mat) => {
      const matchSearch = mat.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mat.fornecedor?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategoria = categoriaFilter === "todas" || mat.categoria === categoriaFilter
      return matchSearch && matchCategoria
    })
  }, [searchQuery, categoriaFilter])

  // Estatísticas
  const stats = useMemo(() => {
    const porCategoria = CATEGORIAS_MATERIAIS.map(cat => ({
      ...cat,
      total: mockMateriais.filter(m => m.categoria === cat.id).length,
    }))

    return {
      total: mockMateriais.length,
      ativos: mockMateriais.filter(m => m.ativo).length,
      valorEstimado: mockMateriais.reduce((sum, m) => sum + (m.precoUnitario || 0), 0),
      porCategoria,
    }
  }, [])

  const getCategoriaInfo = (categoriaId: string) => {
    return CATEGORIAS_MATERIAIS.find(c => c.id === categoriaId) || CATEGORIAS_MATERIAIS[6]
  }

  const getCategoriaIcon = (categoriaId: string) => {
    const icons = {
      tintas: Paintbrush,
      ferramentas: Wrench,
      eletrico: Zap,
      canalizacao: Droplet,
      madeira: TreeDeciduous,
      cimento: Package,
      outros: Box,
    }
    return icons[categoriaId as keyof typeof icons] || Box
  }

  return (
    <div className="space-y-6">
      {/* KPIs Materiais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-indigo-100 text-sm mt-1">Total Materiais</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Box className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{stats.ativos}</div>
            <p className="text-green-100 text-sm mt-1">Ativos</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">€{stats.valorEstimado.toFixed(0)}</div>
            <p className="text-orange-100 text-sm mt-1">Valor em Stock</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Paintbrush className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold">{CATEGORIAS_MATERIAIS.length}</div>
            <p className="text-blue-100 text-sm mt-1">Categorias</p>
          </CardContent>
        </Card>
      </div>

      {/* Categorias Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Materiais por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {stats.porCategoria.map((cat) => {
              const Icon = getCategoriaIcon(cat.id)
              return (
                <Card
                  key={cat.id}
                  className="border-2 hover:shadow-md transition-all cursor-pointer"
                  style={{ borderColor: cat.cor + "40" }}
                  onClick={() => setCategoriaFilter(cat.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div
                      className="h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: cat.cor + "20" }}
                    >
                      <Icon className="h-6 w-6" style={{ color: cat.cor }} />
                    </div>
                    <div className="font-semibold text-sm">{cat.nome}</div>
                    <div className="text-2xl font-bold mt-1">{cat.total}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Materiais */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6 text-indigo-600" />
              Gestão de Materiais
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Novo Material
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar material ou fornecedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-full md:w-64">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas Categorias</SelectItem>
                {CATEGORIAS_MATERIAIS.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900">
                  <TableHead className="font-semibold">Material</TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="font-semibold">Unidade</TableHead>
                  <TableHead className="font-semibold text-right">Preço Unit.</TableHead>
                  <TableHead className="font-semibold">Fornecedor</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiaisFiltrados.map((mat) => {
                  const catInfo = getCategoriaInfo(mat.categoria)
                  const Icon = getCategoriaIcon(mat.categoria)
                  return (
                    <TableRow key={mat.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: catInfo.cor + "20" }}
                          >
                            <Icon className="h-5 w-5" style={{ color: catInfo.cor }} />
                          </div>
                          <div className="font-medium">{mat.nome}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: catInfo.cor, color: catInfo.cor }}>
                          {catInfo.nome}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{mat.unidade}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        €{mat.precoUnitario?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {mat.fornecedor || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {mat.ativo ? (
                          <Badge className="bg-green-500">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMaterial(mat)
                              setShowEditDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Adicionar Material */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Material *</Label>
              <Input placeholder="Ex: Tinta Branca Premium 15L" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_MATERIAIS.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Litros (L)</SelectItem>
                    <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                    <SelectItem value="m">Metros (m)</SelectItem>
                    <SelectItem value="m2">Metros² (m²)</SelectItem>
                    <SelectItem value="unidade">Unidade</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="rolo">Rolo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Unitário (€)</Label>
                <Input type="number" step="0.01" placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input placeholder="Ex: Tintas Silva" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Notas adicionais sobre este material..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Adicionar Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Material */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Material *</Label>
              <Input defaultValue={selectedMaterial?.nome} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select defaultValue={selectedMaterial?.categoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_MATERIAIS.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Select defaultValue={selectedMaterial?.unidade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Litros (L)</SelectItem>
                    <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                    <SelectItem value="m">Metros (m)</SelectItem>
                    <SelectItem value="unidade">Unidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Unitário (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={selectedMaterial?.precoUnitario}
                />
              </div>

              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input defaultValue={selectedMaterial?.fornecedor} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}