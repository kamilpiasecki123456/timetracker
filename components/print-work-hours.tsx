"use client"

import React from "react"

import { format, eachDayOfInterval } from "date-fns"
import type { Database } from "@/types/database.types"

type WorkHour = Database["public"]["Tables"]["work_hours"]["Row"]

interface PrintWorkHoursProps {
  employeeName: string
  workHours: WorkHour[]
  dateRange: {
    from: Date
    to: Date
  }
}

export const PrintWorkHours = React.forwardRef<HTMLDivElement, PrintWorkHoursProps>(
  ({ employeeName, workHours, dateRange }, ref) => {
    // Generuj tablicę wszystkich dni w zakresie
    const allDays = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    })

    // Grupuj godziny pracy po dniach
    const workHoursByDay = workHours.reduce((acc, wh) => {
      if (!acc[wh.date]) {
        acc[wh.date] = {
          sessions: [],
          totalHours: 0,
        }
      }
      acc[wh.date].sessions.push(wh)
      acc[wh.date].totalHours += wh.total_hours || 0
      return acc
    }, {})

    return (
      <div ref={ref} className="p-4 bg-white">
        <div className="mb-4">
          <div className="flex gap-2 items-center mb-2">
            <h1 className="text-xl font-bold">Registro de horas de trabajo:</h1>
            <h2 className="text-lg">{employeeName}</h2>
          </div>
          <p className="text-sm text-gray-600">
            Periodo: {format(dateRange.from, "dd.MM.yyyy")} - {format(dateRange.to, "dd.MM.yyyy")}
          </p>
        </div>

        <table className="text-sm w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 px-2 py-1 text-left">Fecha</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Sesiones</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Total de horas</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Firma</th>
            </tr>
          </thead>
          <tbody>
            {allDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd")
              const dayData = workHoursByDay[dateStr]

              return (
                <tr key={dateStr}>
                  <td className="border border-gray-400 px-2 py-1">{format(day, "dd.MM.yyyy")}</td>
                  <td className="border border-gray-400 px-2 py-1">
                    {dayData ? (
                      <div className="space-y-1">
                        {dayData.sessions.map((session, index) => (
                          <div key={session.id}>
                            Sesión {index + 1}: {format(new Date(`2000-01-01T${session.start_time}`), "HH:mm")} -{" "}
                            {session.end_time ? format(new Date(`2000-01-01T${session.end_time}`), "HH:mm") : "-"}
                            {session.total_hours && ` (${session.total_hours}h)`}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">{dayData ? `${dayData.totalHours}h` : "-"}</td>
                  <td className="border border-gray-400 px-2 py-1"></td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-200">
              <td className="border border-gray-400 px-2 py-1">Total:</td>
              <td className="border border-gray-400 px-2 py-1"></td>
              <td className="border border-gray-400 px-2 py-1">
                {Object.values(workHoursByDay).reduce((sum, day) => sum + day.totalHours, 0).toFixed(2)}h
              </td>
              <td className="border border-gray-400 px-2 py-1"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  },
)

PrintWorkHours.displayName = "PrintWorkHours"

