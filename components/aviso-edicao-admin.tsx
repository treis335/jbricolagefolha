// components/aviso-edicao-admin.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { ShieldCheck, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/lib/AuthProvider"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { marcarNotificacaoVista } from "@/lib/admin-day-editor-service"
import { cn } from "@/lib/utils"

function formatDataExtensa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
}

export function AvisoEdicaoAdmin() {
  const { user } = useAuth()
  const { data } = useWorkTracker()
  const [open, setOpen] = useState(false)
  const [fechando, setFechando] = useState(false)

  const naoVistos = useMemo(
    () => (data.entries || []).filter((e: any) => e.editadoPorAdmin && e.notificacaoVista === false),
    [data.entries]
  )

  if (naoVistos.length === 0) return null

  const handleFechar = async () => {
    if (!user) return
    setFechando(true)
    try {
      await Promise.all(naoVistos.map((e: any) => marcarNotificacaoVista(user.uid, e.date)))
    } catch (err) {
      console.error(err)
    } finally {
      setFechando(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all press-effect",
          "bg-blue-100 dark:bg-blue-950/40 border border-blue-300/60 dark:border-blue-800/50",
          "text-blue-600 dark:text-blue-400 hover:bg-blue-200/60 dark:hover:bg-blue-900/50"
        )}
        title="O admin corrigiu dias do teu registo"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {naoVistos.length}
        </span>
      </button>

      <Dialog open={open} onOpenChange={v => !v && handleFechar()}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden gap-0">
          <DialogTitle className="sr-only">Dias corrigidos pelo admin</DialogTitle>
          <DialogDescription className="sr-only">O admin editou {naoVistos.length} dia(s) do teu registo</DialogDescription>

          <div className="px-6 pt-6 pb-4 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200/50 dark:border-blue-800/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-base font-black tracking-tight">O admin corrigiu o teu registo</p>
                <p className="text-[11px] text-muted-foreground/70">Estes dias já não podem ser alterados por ti</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {naoVistos.map((e: any) => (
              <div key={e.date} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/40">
                <span className="text-sm font-semibold capitalize">{formatDataExtensa(e.date)}</span>
                <span className="text-sm font-bold text-muted-foreground">{e.totalHoras}h</span>
              </div>
            ))}
          </div>

          <div className="p-4 pt-1">
            <button
              onClick={handleFechar}
              disabled={fechando}
              className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-60"
            >
              Entendido
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
