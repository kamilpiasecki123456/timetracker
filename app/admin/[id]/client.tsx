"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import type { Database } from "@/types/database.types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { addMonths, format, startOfMonth, subMonths, endOfMonth } from "date-fns"
import { es, pl } from "date-fns/locale"
import { ArrowLeft, ChevronLeft, ChevronRight, PencilLine } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { updateWorkHours } from "@/lib/actions/work-hours"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  selectedMonth: Date
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

export function EmployeeDetailsClient({ employee, workHours, offices, statistics, selectedMonth }: EmployeeDetailsClientProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedMonth)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDate, setEditingDate] = useState("")
  const [editingWorkHourId, setEditingWorkHourId] = useState("")
  const [manualStartTime, setManualStartTime] = useState("")
  const [manualEndTime, setManualEndTime] = useState("")
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("00000000-0000-0000-0000-000000000000")
  const router = useRouter()
  const { toast } = useToast()

  const handlePreviousMonth = () => {
    const newDate = subMonths(currentMonth, 1)
    setCurrentMonth(newDate)
    router.push(`/admin/${employee.id}?month=${format(newDate, "yyyy-MM-dd")}`)
  }

  const handleNextMonth = () => {
    const newDate = addMonths(currentMonth, 1)
    // Nie pozwól na wybór przyszłego miesiąca
    if (newDate > new Date()) return
    setCurrentMonth(newDate)
    router.push(`/admin/${employee.id}?month=${format(newDate, "yyyy-MM-dd")}`)
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
    const firstDayOfMonth = startOfMonth(currentMonth)
    const lastDayOfMonth = endOfMonth(currentMonth)
    const days = []
    const currentDate = new Date(firstDayOfMonth)

    while (currentDate <= lastDayOfMonth) {
      const workEntry = workHours.find((entry) => entry.date === format(currentDate, "yyyy-MM-dd"))

      days.push({
        date: format(currentDate, "yyyy-MM-dd"),
        displayDate: format(currentDate, "d MMM", { locale: es }),
        hours: workEntry?.total_hours || 0,
        startTime: workEntry?.start_time || null,
        endTime: workEntry?.end_time || null,
        workHourId: workEntry?.id || null,
        officeId: workEntry?.office_id || "00000000-0000-0000-0000-000000000000"
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
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold">{employee.full_name}</h1>
              <p className="text-muted-foreground">{employee.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-[120px] text-center font-medium">
                {format(currentMonth, "LLLL yyyy", { locale: es })}
              </p>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                disabled={addMonths(currentMonth, 1) > new Date()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
                <div className="text-2xl font-bold">{statistics.totalHours}h</div>
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
            <CardHeader>
              <CardTitle>Historial laboral</CardTitle>
              <CardDescription>Lista detallada de horas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(day.date, day.startTime, day.endTime, day.workHourId, day.officeId)}
                          >
                            <PencilLine className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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

