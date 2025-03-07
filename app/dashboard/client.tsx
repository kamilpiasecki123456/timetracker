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
import { addMonths, format, startOfMonth, endOfMonth, subMonths, isSameMonth, isWithinInterval, startOfDay, subDays, endOfDay } from "date-fns"
import { es, is } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Clock, LogOut, PencilLine, Trash2, UserCog } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { clockIn, clockOut, deleteWorkHours, setManualWorkHours, updateWorkHours } from "@/lib/actions/work-hours"
import { signOut } from "@/lib/actions/auth"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Combobox } from "@/components/ui/combobox"
import { isRSCRequestCheck } from "next/dist/server/base-server"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

type WorkHour = Database["public"]["Tables"]["work_hours"]["Row"]
type User = Database["public"]["Tables"]["users"]["Row"]
type Office = Database["public"]["Tables"]["offices"]["Row"]

// Dodaj selectedMonth do props interfejsu
interface DashboardClientProps {
  user: User
  offices: Office[]
  workHours: {
    [date: string]: {
      total_hours: number
      sessions: WorkHour[]
    }
  }
  todayWorkHours: {
    sessions: WorkHour[]
    activeSession: WorkHour | null
    totalHours: number
    hasActiveSession: boolean
  }
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
  const [manualStartTime, setManualStartTime] = useState(todayWorkHours?.activeSession?.start_time || "")
  const [manualEndTime, setManualEndTime] = useState(todayWorkHours?.activeSession?.end_time || "")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [editingDate, setEditingDate] = useState("")
  const [editingWorkHourId, setEditingWorkHourId] = useState("")
  const [selectedOffice, setSelectedOffice] = useState<{ value: string, isCustomValue: boolean } | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const handleClockInOut = async () => {
    try {
      setIsLoading(true)
      if (!todayWorkHours.hasActiveSession) {
        const result = await clockIn(user.id, selectedOffice)
        if (result.error) {
          throw new Error(result.error)
        }
        toast({
          title: "Las obras han comenzado",
          description: `Hora de inicio: ${format(new Date(), "HH:mm:ss")}`,
        })
      } else {
        const result = await clockOut(user.id)
        if (result.error) {
          throw new Error(result.error)
        }
        toast({
          title: "Trabajo realizado",
          description: `Tiempo de finalización: ${format(new Date(), "HH:mm:ss")}`,
        })
      }
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (date: string, startTime: string, endTime: string, workHourId: string, officeId: string) => {
    console.log(officeId)
    setEditingDate(date)
    setManualStartTime(startTime)
    setManualEndTime(endTime || "")
    setEditingWorkHourId(workHourId)
    setSelectedOffice({ value: officeId, isCustomValue: false })
    setIsDialogOpen(true)
  }

  const handleWorkHours = async (e: React.FormEvent) => {
    e.preventDefault()

    const startDate = new Date(`1970-01-01T${manualStartTime}`)
    const endDate = new Date(`1970-01-01T${manualEndTime}`)

    if (endDate <= startDate) {
      toast({
        title: "Intervalo de tiempo incorrecto",
        description: "La hora de finalización debe ser posterior a la hora de inicio",
        variant: "destructive",
      })
      return
    }

    try {
      let result
      if (editingWorkHourId) {
        // Update existing work hours
        result = await updateWorkHours(editingWorkHourId, manualStartTime, manualEndTime, selectedOffice)
      } else {
        // Create new work hours
        const date = editingDate || (selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined )|| format(new Date(), "yyyy-MM-dd")
        result = await setManualWorkHours(user.id, date, manualStartTime, manualEndTime, selectedOffice)
      }

      if (result.error) {
        throw new Error(result.error)
      }


      toast({
        title: editingWorkHourId ? "Horario de apertura actualizado" : "Horas de trabajo registradas",
        description: `Horario de ${manualStartTime} A ${manualEndTime}`,
      })
      setIsDialogOpen(false)
      setEditingDate("")
      setEditingWorkHourId("")
      setSelectedOffice(null)
      router.refresh()
    } catch (error) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteSession = async (workHourId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar esta sesión??")) {
      return
    }

    try {
      const result = await deleteWorkHours(workHourId)
      if (result.error) {
        throw new Error(result.error)
      }
      toast({
        title: "Sesión eliminada",
        description: "La sesión se ha eliminado correctamente",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
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
      const dateString = format(day, "yyyy-MM-dd")
      const workEntry = workHours[dateString]

      return {
        date: dateString,
        displayDate: format(day, "d MMM", { locale: es }),
        hours: workEntry ? workEntry.total_hours : 0,
        startTime: workEntry?.sessions[0]?.start_time || null,
        endTime: workEntry?.sessions[workEntry.sessions.length - 1]?.end_time || null,
        workHourId: workEntry?.sessions[0]?.id || null,
        officeId: workEntry?.sessions[0]?.office_id || "00000000-0000-0000-0000-000000000000"
      }
    })
  }

  // Przykład użycia:
  const chartData = generateChartData(currentMonth)

  // Calculate current week's hours
  const currentWeekHours = Object.values(workHours)
    .filter((entry) => {
      const now = new Date()
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      const entryDate = new Date(Object.keys(workHours).find((key) => workHours[key] === entry)!)
      return entryDate >= weekStart
    })
    .reduce((sum, entry) => sum + entry.total_hours, 0)

  // Sprawdzanie aktywnej sesji
  const isClockIn = todayWorkHours.hasActiveSession

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
          <div className="flex md:gap-4 items-center">
            <h1 className="text-xl md:text-2xl ml-2 md:ml-0 font-bold order-2 md:order-1">Panel de empleados</h1>
            <div className="md:hidden order-1 md:order-2">
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
            <CardHeader className="px-4 md:px-6">
              <CardTitle>Registro horario</CardTitle>
              <CardDescription>Gestione su tiempo de trabajo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 md:px-6">
              {!todayWorkHours.hasActiveSession && (
                <>
                  
                  <Dialog open={isSelectPlaceDialogOpen} onOpenChange={setIsSelectPlaceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full"
                        variant={todayWorkHours.hasActiveSession ? "destructive" : "default"}
                        size="lg"
                        disabled={isLoading}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        {isLoading
                          ? "Espere, por favor..."
                          : todayWorkHours.hasActiveSession
                            ? "Fin de la sesión"
                            : "Empezar"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleClockInOut}>
                        <DialogHeader>
                          <DialogTitle>Lugar de trabajo</DialogTitle>
                          <DialogDescription>Elija su lugar de trabajo</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Combobox
                              options={offices.map((office) => ({
                                value: office.id,
                                label: office.name,
                              }))}
                              value={selectedOffice?.value ?? ""}
                              onValueChange={(value, isCustomValue) => setSelectedOffice({ value, isCustomValue })}
                              placeholder="Seleccione o introduzca una ubicación"
                              emptyText="No se encontraron ubicaciones."
                              allowCustomValue={true}
                              className="w-full"
                            />
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
                              Data
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "justify-start text-left font-normal col-span-3",
                                    !selectedDate && "text-muted-foreground",
                                  )}
                                >
                                  {selectedDate ? (
                                    format(selectedDate, "d MMMM yyyy", { locale: es })
                                  ) : (
                                    <span>Wybierz datę</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={setSelectedDate}
                                  disabled={(date) => {
                                    const thirtyDaysAgo = subDays(new Date(), 30)
                                    return date > new Date() || date < thirtyDaysAgo
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
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
                            <div className="col-span-3">
                              <Combobox
                                options={offices.map((office) => ({
                                  value: office.id,
                                  label: office.name,
                                }))}
                                value={selectedOffice?.value ?? ""}
                                onValueChange={(value, isCustomValue) => setSelectedOffice({ value, isCustomValue })}
                                placeholder="Seleccione o introduzca una ubicación"
                                emptyText="No se encontraron ubicaciones."
                                allowCustomValue={true}
                                className="w-full"
                              />
                            </div>
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
                  {isLoading ? "Por favor, espere..." : "Terminar el trabajo"}
                </Button>
              )}


              {todayWorkHours.sessions.length > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center font-medium">
                      <span>Total hoy:</span>
                      <span>{todayWorkHours.totalHours}h</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="md:col-span-8">
            <CardHeader className="px-4 md:px-6">
              <CardTitle>Estadísticas laborales</CardTitle>
              <CardDescription>Resumen de la jornada laboral</CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Esta semana</p>
                  <p className="text-2xl font-bold">{currentWeekHours.toFixed(2)}h</p>
                  <p className="text-sm text-muted-foreground">de 40 horas</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Este mes</p>
                  <p className="text-2xl font-bold">{statistics.totalHours.toFixed(2)}h</p>
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
          <Card className="hidden md:block md:col-span-12 overflow-auto">
            <CardHeader className="px-4 md:px-6">
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
            <CardContent className="overflow-auto px-4 md:px-6">
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
            <CardHeader className="px-4 md:px-6">
              <CardTitle>Historial laboral - {format(currentMonth, "LLLL yyyy", { locale: es })}</CardTitle>
              <CardDescription>Lista detallada de horas de trabajo en el mes seleccionado</CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Fecha</TableHead>
                    <TableHead>Sesiones</TableHead>
                    <TableHead className="text-right w-[150px]">Horas totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(workHours)
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, dayData]) => (
                      <TableRow key={date}>
                        <TableCell className="font-medium align-top">
                          {format(new Date(date), "d MMMM (EEEE)", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {dayData.sessions.map((session, index) => {
                              return (
                                <div
                                  key={session.id}
                                  className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Sesión {index + 1}:</span>
                                    <span className="text-sm">
                                      {session.start_time} - {session.end_time || "w trakcie"}
                                    </span>
                                    <span className="text-sm text-muted-foreground">({session.total_hours}h)</span>
                                    <span className="text-sm">- {session.offices.name ?? "null"}</span>
                                  </div>
                                  {isWithinInterval(new Date(session.date), {
                                    start: startOfDay(subDays(new Date(), 30)),
                                    end: endOfDay(new Date())
                                  }) && (
                                    <div className="flex">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-2"
                                        onClick={() =>
                                          handleEdit(date, session.start_time, session.end_time || "", session.id, session.office_id)
                                        }
                                      >
                                        <PencilLine className="h-4 w-4" />
                                        <span className="sr-only">Editar sesión</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:text-destructive"
                                        onClick={() => handleDeleteSession(session.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Borrar sesión</span>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top font-medium">{dayData.total_hours}h</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <div>
              <div className="md:hidden">
              {Object.entries(workHours)
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, dayData]) => (
                      <div key={date} className="flex flex-col gap-4 py-2">
                        <div className="flex justify-between">
                        <div className="font-medium align-top">
                          {format(new Date(date), "d MMMM (EEEE)", { locale: es })}
                        </div>
                        <div className="text-right align-top font-medium">{dayData.total_hours}h</div>
                        </div>
                        <div>
                          <div className="space-y-2">
                            {dayData.sessions.map((session, index) => {
                              return (
                                <div
                                  key={session.id}
                                  className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                                >
                                  <div className="flex flex-col gap-2">
                                    <div className="text-sm font-medium">Sesión {index + 1}:</div>
                                    <div className="flex items-center">
                                      <span className="text-sm">
                                        {session.start_time} - {session.end_time || "durante"}
                                      </span>
                                      <span className="text-sm text-muted-foreground">({session.total_hours}h)</span>
                                      <span className="text-sm">- {session.offices.name ?? "null"}</span>
                                    </div>
                                  </div>
                                  {isWithinInterval(new Date(session.date), {
                                    start: startOfDay(subDays(new Date(), 30)),
                                    end: endOfDay(new Date())
                                  }) && (
                                    <div className="flex">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-2"
                                        onClick={() =>
                                          handleEdit(date, session.start_time, session.end_time || "", session.id, session.office_id)
                                        }
                                      >
                                        <PencilLine className="h-4 w-4" />
                                        <span className="sr-only">Editar sesión</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:text-destructive"
                                        onClick={() => handleDeleteSession(session.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Borrar sesión</span>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        
                      </div>
                    ))}
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
      <PWAInstallPrompt />
    </div>
  )
}

