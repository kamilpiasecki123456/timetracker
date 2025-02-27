"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function signUp(formData: FormData) {
  const supabase = createClient()

  const signUpData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        full_name: formData.get("name") as string,
      },
    },
  }

  const { error: signUpError } = await supabase.auth.signUp(signUpData)

  if (signUpError) {
    return { error: signUpError.message }
  }

  // Create user profile
  const { error: profileError } = await supabase.from("users").insert({
    id: (await supabase.auth.getUser()).data.user?.id,
    email: signUpData.email,
    full_name: signUpData.options.data.full_name,
    role: "employee",
  })

  if (profileError) {
    return { error: profileError.message }
  }

  revalidatePath("/")
  redirect("/login")
}

export async function signIn(formData: FormData) {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  })

  if (error) {
    return { error: error.message }
  }

  // Get user role
  const { data: userData } = await supabase.from("users").select("role").single()

  revalidatePath("/")
  redirect(userData?.role === "admin" ? "/admin" : "/dashboard")
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath("/")
  redirect("/login")
}

