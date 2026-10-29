// components/tutorial/ilustracoes.tsx
// Mini-ecrãs ilustrativos do tutorial do colaborador. São só desenhos (sem dados reais nem ações),
// feitos com o mesmo estilo da app para o colaborador reconhecer o que vai ver.
"use client"

import type { ComponentType, ReactNode } from "react"
import {
  CalendarDays, Wallet, Settings, HardHat, Lock, X, Check, Camera, Plus, ChevronLeft, ChevronRight,
  FileText, Download, Wrench, Receipt, Clock, MapPin, User, Phone, Smartphone, LogOut, Bell,
  CheckCircle2, CreditCard, ExternalLink, RefreshCw, Trash2, Euro,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Blocos base ─────────────────────────────────────────────────────────────
const Cartao = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-border/60 bg-card p-3 shadow-sm", className)}>{children}</div>
)
const Rotulo = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1", className)}>{children}</p>
)
const Pilula = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold", className)}>{children}</span>
)
const Linha = ({ w = "w-full" }: { w?: string }) => <div className={cn("h-1.5 rounded-full bg-muted-foreground/15", w)} />

// Destaque: contorno a pulsar no sítio que está a ser explicado
const Foco = ({ children, etiqueta, className, lado = "esq" }: { children: ReactNode; etiqueta?: string; className?: string; lado?: "esq" | "dir" }) => (
  <div className={cn("relative", className)}>
    {children}
    <span className="pointer-events-none absolute -inset-1.5 rounded-2xl ring-2 ring-primary/70 animate-pulse" />
    {etiqueta && (
      <span className={cn("pointer-events-none absolute -top-3 rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 shadow", lado === "dir" ? "right-3" : "left-3")}>{etiqueta}</span>
    )}
  </div>
)

