"use client"

import React from "react"

import { format, eachDayOfInterval } from "date-fns"
import type { Database } from "@/types/database.types"

type WorkHour = Database["public"]["Tables"]["work_hours"]["Row"]
type Office = Database["public"]["Tables"]["offices"]["Row"]

interface PrintWorkHoursProps {
  employeeName: string
  workHours: WorkHour[]
  offices: Office[]
  dateRange: {
    from: Date
    to: Date
  }
}

export const PrintWorkHours = React.forwardRef<HTMLDivElement, PrintWorkHoursProps>(
  ({ employeeName, workHours, dateRange, offices }, ref) => {
    // Generuj tablicę wszystkich dni w zakresie
    const allDays = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    })

    return (
      <div ref={ref} className="p-4 bg-white">
        <div className="mb-4">
          <div className="flex gap-2 items-center mb-2">
            <h1 className="text-xl font-bold ">Registro de horas de trabajo:</h1>
            <h2 className="text-lg">{employeeName}</h2>
          </div>
          <p className="text-sm text-gray-600">
            Periodo: {format(dateRange.from, "dd.MM.yyyy")} - {format(dateRange.to, "dd.MM.yyyy")}
          </p>
        </div>

        <table className="text-sm w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400   px-2 py-1 text-left">Fecha</th>
              <th className="border border-gray-400   px-2 py-1 text-left">Número de horas</th>
              <th className="border border-gray-400   px-2 py-1 text-left">Inicio de los trabajos</th>
              <th className="border border-gray-400   px-2 py-1 text-left">Fin de los trabajos</th>
              <th className="border border-gray-400   px-2 py-1 text-left">Firma</th>
            </tr>
          </thead>
          <tbody>
            {allDays.map((day) => {
              const workDay = workHours.find((wh) => wh.date === format(day, "yyyy-MM-dd"))

              return (
                <tr key={format(day, "yyyy-MM-dd")}>
                  <td className="border border-gray-400   px-2 py-1">{format(day, "dd.MM.yyyy")}</td>
                  <td className="border border-gray-400   px-2 py-1">{workDay?.total_hours ? `${workDay.total_hours}h` : "-"}</td>
                  <td className="border border-gray-400   px-2 py-1">
                    {workDay?.start_time ? format(new Date(`2000-01-01T${workDay.start_time}`), "HH:mm") : "-"}
                  </td>
                  <td className="border border-gray-400   px-2 py-1">
                    {workDay?.end_time ? format(new Date(`2000-01-01T${workDay.end_time}`), "HH:mm") : "-"}
                  </td>
                  <td className="border border-gray-400   px-2 py-1">
                    
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-200">
              <td className="border border-gray-400   px-2 py-1">Total:</td>
              <td className="border border-gray-400   px-2 py-1">{workHours.reduce((sum, wh) => sum + (wh.total_hours || 0), 0)}h</td>
              <td className="border border-gray-400   px-2 py-1" colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  },
)

PrintWorkHours.displayName = "PrintWorkHours"

