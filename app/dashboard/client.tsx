"use client"

import type React from "react"

import type { Database } from "@/types/database.types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { addMonths, format, startOfMonth, endOfMonth, subMonths, isSameMonth } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Clock, LogOut, PencilLine, UserCog } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { clockIn, clockOut, setManualWorkHours, updateWorkHours } from "@/lib/actions/work-hours"
import { signOut } from "@/lib/actions/auth"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type WorkHour = Database["public"]["Tables"]["work_hours"]["Row"]
type User = Database["public"]["Tables"]["users"]["Row"]
type Office = Database["public"]["Tables"]["offices"]["Row"]

// Dodaj selectedMonth do props interfejsu
interface DashboardClientProps {
  user: User
  offices: Office[]
  workHours: WorkHour[]
  todayWorkHours: WorkHour | null
  statistics: {
    totalHours: number
    daysWorked: number
    expectedHours: number
  }
  selectedMonth: Date
}

// Zmodyfikuj deklarację komponentu, aby przyjmował selectedMonth
export function DashboardClient({ user, workHours, todayWorkHours, statistics, selectedMonth, offices }: DashboardClientProps) {
  // Zmień inicjalizację stanu selectedMonth
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedMonth)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSelectPlaceDialogOpen, setIsSelectPlaceDialogOpen] = useState(false)
  const [manualStartTime, setManualStartTime] = useState(todayWorkHours?.start_time || "")
  const [manualEndTime, setManualEndTime] = useState(todayWorkHours?.end_time || "")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [editingDate, setEditingDate] = useState("")
  const [editingWorkHourId, setEditingWorkHourId] = useState("")
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("00000000-0000-0000-0000-000000000000")

  const handleClockInOut = async () => {
    try {
      setIsLoading(true)
      if (!todayWorkHours || todayWorkHours.end_time) {
        const result = await clockIn(user.id, selectedOfficeId)
        if (result.error) {
          throw new Error(result.error)
        }
        toast({
          title: "Rozpoczęto pracę",
          description: `Czas rozpoczęcia: ${format(new Date(), "HH:mm:ss")}`,
        })
      } else {
        const result = await clockOut(user.id)
        if (result.error) {
          throw new Error(result.error)
        }
        toast({
          title: "Zakończono pracę",
          description: `Czas zakończenia: ${format(new Date(), "HH:mm:ss")}`,
        })
      }
      router.refresh()
    } catch (error) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (date: string, startTime: string, endTime: string, workHourId: string, officeId: string) => {
    setEditingDate(date)
    setManualStartTime(startTime)
    setManualEndTime(endTime || "")
    setEditingWorkHourId(workHourId)
    setSelectedOfficeId(officeId)
    setIsDialogOpen(true)
  }

  const handleWorkHours = async (e: React.FormEvent) => {
    e.preventDefault()

    const startDate = new Date(`1970-01-01T${manualStartTime}`)
    const endDate = new Date(`1970-01-01T${manualEndTime}`)

    if (endDate <= startDate) {
      toast({
        title: "Nieprawidłowy zakres czasu",
        description: "Czas zakończenia musi być późniejszy niż czas rozpoczęcia",
        variant: "destructive",
      })
      return
    }

    try {
      let result
      if (editingWorkHourId) {
        // Update existing work hours
        result = await updateWorkHours(editingWorkHourId, manualStartTime, manualEndTime, selectedOfficeId)
      } else {
        // Create new work hours
        const date = editingDate || format(new Date(), "yyyy-MM-dd")
        result = await setManualWorkHours(user.id, date, manualStartTime, manualEndTime, selectedOfficeId)
      }

      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: editingWorkHourId ? "Zaktualizowano godziny pracy" : "Zapisano godziny pracy",
        description: `Ustawiono godziny od ${manualStartTime} do ${manualEndTime}`,
      })
      setIsDialogOpen(false)
      setEditingDate("")
      setEditingWorkHourId("")
      setSelectedOfficeId("00000000-0000-0000-0000-000000000000")
      router.refresh()
    } catch (error) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Zmodyfikuj handlery zmiany miesiąca
  const handlePreviousMonth = () => {
    const newDate = subMonths(currentMonth, 1)
    setCurrentMonth(newDate)
    router.push(`/dashboard?month=${format(newDate, "yyyy-MM-dd")}`)
  }

  const handleNextMonth = () => {
    const newDate = addMonths(currentMonth, 1)
    setCurrentMonth(newDate)
    router.push(`/dashboard?month=${format(newDate, "yyyy-MM-dd")}`)
  }

  // Funkcja generująca dane wykresu
  const generateChartData = (selectedMonth: Date) => {
    // Pobieranie daty początkowej i końcowej miesiąca
    const firstDayOfMonth = startOfMonth(selectedMonth)
    const lastDayOfMonth = endOfMonth(selectedMonth)

    // Funkcja pomocnicza do generowania wszystkich dni w miesiącu
    const generateAllDaysInMonth = (startDate: Date, endDate: Date) => {
      const days = []
      const currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        days.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return days
    }

    // Stwórz listę wszystkich dni w wybranym miesiącu
    const allDaysInMonth = generateAllDaysInMonth(firstDayOfMonth, lastDayOfMonth)

    // Przygotowanie danych wykresu
    return allDaysInMonth.map((day) => {
      // Sprawdzenie, czy dany dzień istnieje w workHours
      const workEntry = workHours.find((entry) => {
        const entryDate = new Date(entry.date)
        return entryDate.getDate() === day.getDate() && entryDate.getMonth() === day.getMonth()
      })

      return {
        date: format(day, "yyyy-MM-dd"),
        displayDate: format(day, "d MMM", { locale: es }),
        hours: workEntry ? workEntry.total_hours || 0 : 0,
        startTime: workEntry ? workEntry.start_time : null,
        endTime: workEntry ? workEntry.end_time || "W trakcie" : null,
        workHourId: workEntry?.id || null,
        officeId: workEntry?.office_id || "00000000-0000-0000-0000-000000000000"
      }
    })
  }

  // Przykład użycia:
  const chartData = generateChartData(currentMonth)

  // Calculate current week's hours
  const currentWeekHours = workHours
    .filter((entry) => {
      const entryDate = new Date(entry.date)
      const now = new Date()
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      return entryDate >= weekStart
    })
    .reduce((sum, entry) => sum + (entry.total_hours || 0), 0)

  // Sprawdzanie aktywnej sesji
  const isClockIn = todayWorkHours && !todayWorkHours.end_time

  const CustomTooltip = ({ active, payload, onEdit }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border rounded p-2 shadow-md">
          <p className="font-bold">{data.displayDate}</p>
          <p>
            Horas: {data.startTime} - {data.endTime || "W trakcie"}
          </p>
          <p>Reelaborado: {data.hours}h</p>
          {isSameMonth(new Date(data.date), new Date()) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(data.date, data.startTime, data.endTime, data.workHourId)}
            >
              <PencilLine className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 ">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between py-4">
          <div className="flex gap-4 items-center">
            <h1 className="text-2xl font-bold hidden md:block">Panel de empleados</h1>
            <div className="md:hidden">
              <MobileNav isAdmin={user.role === "admin"} currentPath="dashboard" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user.role === "admin" && (
              <Link href="/admin" className="hidden md:block">
                <Button variant="ghost">
                  <UserCog className="w-4 h-4 mr-2" />
                  Panel de administración
                </Button>
              </Link>
            )}
            <Button variant="ghost" onClick={() => signOut()} className="hidden md:flex">
              <LogOut className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          </div>
        </div>
      </header>
      <main className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-6 md:grid-cols-12">
          {/* Time Tracking Controls */}
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle>Registro horario</CardTitle>
              <CardDescription>Gestione su tiempo de trabajo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!todayWorkHours && (
                <>
                  
                  <Dialog open={isSelectPlaceDialogOpen} onOpenChange={setIsSelectPlaceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full"
                        variant="default"
                        size="lg"
                        disabled={isLoading}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        {isLoading ? "Proszę czekać..." : "Empezar a trabajar"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleClockInOut}>
                        <DialogHeader>
                          <DialogTitle>Lugar de trabajo</DialogTitle>
                          <DialogDescription>Elija su lugar de trabajo</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Select required value={selectedOfficeId} onValueChange={(value) => setSelectedOfficeId(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Localización" />
                            </SelectTrigger>
                            <SelectContent>
                              {offices.map((office) => (
                                <SelectItem key={office.id} value={office.id}>
                                  {office.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Guardar cambios</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <PencilLine className="w-4 h-4 mr-2" />
                        Establecer horas de funcionamiento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleWorkHours}>
                        <DialogHeader>
                          <DialogTitle>Establecer horas de funcionamiento</DialogTitle>
                          <DialogDescription>Introduzca las horas de inicio y fin</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start-time" className="text-right">
                              Inicio
                            </Label>
                            <Input
                              id="start-time"
                              type="time"
                              value={manualStartTime}
                              onChange={(e) => setManualStartTime(e.target.value)}
                              className="col-span-3"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end-time" className="text-right">
                              Finalización
                            </Label>
                            <Input
                              id="end-time"
                              type="time"
                              value={manualEndTime}
                              onChange={(e) => setManualEndTime(e.target.value)}
                              className="col-span-3"
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Guardar cambios</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {isClockIn && (
                <Button
                  onClick={handleClockInOut}
                  className="w-full"
                  variant="destructive"
                  size="lg"
                  disabled={isLoading}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {isLoading ? "Proszę czekać..." : "Zakończ pracę"}
                </Button>
              )}

              {todayWorkHours?.end_time && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        handleEdit(
                          todayWorkHours.date,
                          todayWorkHours.start_time,
                          todayWorkHours.end_time || "",
                          todayWorkHours.id,
                          todayWorkHours.office_id || "00000000-0000-0000-0000-000000000000"
                        )
                      }
                    >
                      <PencilLine className="w-4 h-4 mr-2" />
                      Editar el horario de trabajo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleWorkHours}>
                      <DialogHeader>
                        <DialogTitle>Editar el horario de trabajo</DialogTitle>
                        <DialogDescription>Cambiar las horas de inicio y fin</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="start-time" className="text-right">
                            Inicio
                          </Label>
                          <Input
                            id="start-time"
                            type="time"
                            value={manualStartTime}
                            onChange={(e) => setManualStartTime(e.target.value)}
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="end-time" className="text-right">
                            Finalización
                          </Label>
                          <Input
                            id="end-time"
                            type="time"
                            value={manualEndTime}
                            onChange={(e) => setManualEndTime(e.target.value)}
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="end-time" className="text-right">
                            Localización
                          </Label>
                          <Select  required value={selectedOfficeId} onValueChange={(value) => setSelectedOfficeId(value)}>
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Localización" />
                            </SelectTrigger>
                            <SelectContent>
                              {offices.map((office) => (
                                <SelectItem key={office.id} value={office.id}>
                                  {office.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Guardar cambios</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {todayWorkHours && (
                <div className="mt-4 text-center text-sm space-y-1">
                  <p className="text-muted-foreground">Horario de trabajo de hoy:</p>
                  <p className="font-medium">
                    {todayWorkHours.start_time} - {todayWorkHours.end_time || "W trakcie"}
                  </p>
                  {!!todayWorkHours.total_hours && (
                    <p className="text-muted-foreground">
                      Total: <span className="font-medium">{todayWorkHours.total_hours}h</span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="md:col-span-8">
            <CardHeader>
              <CardTitle>Estadísticas laborales</CardTitle>
              <CardDescription>Resumen de la jornada laboral</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Esta semana</p>
                  <p className="text-2xl font-bold">{currentWeekHours}h</p>
                  <p className="text-sm text-muted-foreground">de 40 horas</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Este mes</p>
                  <p className="text-2xl font-bold">{statistics.totalHours}h</p>
                  <p className="text-sm text-muted-foreground">Esperado: {statistics.expectedHours}h</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Días laborables</p>
                  <p className="text-2xl font-bold">{statistics.daysWorked}</p>
                  <p className="text-sm text-muted-foreground">Este mes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Hours Chart */}
          <Card className="md:col-span-12 overflow-auto">
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <CardTitle>Horario de trabajo</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="min-w-[120px] text-center font-medium">
                    {format(currentMonth, "LLLL yyyy", { locale: es })}
                  </p>
                  <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-auto">
              <div className="h-[400px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} interval={2} />
                    <YAxis tickFormatter={(value) => `${value}h`} domain={[0, 12]} ticks={[0, 2, 4, 6, 8, 10, 12]} />
                    <Tooltip content={<CustomTooltip onEdit={handleEdit} />} cursor={{ fill: "rgba(0, 0, 0, 0.1)" }} />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-12 overflow-auto">
            <CardHeader>
              <CardTitle>Historial laboral - {format(currentMonth, "LLLL yyyy", { locale: es })}</CardTitle>
              <CardDescription>Lista detallada de horas de trabajo en el mes seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Finalización</TableHead>
                    <TableHead>Horas trabajadas</TableHead>
                    <TableHead>Localización</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData
                    .filter((day) => day.hours > 0)
                    .map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {format(new Date(day.date), "d MMMM (EEEE)", { locale: es })}
                        </TableCell>
                        <TableCell>{day.startTime}</TableCell>
                        <TableCell>{day.endTime || "W trakcie"}</TableCell>
                        <TableCell>{day.hours}h</TableCell>
                        <TableCell>{offices.find((office) => office.id === day.officeId)?.name ?? "null"}</TableCell>
                        <TableCell className="text-right">
                          {isSameMonth(new Date(day.date), new Date()) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(day.date, day.startTime, day.endTime, day.workHourId, day.officeId)}
                            >
                              <PencilLine className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                          )}
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