type EstadoDia = "pago" | "naoPago" | "hoje" | "ausencia" | "semRegisto" | "vazio" | "folga"
function Dia({ n, estado, horas, bloqueado }: { n: number; estado: EstadoDia; horas?: string; bloqueado?: boolean }) {
  const estilos: Record<EstadoDia, string> = {
    pago: "bg-card border-border/60",
    naoPago: "bg-card border-border/60",
    hoje: "bg-blue-50 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-400/40 text-blue-700 dark:text-blue-300",
    ausencia: "bg-card border-amber-300/60",
    semRegisto: "bg-card border-border/40",
    vazio: "bg-card border-border/40 text-muted-foreground",
    folga: "bg-muted/40 border-transparent text-muted-foreground/50",
  }
  return (
    <div className={cn("relative aspect-square rounded-xl border flex flex-col items-center justify-center leading-none text-[11px] font-semibold", estilos[estado])}>
      {(estado === "pago" || estado === "naoPago") && (
        <span className={cn("absolute top-1 left-1 w-1.5 h-1.5 rounded-full", estado === "pago" ? "bg-emerald-500" : "bg-amber-400")} />
      )}
      {estado === "ausencia" ? <X className="h-4 w-4 text-amber-500" /> : estado === "semRegisto" ? <X className="h-4 w-4 text-red-400" /> : (
        <>
          <span>{n}</span>
          {horas && <span className="text-[9px] font-medium text-muted-foreground mt-0.5">{horas}</span>}
        </>
      )}
      {bloqueado && <Lock className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-amber-500" />}
    </div>
  )
}

const Avatar = ({ ini, cor }: { ini: string; cor: string }) => (
  <span className={cn("w-6 h-6 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0", cor)}>{ini}</span>
)

// ── 1. Bem-vindo ────────────────────────────────────────────────────────────
function IlBemVindo() {
  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
        <HardHat className="h-12 w-12 text-white" />
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {[[CalendarDays, "Calendário"], [Wallet, "Financeiro"], [Settings, "Definições"]].map(([Ic, t]) => {
          const I = Ic as ComponentType<{ className?: string }>
          return (
            <span key={t as string} className="inline-flex items-center gap-1.5 rounded-2xl bg-card border border-border/60 px-3 py-2 text-[11px] font-semibold shadow-sm">
              <I className="h-3.5 w-3.5 text-primary" /> {t as string}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── 2. Calendário ───────────────────────────────────────────────────────────
function IlCalendario() {
  return (
    <div className="space-y-2.5">
      <Cartao className="py-2.5 flex items-center justify-between">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-black leading-tight">Outubro de 2026</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">mês atual</p>
        </div>
        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><FileText className="h-3.5 w-3.5" /></span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Cartao>
      <div className="grid grid-cols-3 rounded-2xl border border-border/60 bg-card overflow-hidden text-center">
        {[["8", "Dias", ""], ["64h", "Horas", "text-blue-600 dark:text-blue-400"], ["0/8", "Pagos", "text-amber-500"]].map(([v, l, c]) => (
          <div key={l} className="py-2.5 border-r last:border-0 border-border/50">
            <p className={cn("text-lg font-black leading-none", c)}>{v}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{l}</p>
          </div>
        ))}
      </div>
      <Cartao className="p-2.5">
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
            <p key={d} className="text-[8px] font-bold uppercase text-center text-muted-foreground">{d}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          <Dia n={5} estado="naoPago" horas="8h" /><Dia n={6} estado="naoPago" horas="8h" /><Dia n={7} estado="naoPago" horas="9h" />
          <Dia n={8} estado="naoPago" horas="9h" /><Dia n={9} estado="naoPago" horas="8h" /><Dia n={10} estado="hoje" horas="5h" /><Dia n={11} estado="folga" />
          <Dia n={12} estado="vazio" /><Dia n={13} estado="vazio" /><Dia n={14} estado="vazio" /><Dia n={15} estado="vazio" /><Dia n={16} estado="vazio" /><Dia n={17} estado="folga" /><Dia n={18} estado="folga" />
        </div>
      </Cartao>
      <div className="flex justify-end pt-1.5 pr-1.5">
        <Foco etiqueta="Toca aqui">
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xs font-bold px-4 py-2.5 shadow-lg shadow-emerald-500/30">
            <Plus className="h-4 w-4" /> Hoje
          </span>
        </Foco>
      </div>
    </div>
  )
}

// ── 3. Cores ────────────────────────────────────────────────────────────────
function IlCores() {
  const itens: { estado: EstadoDia; bloq?: boolean; t: string; d: string }[] = [
    { estado: "pago", t: "Pago", d: "já recebeste" },
    { estado: "naoPago", t: "Não pago", d: "registado" },
    { estado: "hoje", t: "Hoje", d: "o dia de hoje" },
    { estado: "ausencia", t: "Ausência", d: "não trabalhaste" },
    { estado: "semRegisto", t: "Sem registo", d: "falta preencher" },
    { estado: "vazio", bloq: true, t: "Fechado", d: "já não alteras" },
  ]
  return (
    <Cartao className="p-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {itens.map(i => (
          <div key={i.t} className="flex items-center gap-2.5">
            <div className="w-11 shrink-0"><Dia n={i.estado === "hoje" ? 10 : 8} estado={i.estado} horas={i.estado === "pago" || i.estado === "naoPago" ? "8h" : undefined} bloqueado={i.bloq} /></div>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight">{i.t}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{i.d}</p>
            </div>
          </div>
        ))}
      </div>
    </Cartao>
  )
}

// ── 4. Registar o dia (horas) ───────────────────────────────────────────────
function IlHoras() {
  return (
    <div className="space-y-2.5">
      <Cartao>
        <div className="flex items-center justify-between mb-2.5">
          <Rotulo><Clock className="h-3 w-3" /> Horas do dia</Rotulo>
          <Pilula className="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">8h norm.</Pilula>
        </div>
        <Foco etiqueta="Escolhe as horas" className="mt-1"><div className="grid grid-cols-5 gap-1.5">
          {[0, 4, 6, 8, 10].map(h => (
            <span key={h} className={cn(
              "h-10 rounded-xl border text-xs font-bold flex items-center justify-center",
              h === 8 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-background border-border/40 text-muted-foreground"
            )}>{h === 0 ? "Aus." : `${h}h`}</span>
          ))}
        </div></Foco>
        <p className="text-[10px] text-muted-foreground mt-2">Seg – Sex · primeiras 8h são normais</p>
      </Cartao>
      <Cartao className="flex items-center justify-between py-2.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400"><Euro className="h-4 w-4" /> ≈ 96,00 €</span>
        <span className="text-[11px] text-muted-foreground">(12€/h)</span>
      </Cartao>
    </div>
  )
}

// ── 5. Serviço e obra ───────────────────────────────────────────────────────
function IlServico() {
  return (
    <Cartao className="space-y-3">
      <div className="space-y-1.5">
        <Rotulo><HardHat className="h-3 w-3" /> Obra</Rotulo>
        <Foco etiqueta="Da lista" lado="dir"><div className="rounded-xl border border-border/60 bg-card p-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <p className="text-xs font-bold truncate flex-1">Obra Rua das Flores</p>
            <Pilula className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 !py-0.5">Ativa</Pilula>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> Rua das Flores, 12 · Lisboa</p>
          <div className="flex gap-1.5">
            <Pilula className="bg-muted text-muted-foreground">Google Maps</Pilula>
            <Pilula className="bg-muted text-muted-foreground">Waze</Pilula>
          </div>
        </div></Foco>
      </div>
      <div className="space-y-1.5">
        <Rotulo>Descrição</Rotulo>
        <div className="rounded-xl border border-border/60 p-2.5 space-y-1.5"><Linha /><Linha w="w-4/5" /></div>
      </div>
      <div className="space-y-1.5">
        <Rotulo>Materiais</Rotulo>
        <div className="flex flex-wrap gap-1.5">
          {["Cimento cola", "Rejunte", "Espaçadores"].map(m => (
            <span key={m} className="rounded-full bg-muted border border-border/50 px-2.5 py-1 text-[10px] font-medium">{m}</span>
          ))}
        </div>
      </div>
    </Cartao>
  )
}

// ── 6. Fotos ────────────────────────────────────────────────────────────────
function Fotos({ titulo, cor, cores }: { titulo: string; cor: string; cores: string[] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Pilula className={cn("text-white !text-[9px] uppercase", cor)}>{titulo}</Pilula>
        <span className="text-[10px] text-muted-foreground tabular-nums">{cores.length}/10</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {cores.map((c, i) => (
          <div key={i} className={cn("aspect-square rounded-xl bg-gradient-to-br flex items-center justify-center", c)}>
            <Camera className="h-4 w-4 text-white/70" />
          </div>
        ))}
        <div className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center"><Plus className="h-4 w-4 text-muted-foreground" /></div>
      </div>
    </div>
  )
}
function IlFotos() {
  return (
    <Cartao className="space-y-3">
      <Fotos titulo="Antes" cor="bg-amber-500" cores={["from-slate-400 to-slate-600", "from-stone-400 to-stone-600"]} />
      <Fotos titulo="Depois" cor="bg-emerald-500" cores={["from-sky-400 to-blue-600", "from-teal-400 to-emerald-600", "from-indigo-400 to-violet-600"]} />
    </Cartao>
  )
}

// ── 7. Equipa ───────────────────────────────────────────────────────────────
function IlEquipa() {
  return (
    <div className="space-y-2.5">
      <Foco etiqueta="Tu já estás lá"><Cartao className="space-y-2">
        <div className="flex items-center justify-between"><Rotulo>Equipa</Rotulo><span className="text-[10px] font-semibold text-primary">Editar</span></div>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 pl-1 pr-2.5 py-1 text-[11px] font-semibold">
            <Avatar ini="JD" cor="bg-violet-500" /> João da Silva <Lock className="h-2.5 w-2.5 opacity-60" />
          </span>
          {[["MC", "Maria Costa", "bg-teal-500"], ["PA", "Pedro Alves", "bg-fuchsia-500"]].map(([i, n, c]) => (
            <span key={n} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 pl-1 pr-1.5 py-1 text-[11px] font-semibold">
              <Avatar ini={i} cor={c} /> {n} <X className="h-3 w-3 opacity-60" />
            </span>
          ))}
        </div>
      </Cartao></Foco>
      <Cartao className="p-0 overflow-hidden">
        {[["JD", "João da Silva", "bg-violet-500", "Tu · sempre na equipa", true, true], ["MC", "Maria Costa", "bg-teal-500", "", true, false], ["LR", "Luís Rocha", "bg-orange-500", "", false, false]].map(([i, n, c, sub, sel, eu]) => (
          <div key={n as string} className={cn("flex items-center gap-2.5 px-3 py-2 border-b last:border-0 border-border/30", sel && "bg-primary/5")}>
            <Avatar ini={i as string} cor={c as string} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-semibold", sel && "text-primary")}>{n as string}</p>
              {sub ? <p className="text-[9px] text-muted-foreground">{sub as string}</p> : null}
            </div>
            <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", sel ? "bg-primary border-primary" : "border-border")}>
              {sel && (eu ? <Lock className="h-2.5 w-2.5 text-primary-foreground" /> : <Check className="h-3 w-3 text-primary-foreground" />)}
            </span>
          </div>
        ))}
      </Cartao>
    </div>
  )
}

// ── 8. Dias fechados e correções ────────────────────────────────────────────
function IlBloqueio() {
  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl border border-blue-300/60 bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-300/60 flex items-center justify-center shrink-0"><Lock className="h-4 w-4 text-blue-600" /></span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-blue-900 dark:text-blue-200 leading-tight">O admin corrigiu dias do teu registo</p>
          <p className="text-[10px] text-blue-700/80 dark:text-blue-300/70 leading-tight">Estes dias já não podem ser alterados por ti</p>
        </div>
      </div>
      <Foco etiqueta="Dias fechados" className="mt-1"><Cartao className="p-2.5">
        <div className="grid grid-cols-5 gap-1.5">
          <Dia n={1} estado="naoPago" horas="9h" bloqueado /><Dia n={2} estado="naoPago" horas="8h" bloqueado />
          <Dia n={5} estado="naoPago" horas="8h" /><Dia n={6} estado="naoPago" horas="8h" /><Dia n={7} estado="hoje" horas="5h" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><Lock className="h-3 w-3 text-amber-500" /> Cadeado = dia fechado</p>
      </Cartao></Foco>
    </div>
  )
}

// ── 9. Relatório ────────────────────────────────────────────────────────────
function IlRelatorio() {
  return (
    <Cartao className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"><FileText className="h-4 w-4" /></span>
        <p className="text-sm font-bold flex-1">Relatórios</p>
        <Pilula className="bg-muted text-muted-foreground">Por período</Pilula>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["64h", "Horas"], ["8", "Dias"], ["768 €", "Valor"]].map(([v, l]) => (
          <div key={l} className="rounded-xl bg-muted/50 py-2"><p className="text-sm font-black leading-none">{v}</p><p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{l}</p></div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Rotulo>Distribuição de horas</Rotulo>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden flex"><div className="w-[88%] bg-blue-500" /><div className="w-[12%] bg-orange-400" /></div>
        <div className="flex justify-between text-[10px] text-muted-foreground"><span>● Normais 56h</span><span className="text-orange-500">● Extras 8h</span></div>
      </div>
      <Foco etiqueta="PDF" className="mt-1"><div className="h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2"><Download className="h-4 w-4" /> Exportar PDF</div></Foco>
    </Cartao>
  )
}

// ── 10. Financeiro ──────────────────────────────────────────────────────────
function IlFinanceiro() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Cartao className="py-2.5"><Rotulo>Total devido</Rotulo><p className="text-lg font-black mt-1 leading-none">768,00 €</p></Cartao>
        <Cartao className="py-2.5"><Rotulo>Total recebido</Rotulo><p className="text-lg font-black mt-1 leading-none text-emerald-600 dark:text-emerald-400">300,00 €</p></Cartao>
      </div>
      <Cartao className="py-2.5 space-y-1.5">
        <div className="flex justify-between text-[10px] font-semibold"><span className="text-muted-foreground">Pendente</span><span className="text-amber-600 dark:text-amber-400">468,00 €</span></div>
        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full w-[39%] bg-emerald-500" /></div>
      </Cartao>
      <Foco etiqueta="Quando recebes"><Cartao className="space-y-2">
        <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center"><Plus className="h-4 w-4 text-white" /></span><p className="text-xs font-bold">Registar Pagamento</p></div>
        <div className="grid grid-cols-3 gap-1.5">
          {[["Método", "MB Way"], ["Data", "10/10"], ["Valor", "300 €"]].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-border/60 px-2 py-1.5"><p className="text-[8px] font-bold uppercase text-muted-foreground">{l}</p><p className="text-[11px] font-semibold">{v}</p></div>
          ))}
        </div>
      </Cartao></Foco>
    </div>
  )
}

