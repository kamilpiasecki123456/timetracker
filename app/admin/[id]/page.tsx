import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmployeeDetailsClient } from "./client"
import { startOfMonth, endOfMonth, format } from "date-fns"

export default async function EmployeeDetailsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { from?: string; to?: string }
}) {
  const supabase = createClient()

  // Verify admin access
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: currentUserDetails } = await supabase.from("users").select("role").eq("id", user.id).single()
  const { data: offices } = await supabase.from("offices").select("*").order("name")

  if (currentUserDetails?.role !== "admin") {
    redirect("/dashboard")
  }

  // Get employee details
  const { data: employee } = await supabase.from("users").select("*").eq("id", params.id).single()

  if (!employee) {
    redirect("/admin")
  }

  // Get selected month's work hours
  const fromDate = searchParams.from ? new Date(searchParams.from) : startOfMonth(new Date())
  const toDate = searchParams.to ? new Date(searchParams.to) : endOfMonth(new Date())

  const { data: workHours } = await supabase
    .from("work_hours")
    .select("*")
    .eq("user_id", params.id)
    .gte("date", format(fromDate, "yyyy-MM-dd"))
    .lte("date", format(toDate, "yyyy-MM-dd"))
    .order("date", { ascending: true })

  // Calculate statistics for selected month
  const totalHours = workHours?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0
  const daysWorked = new Set(workHours?.map((entry) => entry.date)).size
  const expectedHours = daysWorked * 8 // Assuming 8-hour workday

  // Get last week's work hours
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weeklyHours = workHours?.filter((entry) => new Date(entry.date) >= weekStart) || []

  return (
    <EmployeeDetailsClient
      employee={employee}
      workHours={workHours || []}
      offices={offices || []}
      weeklyHours={weeklyHours}
      statistics={{
        totalHours,
        daysWorked,
        expectedHours,
        averageHours: daysWorked ? totalHours / daysWorked : 0,
      }}
      dateRange={{
        from: fromDate,
        to: toDate,
      }}
    />
  )
}

