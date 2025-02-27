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
    .select("*")
    .eq("user_id", user.id)
    .gte("date", format(monthStart, "yyyy-MM-dd"))
    .lte("date", format(monthEnd, "yyyy-MM-dd"))
    .order("date", { ascending: true })

  // Get today's work hours with cache busting
  const headersList = headers()
  const timestamp = headersList.get("x-timestamp") || Date.now()
  const { data: todayWorkHours } = await getTodayWorkHours(user.id)

  // Calculate statistics for the selected month
  const totalHours = workHours?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0
  const daysWorked = new Set(workHours?.map((entry) => entry.date)).size
  const expectedHours = daysWorked * 8 // Zakładając 8-godzinny dzień pracy

  return (
    <DashboardClient
      user={userDetails}
      offices={offices || []}
      workHours={workHours || []}
      todayWorkHours={todayWorkHours}
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