// ── 11 / 12. Cabeçalho (escala, ferramentas) ────────────────────────────────
function BarraTopo({ destaque }: { destaque: "escala" | "ferramentas" }) {
  const item = (Ic: ComponentType<{ className?: string }>, cor: string, on: boolean, badge?: boolean) => (
    <span className={cn("relative w-9 h-9 rounded-full border flex items-center justify-center", cor, on ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "opacity-50")}>
      <Ic className="h-4 w-4" />
      {badge && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">1</span>}
    </span>
  )
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-3 py-2.5 shadow-sm">
      <span className="inline-flex items-center gap-1.5 text-xs font-black"><HardHat className="h-4 w-4 text-primary" /> JBRICOLAGE</span>
      <div className="flex items-center gap-2.5">
        {item(CalendarDays, "bg-amber-100 border-amber-300 text-amber-700", destaque === "escala")}
        {item(Wrench, "bg-indigo-100 border-indigo-300 text-indigo-600", destaque === "ferramentas")}
        {item(Bell, "bg-red-100 border-red-300 text-red-600", false, true)}
      </div>
    </div>
  )
}
function IlEscala() {
  return (
    <div className="space-y-2.5">
      <BarraTopo destaque="escala" />
      <Cartao className="space-y-2.5">
        <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center"><CalendarDays className="h-4 w-4 text-amber-600" /></span><p className="text-sm font-bold">Escala do dia</p></div>
        <div className="rounded-xl bg-muted/50 p-2.5 space-y-2">
          <Rotulo>Para onde vais</Rotulo>
          <p className="text-xs font-bold flex items-center gap-1.5"><HardHat className="h-3.5 w-3.5 text-primary" /> Obra Rua das Flores</p>
          <div className="flex items-center gap-1.5">
            <Avatar ini="MC" cor="bg-teal-500" /><Avatar ini="PA" cor="bg-fuchsia-500" /><span className="text-[10px] text-muted-foreground">Maria, Pedro</span>
          </div>
        </div>
      </Cartao>
    </div>
  )
}
function IlFerramentas() {
  return (
    <div className="space-y-2.5">
      <BarraTopo destaque="ferramentas" />
      {[["12", "Berbequim Bosch", "from-sky-400 to-blue-600", "há 3 dias"], ["27", "Rebarbadora 125mm", "from-orange-400 to-red-500", "há 1 dia"]].map(([n, t, g, q]) => (
        <Cartao key={n} className="flex items-center gap-3 p-2.5">
          <div className={cn("relative w-14 h-14 rounded-xl bg-gradient-to-br shrink-0 flex items-center justify-center", g)}>
            <Wrench className="h-5 w-5 text-white/80" />
            <span className="absolute top-1 left-1 min-w-5 h-5 px-1 rounded-md bg-black/70 text-white text-[10px] font-black flex items-center justify-center">{n}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight">{t}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><HardHat className="h-3 w-3" /> Obra Rua das Flores</p>
            <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1"><Clock className="h-3 w-3" /> {q}</p>
          </div>
        </Cartao>
      ))}
    </div>
  )
}

