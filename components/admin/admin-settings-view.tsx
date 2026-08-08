// components/admin/admin-settings-view.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Settings, Shield, Database, LogOut, ChevronRight,
  Bell, Lock, Building2, HardDrive, Download, AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/lib/AuthProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FirebaseExportButton } from "@/components/admin/FirebaseExportButton"
import { cn } from "@/lib/utils"
import { useGlobalSettings, saveGlobalSettings } from "@/lib/useGlobalSettings"
import { useState } from "react"
import { Check, Loader2 } from "lucide-react"

// ─── section card wrapper ──────────────────────────────────────────────────────
function SectionCard({
  icon, title, description, children, accent = "default",
}: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  accent?: "default" | "red" | "blue" | "emerald"
}) {
  const accents: Record<string, string> = {
    default: "bg-primary/10 text-primary border-primary/20",
    red:     "bg-red-100 dark:bg-red-950/30 text-red-600 border-red-200 dark:border-red-800",
    blue:    "bg-blue-100 dark:bg-blue-950/30 text-blue-600 border-blue-200 dark:border-blue-800",
    emerald: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  }
  return (
    <Card className="rounded-2xl border overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center shrink-0", accents[accent])}>
            {icon}
          </div>
          {title}
        </CardTitle>
        {description && <CardDescription className="mt-0.5 ml-11">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ─── info row ─────────────────────────────────────────────────────────────────
function InfoRow({
  label, value, badge, highlight,
}: {
  label: string; value: string; badge?: string; highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-center py-3 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
        <span className={cn(
          "text-sm font-semibold",
          highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        )}>
          {value}
        </span>
      </div>
    </div>
  )
}

// ─── future feature row ────────────────────────────────────────────────────────
function FutureRow({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0 opacity-55 cursor-not-allowed">
      <div className="p-1.5 bg-muted rounded-lg text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">Brevemente</Badge>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────
// ─── Bloqueio de dias card ────────────────────────────────────────────────────
function DiasBloqueioCard() {
  const { settings, loading } = useGlobalSettings()
  const [value,   setValue]   = useState<number | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const current = value !== null ? value : (settings.diasBloqueio ?? 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveGlobalSettings({ diasBloqueio: current })
      setValue(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const hasChange = value !== null && value !== settings.diasBloqueio

  return (
    <SectionCard
      icon={<Lock className="h-4 w-4" />}
      title="Bloqueio de Dias"
      description="Define quantos dias os colaboradores têm para editar um registo"
    >
      {loading ? (
        <div className="px-5 py-4 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A carregar…</span>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            Após este prazo, os colaboradores não conseguem editar nem preencher dias antigos.
            <strong className="text-foreground"> 0 = sem bloqueio</strong> (comportamento atual).
          </p>

          {/* Slider + display */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <input
                type="range" min={0} max={30} step={1}
                value={current}
                onChange={e => setValue(Number(e.target.value))}
                className="w-full h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer"
              />
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground/40 font-bold">Desativado</span>
                <span className="text-[9px] text-muted-foreground/40 font-bold">30 dias</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center w-16 h-14 rounded-xl bg-muted/40 border border-border/50 shrink-0">
              <span className="text-xl font-black tabular-nums text-foreground leading-none">
                {current === 0 ? "∞" : current}
              </span>
              <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wide mt-0.5">
                {current === 0 ? "livre" : current === 1 ? "dia" : "dias"}
              </span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider shrink-0">Rápido:</span>
            {[0, 3, 5, 7, 14].map(v => (
              <button key={v} onClick={() => setValue(v)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                  current === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border/50 hover:border-border"
                )}>
                {v === 0 ? "Sem limite" : `${v}d`}
              </button>
            ))}
          </div>

          {/* Status / info */}
          {current > 0 ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
              <svg width="14" height="14" className="text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                Colaboradores têm <strong>{current} dia{current !== 1 ? "s" : ""}</strong> para preencher ou editar cada dia.
                Após esse prazo, o dia fica 🔒 trancado para eles.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
              <svg width="14" height="14" className="text-muted-foreground/40 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p className="text-[11px] text-muted-foreground/60">
                Sem bloqueio — colaboradores podem editar qualquer dia no passado.
              </p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasChange || saving}
            className={cn(
              "w-full h-10 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
              hasChange
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />A guardar…</>
            : saved  ? <><Check className="h-4 w-4" />Guardado!</>
            : hasChange ? "Guardar alteração"
            : "Sem alterações"}
          </button>
        </div>
      )}
    </SectionCard>
  )
}

export function AdminSettingsView() {
  const { user, logout } = useAuth()

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Admin"
  const initials = displayName.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()

  const handleLogout = async () => {
    try { await logout() }
    catch (err) { console.error(err); alert("Erro ao terminar a sessão.") }
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-4 pb-24 md:p-8 md:pb-12 space-y-6 max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl border border-primary/20">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Definições</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configurações do painel de administração</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── Conta Admin ── */}
          <SectionCard
            icon={<Shield className="h-4 w-4" />}
            title="Conta de Administrador"
            description="Informações da sessão atual"
            accent="default"
          >
            {/* Avatar strip */}
            <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border mb-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 text-primary font-bold text-xl flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || "—"}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Shield className="h-2.5 w-2.5" /> Administrador
                  </Badge>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-0">
              <InfoRow label="Nome" value={displayName} />
              <InfoRow label="Email" value={user?.email || "—"} />
              <InfoRow label="Tipo de Conta" value="Administrador" badge="Admin" />
              <InfoRow label="Estado" value="Sessão ativa" highlight />
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 mt-5 p-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                <LogOut className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm font-semibold text-red-600 dark:text-red-400 flex-1 text-left">Terminar Sessão</span>
              <ChevronRight className="h-4 w-4 text-red-400/50 group-hover:text-red-400 transition-colors" />
            </button>
          </SectionCard>

          {/* Right column */}
          <div className="space-y-5">

            {/* ── Sistema ── */}
            <SectionCard
              icon={<Database className="h-4 w-4" />}
              title="Sistema"
              description="Informações técnicas da aplicação"
              accent="blue"
            >
              <InfoRow label="Versão" value="1.0.0" badge="Admin" />
              <InfoRow label="Base de Dados" value="Firebase Firestore" />
              <InfoRow label="Ambiente" value="Produção" highlight />
              <InfoRow label="Autenticação" value="Firebase Auth" />
            </SectionCard>

            {/* ── Exportação de dados ── */}
            <SectionCard
              icon={<Download className="h-4 w-4" />}
              title="Exportação de Dados"
              description="Backup completo da base de dados Firebase"
              accent="emerald"
            >
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Exporta todos os registos de utilizadores (workers e admins) para um ficheiro JSON. Útil para backups e auditoria.
              </p>
              <FirebaseExportButton />
              <div className="flex items-start gap-2.5 mt-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 rounded-xl">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>O ficheiro exportado contém dados sensíveis. Guarda-o em local seguro e não o partilhes.</span>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* ── Bloqueio de dias ── */}
        <DiasBloqueioCard />

        {/* ── Funcionalidades futuras ── */}
        <SectionCard
          icon={<Settings className="h-4 w-4" />}
          title="Funcionalidades em Desenvolvimento"
          description="Brevemente disponíveis"
        >
          <div className="space-y-0">
            <FutureRow icon={<Building2 className="h-4 w-4" />} label="Configurações da empresa" desc="Dados e informações organizacionais" />
            <FutureRow icon={<Bell className="h-4 w-4" />} label="Notificações e alertas" desc="Configurar alertas automáticos de pagamento" />
            <FutureRow icon={<HardDrive className="h-4 w-4" />} label="Backup automático" desc="Cópias de segurança programadas" />
          </div>
        </SectionCard>

      </div>
    </ScrollArea>
  )
}