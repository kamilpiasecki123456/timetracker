import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "./client"
import { redirect } from "next/navigation"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { getTodayWorkHours } from "@/lib/actions/work-hours"
import { headers } from "next/headers"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Get user details
  const { data: userDetails } = await supabase.from("users").select("*").eq("id", user.id).single()
  const { data: offices } = await supabase.from("offices").select("*").order("name")

  // Get selected month's work hours
  const selectedDate = searchParams.month ? new Date(searchParams.month) : new Date()
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)

  const { data: workHours } = await supabase
    .from("work_hours")
    .select("*, offices(name)")
    .eq("user_id", user.id)
    .gte("date", format(monthStart, "yyyy-MM-dd"))
    .lte("date", format(monthEnd, "yyyy-MM-dd"))
    .order("date", { ascending: true })

  // Grupuj godziny pracy po dniach i sumuj godziny
  const dailyWorkHours =
  workHours?.reduce((acc, curr) => {
    const date = curr.date
    if (!acc[date]) {
      acc[date] = {
        total_hours: 0,
        sessions: [],
      }
    }
    acc[date].sessions.push(curr)
    if (curr.total_hours) {
      acc[date].total_hours += curr.total_hours
    }
    return acc
  }, {}) || {}

  // Get today's work hours with cache busting
  const headersList = headers()
  const timestamp = headersList.get("x-timestamp") || Date.now()
  const { data: todayWorkHoursData } = await getTodayWorkHours(user.id)

  // Calculate statistics for the selected month
  const totalHours = Object.values(dailyWorkHours).reduce((sum, day: any) => sum + day.total_hours, 0)
  const daysWorked = Object.keys(dailyWorkHours).length
  const expectedHours = daysWorked * 8 // Zakładając 8-godzinny dzień pracy

  return (
    <DashboardClient
      user={userDetails}
      offices={offices || []}
      workHours={dailyWorkHours}
      todayWorkHours={todayWorkHoursData}
      statistics={{
        totalHours,
        daysWorked,
        expectedHours,
      }}
      selectedMonth={selectedDate}
      key={timestamp} // Wymuszenie ponownego renderowania przy zmianie danych
    />
  )
}

