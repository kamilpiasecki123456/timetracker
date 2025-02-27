"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function clockIn(userId: string, officeId: string) {
  const supabase = createClient()
  const now = new Date()

  // Sprawdź czy nie ma już aktywnej sesji
  const { data: existingSession } = await supabase
    .from("work_hours")
    .select()
    .eq("user_id", userId)
    .eq("date", now.toISOString().split("T")[0])
    .is("end_time", null)
    .single()

  if (existingSession) {
    return { error: "Masz już aktywną sesję pracy" }
  }

  const { error } = await supabase.from("work_hours").insert({
    user_id: userId,
    date: now.toISOString().split("T")[0],
    start_time: now.toTimeString().split(" ")[0],
    office_id: officeId
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function clockOut(userId: string) {
  const supabase = createClient()
  const now = new Date()

  // Get the latest work hours entry for today
  const { data: latestEntry } = await supabase
    .from("work_hours")
    .select()
    .eq("user_id", userId)
    .eq("date", now.toISOString().split("T")[0])
    .is("end_time", null)
    .single()

  if (!latestEntry) {
    return { error: "Nie znaleziono aktywnej sesji pracy" }
  }

  const startTime = new Date(`${latestEntry.date}T${latestEntry.start_time}`)
  const endTime = now
  const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

  const { error } = await supabase
    .from("work_hours")
    .update({
      end_time: now.toTimeString().split(" ")[0],
      total_hours: Number.parseFloat(totalHours.toFixed(2)),
    })
    .eq("id", latestEntry.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function setManualWorkHours(userId: string, date: string, startTime: string, endTime: string, officeId: string) {
  const supabase = createClient()

  const start = new Date(`${date}T${startTime}`)
  const end = new Date(`${date}T${endTime}`)
  const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  const { error } = await supabase.from("work_hours").insert({
    user_id: userId,
    date: date,
    start_time: startTime,
    end_time: endTime,
    office_id: officeId,
    total_hours: Number.parseFloat(totalHours.toFixed(2)),
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateWorkHours(workHourId: string, startTime: string, endTime: string, officeId: string) {
  const supabase = createClient()

  // Formatujemy czas do formatu HH:mm:ss
  const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime
  const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime

  // Obliczamy całkowity czas pracy używając timestampów
  const start = new Date(`2000-01-01T${formattedStartTime}`)
  const end = new Date(`2000-01-01T${formattedEndTime}`)
  const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  const { error } = await supabase
    .from("work_hours")
    .update({
      start_time: formattedStartTime,
      end_time: formattedEndTime,
      total_hours: Number.parseFloat(totalHours.toFixed(2)),
      office_id: officeId
    })
    .eq("id", workHourId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function getTodayWorkHours(userId: string) {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  // Pobierz najnowszy wpis z dzisiaj
  const { data, error } = await supabase
    .from("work_hours")
    .select()
    .eq("user_id", userId)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    return { error: error.message }
  }

  return { data }
}

