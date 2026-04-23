// settings-view.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Euro, Info, Download, Upload,
  CheckCircle2, AlertCircle, Share, User, Lock,
  LogOut, Pencil, X, Check, Copy, Smartphone,
  DatabaseBackup, ChevronRight,
  Phone, CreditCard, Camera, Building2,
  Hash, Loader2, Zap, ZapOff, Settings2, ImageIcon,
  Eye, EyeOff, UserCircle2, Shield, Sparkles,
} from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { useAuth } from "@/lib/AuthProvider"
import { MigrateLegacyDataButton } from "@/components/MigrateLegacyDataButton"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { uploadFotoObra } from "@/lib/obras-service"
import { cn } from "@/lib/utils"
import { syncCollaboratorName } from "@/hooks/useActiveCollaborators"

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  username: string
  telemovel: string
  banco: string
  iban: string
  ibanLocked: boolean
  mbwayAtivo: boolean
  mbwayTelemovel: string
  mbwayTitular: string
  mbwayLocked: boolean
  fotoUrl: string
  fotoLocked: boolean
  nomeLocked: boolean
}

const PROFILE_DEFAULTS: UserProfile = {
  username: "",
  telemovel: "",
  banco: "",
  iban: "",
  ibanLocked: false,
  mbwayAtivo: false,
  mbwayTelemovel: "",
  mbwayTitular: "",
  mbwayLocked: false,
  fotoUrl: "",
  fotoLocked: false,
  nomeLocked: false,
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ fotoUrl, nome, size = "lg" }: { fotoUrl: string; nome: string; size?: "sm" | "lg" }) {
  const initials = nome.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
  const dim = size === "lg" ? "w-20 h-20 sm:w-24 sm:h-24" : "w-10 h-10"
  const text = size === "lg" ? "text-2xl sm:text-3xl" : "text-base"

  if (fotoUrl) {
    return (
      <img
        key={fotoUrl}
        src={fotoUrl}
        alt={nome}
        className={cn(dim, "rounded-[1.25rem] object-cover ring-4 ring-white/15 shadow-2xl shrink-0")}
      />
    )
  }
  return (
    <div className={cn(
      dim, text,
      "rounded-[1.25rem] bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shrink-0 shadow-2xl ring-4 ring-white/15"
    )}>
      {initials || <User className="h-6 w-6 sm:h-8 sm:w-8 opacity-90" />}
    </div>
  )
}

// ── Locked Photo Button ───────────────────────────────────────────────────────
function LockedPhotoButton() {
  return (
    <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-2xl bg-red-500 border-[3px] border-background flex items-center justify-center shadow-lg">
      <Lock className="h-3.5 w-3.5 text-white" />
    </div>
  )
}

// ── Confirm Edit Dialog ───────────────────────────────────────────────────────
function ConfirmEditDialog({ field, onConfirm, onCancel }: {
  field: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl bg-card border border-border/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex justify-center pt-8 pb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="px-6 pb-3 text-center">
            <p className="text-base font-bold">Alterar {field}?</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Este campo já tem um valor guardado. Tens a certeza que pretendes modificá-lo?
            </p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <button onClick={onCancel}
              className="h-12 rounded-2xl border border-border/50 text-sm font-semibold text-muted-foreground hover:bg-muted/60 transition-all active:scale-95">
              Cancelar
            </button>
            <button onClick={onConfirm}
              className="h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-amber-500/25">
              Modificar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── InstallPWAButton ──────────────────────────────────────────────────────────
function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const check = () => { if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true) }
    check()
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("focus", check)
    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("focus", check)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") setIsInstalled(true)
      setDeferredPrompt(null)
    } else {
      alert("Para instalar, usa o menu do navegador.")
    }
  }

  return (
    <Section
      icon={<Smartphone className="h-4 w-4" />}
      gradient="from-violet-500 via-purple-500 to-fuchsia-500"
      title="Instalar App"
    >
      {isInstalled ? (
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Aplicação instalada</p>
            <p className="text-xs text-muted-foreground mt-0.5">A correr em modo standalone</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Instalar no dispositivo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Acesso rápido e modo offline</p>
          </div>
          <Button
            size="sm"
            onClick={handleInstall}
            className="shrink-0 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white h-9 px-4 rounded-xl shadow-md shadow-violet-500/25 text-xs font-bold border-0"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />Instalar
          </Button>
        </div>
      )}
    </Section>
  )
}

