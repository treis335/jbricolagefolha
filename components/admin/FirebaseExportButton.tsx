//components/FirebaseExportButton.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "idle" | "loading" | "success" | "error"

export function FirebaseExportButton() {
  const [status, setStatus] = useState<Status>("idle")
  const [info, setInfo] = useState<string | null>(null)

  const handleExport = async () => {
    setStatus("loading")
    setInfo(null)

    try {
      const usersRef = collection(db, "users")
      const snapshot = await getDocs(usersRef)

      const exportData: Record<string, any> = {}
      snapshot.forEach((doc) => {
        exportData[doc.id] = doc.data()
      })

      const totalUsers = snapshot.size
      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const filename = `firebase-users-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19)}.json`

      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setStatus("success")
      setInfo(`${totalUsers} user${totalUsers !== 1 ? "s" : ""} exportados → ${filename}`)
      setTimeout(() => { setStatus("idle"); setInfo(null) }, 5000)
    } catch (err: any) {
      console.error("Erro ao exportar Firebase:", err)
      setStatus("error")
      setInfo(err?.message || "Erro desconhecido")
      setTimeout(() => { setStatus("idle"); setInfo(null) }, 6000)
    }
  }

  return (
    <div className="space-y-2.5">
      <Button
        onClick={handleExport}
        disabled={status === "loading"}
        variant="outline"
        className={cn(
          "w-full h-11 font-medium transition-all",
          status === "success" && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
          status === "error"   && "border-red-500 text-red-600 dark:text-red-400",
        )}
      >
        {status === "loading" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {status === "success" && <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />}
        {status === "error"   && <AlertCircle className="h-4 w-4 mr-2 text-red-500" />}
        {status === "idle"    && <Download className="h-4 w-4 mr-2" />}

        {status === "idle"    && "Exportar Firebase (users)"}
        {status === "loading" && "A exportar..."}
        {status === "success" && "Download concluído!"}
        {status === "error"   && "Erro ao exportar"}
      </Button>

      {info && (
        <p className={cn(
          "text-xs leading-snug px-1",
          status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
        )}>
          {info}
        </p>
      )}
    </div>
  )
}