"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LogOut, User, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/actions/auth"
import { MobileNav } from "@/components/mobile-nav"

interface Employee {
  id: string
  name: string
  email: string
  todayHours: {
    start: string
    end: string | null
  } | null
  totalWeekHours: number
}

interface AdminDashboardClientProps {
  employees: Employee[]
}

export function AdminDashboardClient({ employees }: AdminDashboardClientProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between py-4">
          <div className="flex gap-4 items-center">
            <h1 className="text-2xl font-bold hidden md:block">Admin Panel</h1>
            <div className="md:hidden">
              <MobileNav isAdmin={true} currentPath="admin" />
            </div>
          </div>
          <div className="flex items-center gap-4">
              <Link href="/dashboard" className="hidden md:block">
                <Button variant="ghost">
                  <User className="w-4 h-4 mr-2" />
                  Panel de usuario
                </Button>
              </Link>
            <Button variant="ghost" onClick={() => signOut()} className="hidden md:flex">
              <LogOut className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          </div>
        </div>
      </header>
      <main className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-6">
          <Card className="overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <CardTitle>Resumen de empleados</CardTitle>
                  <CardDescription>Gestionar y controlar el tiempo de trabajo de los empleados</CardDescription>
                </div>
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Horario de hoy</TableHead>
                    <TableHead>Total de horas por semana</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        {employee.todayHours
                          ? `${employee.todayHours.start} - ${employee.todayHours.end || "En"}`
                          : "Sin entrada"}
                      </TableCell>
                      <TableCell>{employee.totalWeekHours.toFixed(2)}h</TableCell>
                      <TableCell>
                        <Link href={`/admin/${employee.id}`}>
                          <Button variant="ghost" size="sm">
                            Detalles
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
      
    </div>
  )
}