// ── EditableField ─────────────────────────────────────────────────────────────
function EditableField({
  label, value, placeholder, type = "text", icon, onSave, sensitive, confirmIfFilled, locked,
}: {
  label: string; value: string; placeholder: string; type?: string
  icon?: React.ReactNode; onSave: (v: string) => Promise<void>
  sensitive?: boolean; confirmIfFilled?: boolean; locked?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  const handleSave = async () => {
    setSaving(true); await onSave(draft.trim()); setSaving(false); setEditing(false)
  }

  const handleEditClick = () => {
    if (confirmIfFilled && value.trim()) setShowConfirm(true)
    else { setEditing(true); setDraft(value) }
  }

  const masked = sensitive && value && !editing
    ? value.slice(0, 4) + " ···· ···· " + value.slice(-4)
    : value

  if (locked) {
    return (
      <div className="px-4 py-3.5">
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 font-black mb-2.5">
          {icon && <span className="opacity-50">{icon}</span>}{label}
        </label>
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-red-50/80 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30">
          <p className={cn(
            "text-sm font-medium truncate flex-1 min-w-0 text-red-900/70 dark:text-red-200/60",
            !value && "italic font-normal text-red-400/60"
          )}>
            {sensitive && value ? value.slice(0, 4) + " ···· ···· " + value.slice(-4) : value || placeholder}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-5 w-5 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <Lock className="h-3 w-3 text-red-500" />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-red-500/60 dark:text-red-400/60 mt-1.5 font-semibold">
          Bloqueado pela gestão — contacta o supervisor.
        </p>
      </div>
    )
  }

  return (
    <>
      {showConfirm && (
        <ConfirmEditDialog
          field={label}
          onConfirm={() => { setShowConfirm(false); setEditing(true); setDraft(value) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className="px-4 py-3.5">
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 font-black mb-2.5">
          {icon && <span className="opacity-50">{icon}</span>}{label}
        </label>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
              type={type}
              className="h-10 text-sm flex-1 min-w-0 bg-muted/40 border-border/40 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/60"
              disabled={saving}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") { setEditing(false); setDraft(value) }
              }}
            />
            <button onClick={handleSave} disabled={saving}
              className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-500/25">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button onClick={() => { setEditing(false); setDraft(value) }} disabled={saving}
              className="w-10 h-10 rounded-xl border border-border/40 hover:bg-muted/70 text-muted-foreground flex items-center justify-center transition-all shrink-0 active:scale-95">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className={cn(
              "text-sm font-medium truncate flex-1 min-w-0",
              !value && "text-muted-foreground/35 italic font-normal"
            )}>
              {masked || placeholder}
            </p>
            <button onClick={handleEditClick}
              className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted border border-border/30 flex items-center justify-center transition-all shrink-0 active:scale-95">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── MBwayToggle ───────────────────────────────────────────────────────────────
function MBwayToggle({
  enabled, mbwayTelemovel, mbwayTitular, iban, locked,
  onToggle, onSaveTelemovel, onSaveTitular,
}: {
  enabled: boolean; mbwayTelemovel: string; mbwayTitular: string
  iban: string; locked?: boolean
  onToggle: (v: boolean) => Promise<void>
  onSaveTelemovel: (v: string) => Promise<void>
  onSaveTitular: (v: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [editingTel, setEditingTel] = useState(false)
  const [draftTel, setDraftTel] = useState(mbwayTelemovel)
  const [savingTel, setSavingTel] = useState(false)
  const [editingTitular, setEditingTitular] = useState(false)
  const [draftTitular, setDraftTitular] = useState(mbwayTitular)
  const [savingTitular, setSavingTitular] = useState(false)

  useEffect(() => { if (!editingTel) setDraftTel(mbwayTelemovel) }, [mbwayTelemovel, editingTel])
  useEffect(() => { if (!editingTitular) setDraftTitular(mbwayTitular) }, [mbwayTitular, editingTitular])

  const canEnable = !!mbwayTelemovel && !!mbwayTitular

  const handleToggle = async () => {
    if (locked || (!canEnable && !enabled)) return
    setSaving(true); await onToggle(!enabled); setSaving(false)
  }

  const handleSaveTel = async () => {
    setSavingTel(true); await onSaveTelemovel(draftTel.trim()); setSavingTel(false); setEditingTel(false)
  }

  const handleSaveTitular = async () => {
    setSavingTitular(true); await onSaveTitular(draftTitular.trim()); setSavingTitular(false); setEditingTitular(false)
  }

  return (
    <div className="px-4 py-4">
      {/* Main toggle row */}
      <div className={cn(
        "rounded-2xl border p-4 transition-all duration-300",
        locked
          ? "bg-red-50/60 dark:bg-red-950/10 border-red-200/50 dark:border-red-800/30"
          : enabled
            ? "bg-gradient-to-br from-indigo-50/80 to-blue-50/60 dark:from-indigo-950/20 dark:to-blue-950/15 border-indigo-200/60 dark:border-indigo-800/40 shadow-sm"
            : "bg-muted/30 border-border/30"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
              locked
                ? "bg-red-100 dark:bg-red-950/40"
                : enabled
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
                  : "bg-muted/70 border border-border/30"
            )}>
              {locked
                ? <Lock className="h-4 w-4 text-red-500" />
                : enabled
                  ? <Zap className="h-4 w-4 text-white" />
                  : <ZapOff className="h-4 w-4 text-muted-foreground/40" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">MBway</p>
              <p className={cn("text-xs truncate mt-0.5",
                locked ? "text-red-500/80" : enabled ? "text-blue-600 dark:text-blue-400 font-medium" : "text-muted-foreground"
              )}>
                {locked ? "Bloqueado pela gestão"
                  : enabled ? `Ativo · ${mbwayTitular || mbwayTelemovel}`
                  : !mbwayTelemovel || !mbwayTitular ? "Preenche os dados abaixo"
                  : "Desativado"}
              </p>
            </div>
          </div>

          {/* Toggle pill */}
          <button
            onClick={handleToggle}
            disabled={saving || locked || (!canEnable && !enabled)}
            className={cn(
              "relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 focus:outline-none",
              locked ? "opacity-40 cursor-not-allowed bg-muted-foreground/20"
                : enabled ? "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md shadow-blue-500/30"
                : "bg-muted-foreground/20",
              !locked && "disabled:opacity-40"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300",
              enabled ? "left-[26px]" : "left-0.5"
            )}>
              {saving && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-2.5 w-2.5 text-muted-foreground animate-spin" />
                </span>
              )}
            </span>
          </button>
        </div>

        {locked && (
          <p className="text-[10px] text-red-500/70 mt-3 font-semibold">
            Bloqueado pela gestão — contacta o supervisor para alterações.
          </p>
        )}

        {/* Sub-fields */}
        <div className="mt-4 pt-4 border-t border-border/15 space-y-4">
          {/* Titular */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 font-black mb-2 flex items-center gap-1.5">
              <UserCircle2 className="h-3 w-3 opacity-60" />Titular da conta
            </p>
            {!locked && editingTitular ? (
              <div className="flex items-center gap-1.5">
                <Input value={draftTitular} onChange={e => setDraftTitular(e.target.value)}
                  placeholder="ex: João Silva" type="text"
                  className="h-9 text-sm flex-1 min-w-0 bg-background/80 border-border/40 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/60"
                  disabled={savingTitular} autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleSaveTitular(); if (e.key === "Escape") { setEditingTitular(false); setDraftTitular(mbwayTitular) } }}
                />
                <button onClick={handleSaveTitular} disabled={savingTitular}
                  className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-500/20">
                  {savingTitular ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => { setEditingTitular(false); setDraftTitular(mbwayTitular) }} disabled={savingTitular}
                  className="w-9 h-9 rounded-xl border border-border/40 hover:bg-muted/60 text-muted-foreground flex items-center justify-center transition-all shrink-0 active:scale-95">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-sm font-semibold truncate flex-1 min-w-0",
                  !mbwayTitular && "text-muted-foreground/35 italic font-normal text-xs")}>
                  {mbwayTitular || "Sem titular"}
                </p>
                {!locked ? (
                  <button onClick={() => { setEditingTitular(true); setDraftTitular(mbwayTitular) }}
                    className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted border border-border/30 flex items-center justify-center transition-all shrink-0 active:scale-95">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </button>
                ) : <Lock className="h-3.5 w-3.5 text-red-400/60 shrink-0" />}
              </div>
            )}
          </div>

          {/* Número */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 font-black mb-2 flex items-center gap-1.5">
              <Phone className="h-3 w-3 opacity-60" />Número MBway
            </p>
            {!locked && editingTel ? (
              <div className="flex items-center gap-1.5">
                <Input value={draftTel} onChange={e => setDraftTel(e.target.value)}
                  placeholder="ex: 912 345 678" type="tel"
                  className="h-9 text-sm flex-1 min-w-0 bg-background/80 border-border/40 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/60"
                  disabled={savingTel} autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleSaveTel(); if (e.key === "Escape") { setEditingTel(false); setDraftTel(mbwayTelemovel) } }}
                />
                <button onClick={handleSaveTel} disabled={savingTel}
                  className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-500/20">
                  {savingTel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => { setEditingTel(false); setDraftTel(mbwayTelemovel) }} disabled={savingTel}
                  className="w-9 h-9 rounded-xl border border-border/40 hover:bg-muted/60 text-muted-foreground flex items-center justify-center transition-all shrink-0 active:scale-95">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-sm font-semibold truncate flex-1 min-w-0",
                  !mbwayTelemovel && "text-muted-foreground/35 italic font-normal text-xs")}>
                  {mbwayTelemovel || "Sem número"}
                </p>
                {!locked ? (
                  <button onClick={() => { setEditingTel(true); setDraftTel(mbwayTelemovel) }}
                    className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted border border-border/30 flex items-center justify-center transition-all shrink-0 active:scale-95">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </button>
                ) : <Lock className="h-3.5 w-3.5 text-red-400/60 shrink-0" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TaxaHorariaCard ───────────────────────────────────────────────────────────
function TaxaHorariaCard({ taxa }: { taxa: number }) {
  const [visible, setVisible] = useState(false)

  return (
    <Section
      icon={<Euro className="h-4 w-4" />}
      gradient="from-amber-400 via-orange-400 to-rose-400"
      title="Taxa Horária"
    >
      <div className="px-4 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 font-black mb-2">Taxa atual</p>
            {visible ? (
              <div className="flex items-baseline gap-1.5 animate-in fade-in duration-200">
                <span className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight">{taxa.toFixed(2)}</span>
                <span className="text-xl font-bold text-muted-foreground">€</span>
                <span className="text-sm text-muted-foreground/60">/hora</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-black tabular-nums tracking-widest text-muted-foreground/30 select-none">••••</span>
                <span className="text-xl font-bold text-muted-foreground/30">€</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={() => setVisible(v => !v)}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-sm",
                visible
                  ? "bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                  : "bg-muted/60 hover:bg-muted border border-border/30"
              )}
            >
              {visible
                ? <EyeOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                : <Eye className="h-5 w-5 text-muted-foreground/50" />
              }
            </button>
            <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/20 flex items-center justify-center">
              <Lock className="h-4.5 w-4.5 text-muted-foreground/30" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs bg-amber-50/80 dark:bg-amber-950/20 px-3.5 py-3 rounded-2xl border border-amber-200/40 dark:border-amber-800/30">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
          <span className="font-medium text-amber-700/80 dark:text-amber-300/70">Definida pela gestão. Contacta o supervisor para alterações.</span>
        </div>
      </div>
    </Section>
  )
}

// ── UI Primitives ─────────────────────────────────────────────────────────────
function Section({ icon, gradient, title, children }: {
  icon: React.ReactNode; gradient: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden w-full">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/20 bg-muted/10">
        <div className={cn(
          "w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-md",
          gradient
        )}>
          <span className="text-white">{icon}</span>
        </div>
        <p className="text-sm font-bold tracking-tight">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

function SectionDivider() {
  return <div className="h-px bg-border/20 mx-4" />
}

function ActionRow({ icon, iconGradient, label, description, onClick }: {
  icon: React.ReactNode; iconGradient: string; label: string; description: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 text-sm hover:bg-muted/40 transition-all active:scale-[0.99] group">
      <div className={cn("w-9 h-9 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm", iconGradient)}>
        <span className="text-white">{icon}</span>
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-semibold truncate">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/25 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SettingsView() {
  const { data, importData } = useWorkTracker()
  const { user, logout } = useAuth()

  const [profile, setProfile] = useState<UserProfile>(PROFILE_DEFAULTS)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [editedUsername, setEditedUsername] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)
  const [copiedUid, setCopiedUid] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [textoColado, setTextoColado] = useState("")
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user?.uid) { setLoadingProfile(false); return }
    getDoc(doc(db, "users", user.uid))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data()
          setProfile({
            username: d.username || "",
            telemovel: d.telemovel || "",
            banco: d.banco || "",
            iban: d.iban || "",
            ibanLocked: d.ibanLocked ?? false,
            mbwayAtivo: d.mbwayAtivo || false,
            mbwayTelemovel: d.mbwayTelemovel || d.telemovel || "",
            mbwayTitular: d.mbwayTitular || "",
            mbwayLocked: d.mbwayLocked ?? false,
            fotoUrl: d.fotoUrl || "",
            fotoLocked: d.fotoLocked ?? false,
            nomeLocked: d.nomeLocked ?? false,
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false))
  }, [user?.uid])

  const saveField = async (field: keyof UserProfile, value: string | boolean) => {
    if (!user?.uid) return
    setProfile(prev => ({ ...prev, [field]: value }))
    await setDoc(doc(db, "users", user.uid), { [field]: value }, { merge: true })
  }

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !user?.uid) return
    setShowPhotoOptions(false)
    setUploadingPhoto(true)
    setUploadProgress(0)
    try {
      const uploadId = `perfil_${user.uid}_${Date.now()}`
      const { url } = await uploadFotoObra(file, uploadId, p => setUploadProgress(p))
      await setDoc(doc(db, "users", user.uid), { fotoUrl: url }, { merge: true })
      setProfile(prev => ({ ...prev, fotoUrl: url }))
    } catch (err) {
      console.error("Erro ao carregar foto", err)
      alert("Erro ao guardar a foto.")
    } finally {
      setUploadingPhoto(false)
      setUploadProgress(0)
    }
  }

  const handleSaveUsername = async () => {
    if (!user?.uid || !editedUsername.trim()) return
    setSavingUsername(true)
    try {
      const novoNome = editedUsername.trim()
      await saveField("username", novoNome)
      syncCollaboratorName(user.uid, novoNome).catch(console.error)
      setIsEditingUsername(false)
    } catch { alert("Erro ao guardar o nome.") }
    finally { setSavingUsername(false) }
  }

  const handleCopyUid = () => {
    if (!user?.uid) return
    navigator.clipboard.writeText(user.uid); setCopiedUid(true)
    setTimeout(() => setCopiedUid(false), 2000)
  }

  const handleLogout = async () => {
    try { await logout() } catch { alert("Erro ao terminar a sessão.") }
  }

  const exportarDados = async () => {
    const conteudo = JSON.stringify(data)
    if (!conteudo) { setSyncMessage("Não há dados para exportar."); setSyncSuccess(false); return }
    const blob = new Blob([conteudo], { type: "application/json" })
    const file = new File([blob], `jbricolage-backup-${new Date().toISOString().split("T")[0]}.json`, { type: "application/json" })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Backup JBricolage" })
        setSyncMessage("Partilhado com sucesso!"); setSyncSuccess(true); return
      } catch (e: any) { if (e.name !== "AbortError") console.error(e) }
    }
    try { await navigator.clipboard.writeText(conteudo); setSyncMessage("Copiado para a área de transferência!"); setSyncSuccess(true); return } catch {}
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url)
    setSyncMessage("Ficheiro descarregado!"); setSyncSuccess(true)
  }

  const importarDeArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        importData(JSON.parse(ev.target?.result as string))
        setSyncMessage("Importado com sucesso!"); setSyncSuccess(true)
        setTimeout(() => window.location.reload(), 1000)
      } catch { setSyncMessage("Ficheiro inválido."); setSyncSuccess(false) }
    }
    reader.readAsText(file)
  }

  const importarTextoColado = () => {
    if (!textoColado.trim()) { setSyncMessage("Cola o JSON primeiro."); setSyncSuccess(false); return }
    try {
      importData(JSON.parse(textoColado.trim()))
      setSyncMessage("Importado com sucesso!"); setSyncSuccess(true)
      setTextoColado(""); setTimeout(() => window.location.reload(), 1000)
    } catch { setSyncMessage("JSON inválido."); setSyncSuccess(false) }
  }

  const displayName = loadingProfile
    ? "A carregar..."
    : profile.username || user?.displayName || user?.email?.split("@")[0] || "Utilizador"

  return (
    <>
      <input id="foto-perfil-selfie" type="file" accept="image/*" capture="user" className="sr-only" onChange={handleFileChosen} />
      <input id="foto-perfil-galeria" type="file" accept="image/*" className="sr-only" onChange={handleFileChosen} />

      <ScrollArea className="h-full">
        <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div className="pb-28 md:pb-16 w-full max-w-xl mx-auto">

            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden">
              {/* Background with mesh gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-black" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-600/15 via-transparent to-transparent" />
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "32px 32px"
              }} />

              <div className="relative px-4 sm:px-6 pt-8 sm:pt-10 pb-8 sm:pb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-xl shadow-blue-500/30">
                    <Settings2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Definições</h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">JBricolage · v1.0</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-3 sm:px-4 pt-4">

              {/* ── PERFIL ── */}
              <Section icon={<User className="h-4 w-4" />} gradient="from-blue-500 to-indigo-600" title="Perfil">
                {user ? (
                  <>
                    {/* ── Avatar + Info row ── */}
                    <div className="px-4 py-5 flex items-center gap-4 border-b border-border/15">
                      <div className="relative shrink-0">
                        <Avatar fotoUrl={profile.fotoUrl} nome={displayName} size="lg" />

                        {/* Upload overlay */}
                        {uploadingPhoto && (
                          <div className="absolute inset-0 rounded-[1.25rem] bg-black/55 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                            <span className="text-[11px] font-bold text-white tabular-nums">{uploadProgress}%</span>
                          </div>
                        )}

                        {profile.fotoLocked ? <LockedPhotoButton /> : (
                          <button
                            type="button"
                            onClick={() => !uploadingPhoto && setShowPhotoOptions(true)}
                            disabled={uploadingPhoto}
                            className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 border-[3px] border-background flex items-center justify-center transition-all shadow-lg active:scale-90 disabled:opacity-60"
                          >
                            <Camera className="h-3.5 w-3.5 text-white" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-base sm:text-lg font-bold truncate leading-tight">{displayName}</p>
                        {uploadingPhoto ? (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-blue-500 tabular-nums shrink-0">{uploadProgress}%</span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground/70 truncate mt-1">{user.email || "—"}</p>
                        )}
                      </div>
                    </div>

                    {/* Photo Bottom Sheet */}
                    {showPhotoOptions && !profile.fotoLocked && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md" onClick={() => setShowPhotoOptions(false)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-xl mx-auto px-3 pb-5 animate-in slide-in-from-bottom-4 duration-300">
                          <div className="rounded-3xl bg-card border border-border/40 shadow-2xl overflow-hidden">
                            <div className="flex justify-center pt-3 pb-1">
                              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                            </div>
                            <p className="text-center text-sm font-bold text-muted-foreground pb-4 pt-2">Alterar foto de perfil</p>
                            <div className="grid grid-cols-2 gap-2.5 px-3 pb-4">
                              <label htmlFor="foto-perfil-selfie"
                                className="flex flex-col items-center gap-3 py-5 px-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/40 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all active:scale-95 cursor-pointer select-none">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30 pointer-events-none">
                                  <Camera className="h-7 w-7 text-white" />
                                </div>
                                <div className="text-center pointer-events-none">
                                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Tirar selfie</p>
                                  <p className="text-[11px] text-blue-500/60 mt-0.5">Câmara frontal</p>
                                </div>
                              </label>
                              <label htmlFor="foto-perfil-galeria"
                                className="flex flex-col items-center gap-3 py-5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all active:scale-95 cursor-pointer select-none">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-xl shadow-slate-500/20 pointer-events-none">
                                  <ImageIcon className="h-7 w-7 text-white" />
                                </div>
                                <div className="text-center pointer-events-none">
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Galeria</p>
                                  <p className="text-[11px] text-slate-500/60 mt-0.5">Escolher foto</p>
                                </div>
                              </label>
                            </div>
                            <button onClick={() => setShowPhotoOptions(false)}
                              className="w-full py-4 text-sm font-semibold text-muted-foreground border-t border-border/20 hover:bg-muted/30 transition-colors">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── Nome ── */}
                    <div className="border-b border-border/15 px-4 py-3.5">
                      <label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 font-black flex items-center gap-1.5 mb-2.5">
                        <User className="h-3 w-3 opacity-50" />Nome
                      </label>
                      {isEditingUsername ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedUsername}
                            onChange={e => setEditedUsername(e.target.value)}
                            placeholder="O teu nome"
                            className="h-10 text-sm flex-1 min-w-0 bg-muted/40 border-border/40 rounded-xl"
                            disabled={savingUsername}
                            autoFocus
                            onKeyDown={e => e.key === "Enter" && handleSaveUsername()}
                          />
                          <button onClick={handleSaveUsername} disabled={savingUsername || !editedUsername.trim()}
                            className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-500/25">
                            {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button onClick={() => setIsEditingUsername(false)} disabled={savingUsername}
                            className="w-10 h-10 rounded-xl border border-border/40 hover:bg-muted/60 flex items-center justify-center transition-all shrink-0 active:scale-95">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      ) : profile.nomeLocked ? (
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-red-50/80 dark:bg-red-950/20 border border-red-200/40 dark:border-red-800/30">
                          <p className="text-sm font-medium truncate flex-1 min-w-0 text-red-900/70 dark:text-red-200/60">
                            {profile.username || "Sem nome definido"}
                          </p>
                          <div className="h-5 w-5 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                            <Lock className="h-3 w-3 text-red-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className={cn("text-sm font-medium truncate flex-1 min-w-0",
                            !profile.username && "text-muted-foreground/35 italic font-normal")}>
                            {profile.username || "Sem nome definido"}
                          </p>
                          <button
                            onClick={() => { setIsEditingUsername(true); setEditedUsername(profile.username || user.displayName || user.email?.split("@")[0] || "") }}
                            className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted border border-border/30 flex items-center justify-center transition-all shrink-0 active:scale-95">
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── Telemóvel ── */}
                    <div className="border-b border-border/15">
                      <EditableField
                        label="Telemovel"
                        value={profile.telemovel}
                        placeholder="Sem número definido"
                        type="tel"
                        icon={<Phone className="h-3 w-3" />}
                        onSave={v => saveField("telemovel", v)}
                      />
                    </div>

                    {/* ── Email read-only ── */}
                    <div className="border-b border-border/15 px-4 py-3.5">
                      <label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 font-black mb-2.5 block">Email</label>
                      <p className="text-sm text-muted-foreground/70 truncate">{user.email || "—"}</p>
                    </div>

                    {/* ── UID ── */}
                    <div className="border-b border-border/15">
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40 font-black mb-1.5">ID da conta</p>
                          <p className="text-xs font-mono text-muted-foreground/60 truncate">{user.uid.slice(0, 8)}…{user.uid.slice(-4)}</p>
                        </div>
                        <button
                          onClick={handleCopyUid}
                          className={cn(
                            "h-9 w-9 flex items-center justify-center rounded-xl transition-all shrink-0 active:scale-95",
                            copiedUid ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted/60 hover:bg-muted border border-border/30"
                          )}>
                          {copiedUid
                            ? <Check className="h-4 w-4 text-emerald-500" />
                            : <Copy className="h-4 w-4 text-muted-foreground/50" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* ── Logout ── */}
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-4 text-sm font-semibold text-red-500 hover:bg-red-50/60 dark:hover:bg-red-950/15 transition-all active:scale-[0.99] group">
                      <div className="w-9 h-9 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/40 dark:border-red-800/30 flex items-center justify-center shrink-0 group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-colors">
                        <LogOut className="h-4 w-4 text-red-500" />
                      </div>
                      Terminar sessão
                      <ChevronRight className="h-4 w-4 ml-auto text-red-400/40 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-4">
                    <p className="text-sm text-muted-foreground">Não estás autenticado.</p>
                  </div>
                )}
              </Section>

              {/* ── INFORMAÇÃO DE PAGAMENTO ── */}
              {user && (
                <Section
                  icon={<CreditCard className="h-4 w-4" />}
                  gradient="from-emerald-500 to-teal-500"
                  title="Informação de Pagamento"
                >
                  <div className="px-4 pt-4 pb-1">
                    <div className="flex items-start gap-2.5 text-xs bg-blue-50/80 dark:bg-blue-950/20 px-3.5 py-3 rounded-2xl border border-blue-200/40 dark:border-blue-800/30">
                      <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                      <span className="font-semibold text-blue-700/80 dark:text-blue-300/70">Dados privados — visíveis apenas para a gestão.</span>
                    </div>
                  </div>

                  <div className="border-t border-border/15 mt-4">
                    <EditableField
                      label="Banco"
                      value={profile.banco}
                      placeholder="ex: Caixa Geral de Depósitos"
                      icon={<Building2 className="h-3 w-3" />}
                      onSave={v => saveField("banco", v)}
                      confirmIfFilled
                    />
                  </div>

                  <SectionDivider />

                  <EditableField
                    label="IBAN"
                    value={profile.iban}
                    placeholder="ex: PT50 0000 0000 0000 0000 0000 0"
                    icon={<Hash className="h-3 w-3" />}
                    onSave={v => saveField("iban", v)}
                    sensitive
                    confirmIfFilled
                    locked={profile.ibanLocked}
                  />

                  <SectionDivider />

                  <MBwayToggle
                    enabled={profile.mbwayAtivo}
                    mbwayTelemovel={profile.mbwayTelemovel}
                    mbwayTitular={profile.mbwayTitular}
                    iban={profile.iban}
                    locked={profile.mbwayLocked}
                    onToggle={v => saveField("mbwayAtivo", v)}
                    onSaveTelemovel={v => saveField("mbwayTelemovel", v)}
                    onSaveTitular={v => saveField("mbwayTitular", v)}
                  />
                </Section>
              )}

              {/* ── TAXA HORÁRIA ── */}
              <TaxaHorariaCard taxa={data.settings.taxaHoraria} />

              {/* ── BACKUP & SYNC ── */}
              <Section
                icon={<DatabaseBackup className="h-4 w-4" />}
                gradient="from-violet-500 to-purple-600"
                title="Backup & Sincronização"
              >
                <ActionRow
                  icon={<Share className="h-4 w-4" />}
                  iconGradient="from-violet-500 to-purple-600"
                  label="Exportar dados"
                  description="Partilhar ou guardar backup"
                  onClick={exportarDados}
                />
                <SectionDivider />
                <ActionRow
                  icon={<Upload className="h-4 w-4" />}
                  iconGradient="from-violet-500 to-purple-600"
                  label="Importar de ficheiro"
                  description="Carregar backup .json"
                  onClick={() => fileInputRef.current?.click()}
                />
                <input type="file" accept=".json" ref={fileInputRef} onChange={importarDeArquivo} className="hidden" />

                <div className="px-4 pb-4 pt-4 border-t border-border/15 space-y-3 mt-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/40">
                    Ou cola o JSON de backup:
                  </p>
                  <Textarea
                    value={textoColado}
                    onChange={e => setTextoColado(e.target.value)}
                    placeholder='{"entries":[...],"payments":[...],...}'
                    className="min-h-[90px] font-mono text-xs resize-none bg-muted/30 border-border/30 rounded-2xl"
                  />
                  <Button
                    onClick={importarTextoColado}
                    disabled={!textoColado.trim()}
                    variant="secondary"
                    className="w-full h-10 rounded-xl font-bold"
                  >
                    Importar texto colado
                  </Button>
                </div>

                {syncMessage && (
                  <div className={cn(
                    "mx-4 mb-4 flex items-start gap-3 px-4 py-3.5 rounded-2xl text-sm border font-medium",
                    syncSuccess
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/30"
                      : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200/50 dark:border-red-800/30"
                  )}>
                    {syncSuccess
                      ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                      : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                    }
                    <span>{syncMessage}</span>
                  </div>
                )}
              </Section>

              <InstallPWAButton />
              <MigrateLegacyDataButton />

            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  )
}