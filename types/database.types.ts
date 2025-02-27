export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: "admin" | "employee"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: "admin" | "employee"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: "admin" | "employee"
          created_at?: string
          updated_at?: string
        }
      }
      work_hours: {
        Row: {
          id: string
          user_id: string
          date: string
          office_id: string | null
          start_time: string
          end_time: string | null
          total_hours: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          office_id: string | null
          start_time: string
          end_time?: string | null
          total_hours?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          office_id: string | null
          start_time?: string
          end_time?: string | null
          total_hours?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      offices: {
        Row: {
          id: string
          name: string
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

