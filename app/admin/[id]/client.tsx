"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import type { Database } from "@/types/database.types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { es, pl } from "date-fns/locale"
import { ArrowLeft, CalendarIcon,  PencilLine, Printer, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { deleteWorkHours, updateWorkHours } from "@/lib/actions/work-hours"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { PrintWorkHours } from "@/components/print-work-hours"
import { useReactToPrint } from "react-to-print"

type WorkHour = Database["public"]["Tables"]["work_hours"]["Row"]
type User = Database["public"]["Tables"]["users"]["Row"]
type Office = Database["public"]["Tables"]["offices"]["Row"]

interface EmployeeDetailsClientProps {
  employee: User
  workHours: WorkHour[]
  offices: Office[]
  weeklyHours: WorkHour[]
  statistics: {
    totalHours: number
    daysWorked: number
    expectedHours: number
    averageHours: number
  }
  dateRange: {
    from: Date
    to: Date
  }
}

const CustomTooltip = ({ active, payload, onEdit }) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border space-y-2">
      <div className="font-medium border-b pb-2">{format(new Date(data.date), "EEEE, d MMMM", { locale: es })}</div>
      <div className="grid grid-cols-[100px_auto] gap-2 text-sm">
        <span className="text-muted-foreground">Inicio:</span>
        <span className="font-medium">{data.startTime}</span>

        <span className="text-muted-foreground">Finalización:</span>
        <span className="font-medium">{data.endTime || "W trakcie"}</span>

        <span className="text-muted-foreground">Tiempo de trabajo:</span>
        <span className="font-medium">{data.hours} horas</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={() => onEdit(data.date, data.startTime, data.endTime, data.workHourId)}
      >
        <PencilLine className="w-4 h-4 mr-2" />
        Editar horas
      </Button>
    </div>
  )
}

type DateRange = { from: Date, to: Date }

