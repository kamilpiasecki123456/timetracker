"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { signIn } from "@/lib/actions/auth"
import Link from "next/link"
import { useState } from "react"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    const result = await signIn(formData)
    setIsLoading(false)

    if (result?.error) {
      toast({
        title: "Błąd",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Inicio de sesión</CardTitle>
          <CardDescription>Introduzca sus credenciales para acceder a su cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="Introduzca su dirección de correo electrónico" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" placeholder="Introduzca su contraseña" required />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Iniciando sesión..." : "Inicio de sesión"}
            </Button>
            <div className="text-center text-sm">
              {"¿No tiene cuenta? "}
              <Link href="/register" className="text-primary hover:underline">
              Regístrese en
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

