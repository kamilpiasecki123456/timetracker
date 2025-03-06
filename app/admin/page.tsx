import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminDashboardClient } from "./client"

export default async function AdminDashboard() {
  const supabase = createClient()

  // Get current user and verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: currentUserDetails } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (currentUserDetails?.role !== "admin") {
    redirect("/dashboard")
  }

  // Get all employees with their latest work hours
  const { data: employees } = await supabase
    .from("users")
    .select(`
      *,
      work_hours!left (
        date,
        start_time,
        end_time,
        total_hours
      )
    `)
    .order("full_name")

  console.log(employees)

  // Process employees data
  const processedEmployees =
    employees?.map((employee) => {
      const todayHours = employee.work_hours.find((wh) => wh.date === new Date().toISOString().split("T")[0])

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())

      const totalWeekHours = employee.work_hours
        .filter((wh) => new Date(wh.date) >= weekStart)
        .reduce((sum, wh) => sum + (wh.total_hours || 0), 0)

      return {
        id: employee.id,
        name: employee.full_name,
        email: employee.email,
        todayHours: todayHours
          ? {
              start: todayHours.start_time,
              end: todayHours.end_time,
            }
          : null,
        totalWeekHours,
      }
    }) || []

  return <AdminDashboardClient employees={processedEmployees} />
}

