"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { signUp } from "@/lib/actions/auth"
import Link from "next/link"
import { useState } from "react"

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    const result = await signUp(formData)
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
          <CardTitle className="text-2xl">Regístrese en</CardTitle>
          <CardDescription>Crear una nueva cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre y apellidos</Label>
              <Input id="name" name="name" placeholder="Introduzca su nombre completo" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="Introduzca su dirección de correo electrónico" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" placeholder="Crear una contraseña" required />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Crear cuenta..." : "Regístrese en"}
            </Button>
            <div className="text-center text-sm">
              ¿Ya tiene una cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">
              Inicio de sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

