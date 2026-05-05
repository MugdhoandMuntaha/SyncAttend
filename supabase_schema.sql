-- ============================================
-- AttendEase - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  roll_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique roll number per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_roll_number 
  ON public.profiles(roll_number) WHERE roll_number IS NOT NULL;

-- 2. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_code, teacher_id)
);

-- 3. ENROLLMENTS TABLE (student ↔ course many-to-many)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- 4. ATTENDANCE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_code TEXT NOT NULL UNIQUE,
  session_date DATE NOT NULL,
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT session_code_length CHECK (char_length(session_code) = 6)
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_sessions_code ON public.attendance_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON public.attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON public.attendance_sessions(teacher_id);

-- 5. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late')),
  UNIQUE(session_id, student_id)  -- ANTI-CHEAT: one record per student per session
);

-- Indexes for reporting
CREATE INDEX IF NOT EXISTS idx_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_course ON public.attendance_records(course_id);
CREATE INDEX IF NOT EXISTS idx_records_session ON public.attendance_records(session_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- NOTE: No recursive policies here!
-- Each user can only read/write their own profile.
-- Cross-profile reads (e.g. teacher viewing students) 
-- are handled via the enrollment/records relationships
-- with SECURITY DEFINER functions below.
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow teachers to view student profiles via a SECURITY DEFINER function
-- (avoids recursive RLS on profiles table)
CREATE OR REPLACE FUNCTION public.get_students_for_teacher(p_course_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  roll_number TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.roll_number
  FROM profiles p
  JOIN enrollments e ON e.student_id = p.id
  WHERE e.course_id = p_course_id;
$$;

-- Allow reading all student profiles (needed for enroll page)
DROP POLICY IF EXISTS "Service role can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- COURSES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Teachers can manage own courses" ON public.courses;
CREATE POLICY "Teachers can manage own courses" ON public.courses
  FOR ALL USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view enrolled courses" ON public.courses;
CREATE POLICY "Students can view enrolled courses" ON public.courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e 
      WHERE e.course_id = id AND e.student_id = auth.uid()
    )
  );

-- ============================================
-- ENROLLMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Teachers can manage enrollments for their courses" ON public.enrollments;
CREATE POLICY "Teachers can manage enrollments for their courses" ON public.enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view own enrollments" ON public.enrollments;
CREATE POLICY "Students can view own enrollments" ON public.enrollments
  FOR SELECT USING (student_id = auth.uid());

-- ============================================
-- ATTENDANCE SESSIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Teachers can manage own sessions" ON public.attendance_sessions;
CREATE POLICY "Teachers can manage own sessions" ON public.attendance_sessions
  FOR ALL USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Students can read any session to validate a code
DROP POLICY IF EXISTS "Students can view sessions" ON public.attendance_sessions;
CREATE POLICY "Students can view sessions" ON public.attendance_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- ATTENDANCE RECORDS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Teachers can view records for their sessions" ON public.attendance_records;
CREATE POLICY "Teachers can view records for their sessions" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.attendance_sessions s 
      WHERE s.id = session_id AND s.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view own records" ON public.attendance_records;
CREATE POLICY "Students can view own records" ON public.attendance_records
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own records" ON public.attendance_records;
CREATE POLICY "Students can insert own records" ON public.attendance_records
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View: attendance percentage per student per course
CREATE OR REPLACE VIEW public.attendance_summary AS
SELECT
  e.student_id,
  e.course_id,
  p.full_name,
  p.roll_number,
  c.course_name,
  c.course_code,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT ar.session_id) AS attended_sessions,
  CASE 
    WHEN COUNT(DISTINCT s.id) = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT ar.session_id)::NUMERIC / COUNT(DISTINCT s.id)) * 100, 1)
  END AS attendance_percentage
FROM public.enrollments e
JOIN public.profiles p ON p.id = e.student_id
JOIN public.courses c ON c.id = e.course_id
LEFT JOIN public.attendance_sessions s ON s.course_id = e.course_id
LEFT JOIN public.attendance_records ar ON ar.session_id = s.id AND ar.student_id = e.student_id
GROUP BY e.student_id, e.course_id, p.full_name, p.roll_number, c.course_name, c.course_code;
