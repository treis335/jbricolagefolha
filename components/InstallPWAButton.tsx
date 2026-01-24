"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"  // ou qualquer ícone que preferires

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne o prompt automático do browser
      e.preventDefault()
      // Guarda o evento para usar depois
      setDeferredPrompt(e)
      // Mostra o botão
      setShowInstallButton(true)
    }

    // Ouve o evento (disparado quando a app é "installable")
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Verifica se já está instalada (opcional: esconde botão se já for PWA)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallButton(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Mostra o prompt de instalação
    deferredPrompt.prompt()

    // Espera a escolha do user
    const { outcome } = await deferredPrompt.userChoice

    // Limpa o prompt guardado
    setDeferredPrompt(null)
    setShowInstallButton(false)

    if (outcome === "accepted") {
      console.log("PWA instalada com sucesso!")
      // Opcional: mostra toast de sucesso
    } else {
      console.log("Instalação cancelada")
    }
  }

  if (!showInstallButton) return null

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Instala a app no teu telemóvel para usar offline e ter ícone na tela inicial!
      </p>
      <Button
        onClick={handleInstallClick}
        className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
      >
        <Download className="h-5 w-5 mr-2" />
        Instalar App
      </Button>
    </div>
  )
}