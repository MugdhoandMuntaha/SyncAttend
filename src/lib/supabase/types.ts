export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          roll_number: string | null
          role: 'teacher' | 'student'
          email: string
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          roll_number?: string | null
          role: 'teacher' | 'student'
          email: string
          created_at?: string
        }
        Update: {
          full_name?: string
          roll_number?: string | null
          role?: 'teacher' | 'student'
          email?: string
        }
      }
      courses: {
        Row: {
          id: string
          course_code: string
          course_name: string
          teacher_id: string
          created_at: string
        }
        Insert: {
          id?: string
          course_code: string
          course_name: string
          teacher_id: string
          created_at?: string
        }
        Update: {
          course_code?: string
          course_name?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          course_id: string
          enrolled_at: string
        }
        Insert: {
          id?: string
          student_id: string
          course_id: string
          enrolled_at?: string
        }
        Update: Record<string, never>
      }
      attendance_sessions: {
        Row: {
          id: string
          course_id: string
          teacher_id: string
          session_code: string
          session_date: string
          topic: string | null
          created_at: string
          expires_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          course_id: string
          teacher_id: string
          session_code: string
          session_date: string
          topic?: string | null
          created_at?: string
          expires_at: string
          is_active?: boolean
        }
        Update: {
          is_active?: boolean
          topic?: string | null
        }
      }
      attendance_records: {
        Row: {
          id: string
          session_id: string
          student_id: string
          course_id: string
          marked_at: string
          ip_address: string | null
          status: 'present' | 'late'
        }
        Insert: {
          id?: string
          session_id: string
          student_id: string
          course_id: string
          marked_at?: string
          ip_address?: string | null
          status?: 'present' | 'late'
        }
        Update: {
          status?: 'present' | 'late'
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
