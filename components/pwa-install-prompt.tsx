"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Check if the app is already installed
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://")

    setIsStandalone(isRunningStandalone)

    // Store the install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setShowButton(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Check if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    if (isIOS && !isRunningStandalone) {
      setShowButton(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = () => {
    if (installPrompt) {
      // For Android and desktop
      installPrompt.prompt()
      installPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt")
          setShowButton(false)
        }
        setInstallPrompt(null)
      })
    } else {
      // For iOS - show instructions
      setIsOpen(true)
    }
  }

  if (isStandalone || !showButton) {
    return null
  }

  return (
    <>
      <Button onClick={handleInstallClick} variant="outline" className="fixed bottom-4 right-4 z-50 shadow-lg">
        <Download className="mr-2 h-4 w-4" />
        Instalar aplicación
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar en iOS</DialogTitle>
            <DialogDescription>Para instalar esta aplicación en su dispositivo iOS:</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">1</div>
              <p>Toque el botón Compartir</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">2</div>
              <p>Desplácese hacia abajo y toque "Añadir a la pantalla de inicio"</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">3</div>
              <p>Toque "Añadir" en la esquina superior derecha</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