// ── 13. Recibo (independentes) ──────────────────────────────────────────────
function IlRecibo() {
  return (
    <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center"><Receipt className="h-3.5 w-3.5 text-indigo-600" /></span>
        <p className="text-sm font-bold flex-1">Recibo</p>
        <span className="inline-flex items-center rounded-lg bg-white/70 dark:bg-white/5 text-xs font-bold">
          <ChevronLeft className="h-4 w-4 mx-1.5" /><span className="px-1">Outubro 2026</span><ChevronRight className="h-4 w-4 mx-1.5 opacity-30" />
        </span>
      </div>
      <Foco etiqueta="O teu PDF" className="mt-1"><div className="flex items-center gap-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 pl-3 pr-1.5 py-1.5">
        <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
        <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold truncate">recibo-joao-silva-10-2026.pdf</p><p className="text-[9px] text-muted-foreground">120 KB · 10 out</p></div>
        <ExternalLink className="h-4 w-4 mx-1" /><RefreshCw className="h-4 w-4 mx-1" /><Trash2 className="h-4 w-4 mx-1 text-red-500" />
      </div></Foco>
    </div>
  )
}

// ── 14. Definições ──────────────────────────────────────────────────────────
function IlDefinicoes() {
  const linha = (Ic: ComponentType<{ className?: string }>, cor: string, t: string, s?: string) => (
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b last:border-0 border-border/30">
      <span className={cn("w-7 h-7 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", cor)}><Ic className="h-3.5 w-3.5 text-white" /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold leading-tight">{t}</p>{s && <p className="text-[9px] text-muted-foreground leading-tight">{s}</p>}</div>
    </div>
  )
  return (
    <div className="space-y-2.5">
      <Cartao className="flex items-center gap-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white text-lg font-black flex items-center justify-center">JD</div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-card flex items-center justify-center"><Camera className="h-3 w-3 text-primary-foreground" /></span>
        </div>
        <div><p className="text-sm font-black leading-tight">João da Silva</p><p className="text-[10px] text-muted-foreground">Selfie ou galeria</p></div>
      </Cartao>
      <Cartao className="p-0 overflow-hidden">
        {linha(User, "from-blue-500 to-indigo-600", "Nome e telemóvel", "Podes editar")}
        {linha(CreditCard, "from-sky-500 to-blue-600", "MB Way / IBAN", "Privado — só a gestão vê")}
        {linha(Euro, "from-emerald-500 to-green-600", "Taxa horária: 12 €/hora", "Definida pela gestão")}
        {linha(Smartphone, "from-violet-500 to-purple-600", "Instalar no dispositivo", "Acesso rápido e modo offline")}
        {linha(LogOut, "from-rose-500 to-red-600", "Terminar sessão")}
      </Cartao>
    </div>
  )
}

// ── 15. Fim ─────────────────────────────────────────────────────────────────
function IlFim() {
  return (
    <div className="flex flex-col items-center gap-4 py-3">
      <div className="relative">
        <span className="absolute -inset-4 rounded-full bg-emerald-500/10" />
        <span className="absolute -inset-8 rounded-full bg-emerald-500/5" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
          <CheckCircle2 className="h-12 w-12 text-white" />
        </div>
      </div>
      <div className="flex gap-1.5">{["bg-blue-400", "bg-amber-400", "bg-emerald-400", "bg-violet-400", "bg-rose-400"].map(c => <span key={c} className={cn("w-2 h-2 rounded-full", c)} />)}</div>
    </div>
  )
}

export const ILUSTRACOES: Record<string, ComponentType> = {
  bemvindo: IlBemVindo, calendario: IlCalendario, cores: IlCores, horas: IlHoras, servico: IlServico, fotos: IlFotos,
  equipa: IlEquipa, bloqueio: IlBloqueio, relatorio: IlRelatorio, financeiro: IlFinanceiro, escala: IlEscala,
  ferramentas: IlFerramentas, recibo: IlRecibo, definicoes: IlDefinicoes, fim: IlFim,
}
