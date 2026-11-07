// components/sub/empresa-form.tsx
// Dados da empresa (todos opcionais). Usado pela empresa (definições) e pelo admin/patrão.
"use client"
import { useEffect, useRef, useState } from "react"
import { Building2, Loader2, Check, ImagePlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { compressImage } from "@/lib/service-fotos"
import { type EmpresaPerfil, saveEmpresaPerfil, uploadEmpresaLogo } from "@/lib/subempreiteiros-service"

interface Props {
  uid: string
  empresa: EmpresaPerfil
  onSaved?: (e: EmpresaPerfil) => void
}

const CAMPOS: { k: keyof EmpresaPerfil; label: string; ph: string; type?: string }[] = [
  { k: "nome", label: "Nome da empresa", ph: "Ex: Pinturas Silva, Lda" },
  { k: "nif", label: "NIF", ph: "123456789" },
  { k: "responsavel", label: "Responsável", ph: "Nome do contacto" },
  { k: "telefone", label: "Telefone", ph: "912 345 678", type: "tel" },
  { k: "email", label: "Email", ph: "geral@empresa.pt", type: "email" },
  { k: "morada", label: "Morada", ph: "Rua, código postal, cidade" },
]

export function EmpresaForm({ uid, empresa, onSaved }: Props) {
  const [form, setForm] = useState<EmpresaPerfil>(empresa ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setForm(empresa ?? {}) }, [uid, empresa])

  const set = (k: keyof EmpresaPerfil, v: string) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  const handleLogo = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const small = await compressImage(file, 600, 0.85)
      set("logoUrl", await uploadEmpresaLogo(small, uid))
    } catch { alert("Não foi possível enviar o logótipo.") }
    finally { setUploading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveEmpresaPerfil(uid, form)
      onSaved?.(form)
      setSaved(true)
    } catch { alert("Não foi possível guardar.") }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
          {form.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={form.logoUrl} alt="Logótipo" className="w-full h-full object-contain" />
            : <Building2 className="h-8 w-8 text-muted-foreground/40" />}
        </div>
        <div className="space-y-1.5">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="h-9 px-3 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-50">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {form.logoUrl ? "Trocar logótipo" : "Adicionar logótipo"}
          </button>
          {form.logoUrl && (
            <button type="button" onClick={() => set("logoUrl", "")} className="text-[11px] text-muted-foreground underline">remover</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { handleLogo(e.target.files?.[0]); e.target.value = "" }} />
        </div>
      </div>

      {CAMPOS.map(c => (
        <div key={c.k} className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            {c.label} <span className="normal-case font-medium opacity-60">(opcional)</span>
          </label>
          <Input type={c.type ?? "text"} value={(form[c.k] as string) ?? ""} onChange={e => set(c.k, e.target.value)}
            placeholder={c.ph} className="h-11 rounded-xl" />
        </div>
      ))}

      <button type="button" onClick={handleSave} disabled={saving || uploading}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? "Guardado" : "Guardar dados da empresa"}
      </button>
    </div>
  )
}
