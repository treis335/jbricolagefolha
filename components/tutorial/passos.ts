// components/tutorial/passos.ts
// Conteúdo (curto) do tutorial do colaborador. As ilustrações estão em ilustracoes.tsx (mesmo "id").
import {
  HardHat, CalendarDays, Palette, Clock, Hammer, Camera, Users, Lock, FileText, Wallet, MapPin, Wrench, Receipt, Settings, CheckCircle2,
} from "lucide-react"
import type { ComponentType } from "react"

export interface Passo {
  id: string
  titulo: string
  resumo: string               // uma frase
  dica?: string                // uma linha curta (opcional)
  icone: ComponentType<{ className?: string }>
  cor: string                  // gradiente do ícone
  soIndependentes?: boolean    // só aparece a quem é independente
}

export const PASSOS: Passo[] = [
  { id: "bemvindo", icone: HardHat, cor: "from-blue-500 to-indigo-600", titulo: "Bem-vindo!",
    resumo: "Vê em poucos passos como a app funciona.", dica: "É só uma demonstração: nada é alterado." },
  { id: "calendario", icone: CalendarDays, cor: "from-sky-500 to-blue-600", titulo: "O teu calendário",
    resumo: "Cada dia do mês, com as tuas horas.", dica: "Toca num dia para o abrir." },
  { id: "cores", icone: Palette, cor: "from-amber-400 to-orange-500", titulo: "As cores dos dias",
    resumo: "Percebes o estado de cada dia num relance.", dica: "Cruz vermelha: falta preencher." },
  { id: "horas", icone: Clock, cor: "from-emerald-500 to-green-600", titulo: "Registar o dia",
    resumo: "Toca em «Hoje» e escolhe as horas.", dica: "«Aus.» quer dizer ausência." },
  { id: "servico", icone: Hammer, cor: "from-orange-500 to-red-500", titulo: "Serviço e obra",
    resumo: "Escolhe a obra, descreve o que fizeste e os materiais." },
  { id: "fotos", icone: Camera, cor: "from-pink-500 to-rose-600", titulo: "Fotos antes e depois",
    resumo: "Mostra o trabalho: até 10 fotos de cada.", dica: "Câmara ou galeria." },
  { id: "equipa", icone: Users, cor: "from-violet-500 to-purple-600", titulo: "A tua equipa",
    resumo: "Diz quem trabalhou contigo.", dica: "Tu já estás sempre incluído." },
  { id: "bloqueio", icone: Lock, cor: "from-slate-500 to-slate-700", titulo: "Dias fechados",
    resumo: "Passado algum tempo, o dia fecha.", dica: "Cadeado: já não o podes alterar." },
  { id: "relatorio", icone: FileText, cor: "from-cyan-500 to-sky-600", titulo: "Relatório",
    resumo: "As tuas horas e valores, em PDF." },
  { id: "financeiro", icone: Wallet, cor: "from-emerald-500 to-teal-600", titulo: "Financeiro",
    resumo: "Vê o que tens a receber e regista o que recebes.", dica: "Depois de confirmado, só o admin elimina." },
  { id: "escala", icone: MapPin, cor: "from-amber-500 to-yellow-600", titulo: "Escala do dia",
    resumo: "Vê para onde vais e com quem.", dica: "Só aparece quando tens escala." },
  { id: "ferramentas", icone: Wrench, cor: "from-indigo-500 to-blue-600", titulo: "As tuas ferramentas",
    resumo: "Vê o que tens contigo.", dica: "É só consulta." },
  { id: "recibo", icone: Receipt, cor: "from-indigo-500 to-violet-600", titulo: "Recibo do mês", soIndependentes: true,
    resumo: "Anexa o PDF do teu recibo.", dica: "É opcional." },
  { id: "definicoes", icone: Settings, cor: "from-slate-600 to-slate-800", titulo: "Definições",
    resumo: "O teu perfil, a foto e a app.", dica: "MB Way e IBAN: só a gestão vê." },
  { id: "fim", icone: CheckCircle2, cor: "from-emerald-500 to-green-600", titulo: "Já sabes tudo!",
    resumo: "Podes voltar a ver isto em Definições." },
]