export function EmployeeDetailsClient({ employee, workHours, offices, statistics, dateRange }: EmployeeDetailsClientProps) {
  const printComponentRef = useRef<HTMLDivElement>(null)

  const [date, setDate] = useState<DateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDate, setEditingDate] = useState("")
  const [editingWorkHourId, setEditingWorkHourId] = useState("")
  const [manualStartTime, setManualStartTime] = useState("")
  const [manualEndTime, setManualEndTime] = useState("")
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("00000000-0000-0000-0000-000000000000")
  const router = useRouter()
  const { toast } = useToast()

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Registro de horas - ${employee.full_name}`,
  })

  const handleDeleteSession = async (workHourId: string) => {
    if (!confirm("¿Estás seguro de que quieres borrar esta sesión?")) {
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

  const handleEdit = (date: string, startTime: string | null, endTime: string | null, workHourId: string | null, officeId: string) => {
    if (!workHourId || !startTime) return // Zabezpieczenie przed nullami

    // Formatujemy czas do formatu HH:mm
    const formattedStartTime = startTime.substring(0, 5)
    const formattedEndTime = endTime ? endTime.substring(0, 5) : ""

    setEditingDate(date)
    setManualStartTime(formattedStartTime)
    setManualEndTime(formattedEndTime)
    setEditingWorkHourId(workHourId)
    setIsDialogOpen(true)
    setSelectedOfficeId(officeId)
  }

  const handleWorkHours = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Walidacja formatu czasu
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(manualStartTime) || !timeRegex.test(manualEndTime)) {
        throw new Error("Formato de hora incorrecto")
      }

      // Porównanie czasów
      const [startHours, startMinutes] = manualStartTime.split(":").map(Number)
      const [endHours, endMinutes] = manualEndTime.split(":").map(Number)
      const startInMinutes = startHours * 60 + startMinutes
      const endInMinutes = endHours * 60 + endMinutes

      if (endInMinutes <= startInMinutes) {
        toast({
          title: "Intervalo de tiempo incorrecto",
          description: "La hora de finalización debe ser posterior a la hora de inicio",
          variant: "destructive",
        })
        return
      }

      const result = await updateWorkHours(editingWorkHourId, manualStartTime, manualEndTime, selectedOfficeId)

      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: "Horario de apertura actualizado",
        description: `Horario de ${manualStartTime} A ${manualEndTime}`,
      })
      setIsDialogOpen(false)
      setEditingDate("")
      setEditingWorkHourId("")
      setSelectedOfficeId("00000000-0000-0000-0000-000000000000")
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Generowanie danych dla wykresu
  const generateChartData = () => {
    if (!date?.from || !date?.to) return []
    
    const days = []
    const currentDate = new Date(date.from)

    while (currentDate <= date.to) {
      const dayEntries = workHours.filter((entry) => entry.date === format(currentDate, "yyyy-MM-dd"))
      const totalHours = dayEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0)

      days.push({
        date: format(currentDate, "yyyy-MM-dd"),
        displayDate: format(currentDate, "d MMM", { locale: es }),
        hours: totalHours || 0,
        sessions: dayEntries,
        startTime: dayEntries[0]?.start_time || null,
        endTime: dayEntries[dayEntries.length - 1]?.end_time || null,
        workHourId: dayEntries[0]?.id || null,
        officeId: dayEntries[0]?.office_id || "00000000-0000-0000-0000-000000000000"
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  const chartData = generateChartData()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a la lista de empleados
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold">{employee.full_name}</h1>
              <p className="text-muted-foreground">{employee.email}</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                        {format(date.to, "LLL dd, y", { locale: es })}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y", { locale: es })
                    )
                  ) : (
                    <span>Seleccione un intervalo de fechas</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={(newDate) => {
                    // Reset zakresu przy wyborze nowej daty początkowej
                    if (newDate?.from && (!date?.from || newDate.from !== date.from)) {
                      setDate({ from: newDate.from, to: undefined })
                      router.push(`/admin/${employee.id}?from=${format(newDate.from, "yyyy-MM-dd")}`)
                    }
                    // Ustaw datę końcową tylko jeśli jest wybrana data początkowa
                    else if (newDate?.to && date?.from) {
                      setDate({ from: date.from, to: newDate.to })
                      router.push(
                        `/admin/${employee.id}?from=${format(date.from, "yyyy-MM-dd")}&to=${format(newDate.to, "yyyy-MM-dd")}`,
                      )
                    }
                  }}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Statystyki */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Horas trabajadas</CardTitle>
                <CardDescription>este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalHours.toFixed(2)}h</div>
                <p className="text-sm text-muted-foreground">z {statistics.expectedHours}h esperado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Días laborables</CardTitle>
                <CardDescription>este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.daysWorked}</div>
                <p className="text-sm text-muted-foreground">días</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tiempo medio de trabajo</CardTitle>
                <CardDescription>este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.averageHours.toFixed(1)}h</div>
                <p className="text-sm text-muted-foreground">por día</p>
              </CardContent>
            </Card>
          </div>

          {/* Wykres */}
          <Card>
            <CardHeader>
              <CardTitle>Horario de trabajo</CardTitle>
              <CardDescription>Horas trabajadas al mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} interval={2} />
                    <YAxis tickFormatter={(value) => `${value}h`} domain={[0, 12]} ticks={[0, 2, 4, 6, 8, 10, 12]} />
                    <Tooltip content={<CustomTooltip onEdit={handleEdit} />} />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card className="overflow-auto">
            <CardHeader className="flex flex-row justify-between">
              <div>
              <CardTitle>Historial laboral</CardTitle>
              <CardDescription>Lista detallada de horas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sesiones</TableHead>
                    <TableHead className="text-right">Horas trabajadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {Object.entries(
                    workHours.reduce(
                      (acc, workHour) => {
                        const date = workHour.date
                        if (!acc[date]) {
                          acc[date] = {
                            sessions: [],
                            totalHours: 0,
                          }
                        }
                        acc[date].sessions.push(workHour)
                        acc[date].totalHours += workHour.total_hours || 0
                        return acc
                      },
                      {} as { [key: string]: { sessions: typeof workHours; totalHours: number } },
                    ),
                  )
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, dayData]) => (
                      <TableRow key={date}>
                        <TableCell className="font-medium align-top">
                          {format(new Date(date), "d MMMM (EEEE)", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {dayData.sessions.map((session, index) => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Sesja {index + 1}:</span>
                                  <span className="text-sm">
                                    {session.start_time} - {session.end_time || "w trakcie"}
                                  </span>
                                  <span className="text-sm text-muted-foreground">({session.total_hours}h)</span>
                                  <span className="text-sm">- {offices.find((office) => office.id === session.office_id)?.name ?? "null"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
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
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top font-medium">{dayData.totalHours}h</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="hidden">
          <PrintWorkHours
            ref={printComponentRef}
            employeeName={employee.full_name}
            workHours={workHours}
            dateRange={{
              from: date?.from || new Date(),
              to: date?.to || new Date(),
            }}
            offices={offices}
          />
        </div>

        {/* Dialog do edycji godzin */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleWorkHours}>
              <DialogHeader>
                <DialogTitle>Editar el horario de trabajo</DialogTitle>
                <DialogDescription>
                  Editar el horario de trabajo para{" "}
                  {editingDate ? format(new Date(editingDate), "d MMMM yyyy", { locale: es }) : ""}
                </DialogDescription>
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
                    step="60" // Pozwala tylko na pełne minuty
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
                    step="60" // Pozwala tylko na pełne minuty
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
      </div>
    </div>
  )
}

