import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { KeyRound, BookOpen, TrendingUp, AlertTriangle, CalendarDays, ArrowRight } from 'lucide-react'
import { getAttendanceBg, getAttendanceColor } from '@/lib/utils'
import { WebAuthnRegister } from '@/components/student/WebAuthnRegister'

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get enrolled course IDs
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', user!.id)

  if (enrollError) console.error('Enrollments error:', enrollError)

  const courseIds = enrollments?.map(e => e.course_id) ?? []

  // Get course details separately
  const { data: courses } = await supabase
    .from('courses')
    .select('id, course_code, course_name')
    .in('id', courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000'])

  // Get total sessions per course
  const { data: allSessions } = await supabase
    .from('attendance_sessions')
    .select('id, course_id')
    .in('course_id', courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000'])

  // Get this student's attendance records
  const { data: myRecords } = await supabase
    .from('attendance_records')
    .select('course_id, session_id, status, marked_at')
    .eq('student_id', user!.id)

  // Build per-course stats from flat data
  const courseStats = (courses ?? []).map(course => {
    const totalSessions = allSessions?.filter(s => s.course_id === course.id).length ?? 0
    const attended = myRecords?.filter(r => r.course_id === course.id).length ?? 0
    const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0
    return { ...course, totalSessions, attended, percentage }
  })

  const atRiskCount = courseStats.filter(c => c.percentage < 75 && c.totalSessions > 0).length
  const totalPresent = myRecords?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
          <p className="text-gray-400 mt-1">Track your attendance across all courses</p>
        </div>
        <Link
          href="/student/mark"
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-600/30"
        >
          <KeyRound className="w-4 h-4" />
          Mark Attendance
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white">{courseIds.length}</p>
          <p className="text-sm text-gray-400 mt-0.5">Enrolled Courses</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white">{totalPresent}</p>
          <p className="text-sm text-gray-400 mt-0.5">Total Attended</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${atRiskCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className={`text-2xl font-bold ${atRiskCount > 0 ? 'text-red-400' : 'text-white'}`}>{atRiskCount}</p>
          <p className="text-sm text-gray-400 mt-0.5">At Risk Courses</p>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="relative overflow-hidden glass rounded-2xl p-6 border border-indigo-500/20">
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Ready to mark attendance?</h2>
            <p className="text-gray-400 text-sm mt-1">Get the session code from your teacher and mark yourself present</p>
          </div>
          <Link
            href="/student/mark"
            className="shrink-0 flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all"
          >
            <KeyRound className="w-4 h-4" />
            Enter Code
          </Link>
        </div>
      </div>

      {/* Biometric Security Registration */}
      <WebAuthnRegister />

      {/* Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">My Courses</h2>
          <Link href="/student/history" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
            Full History <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {courseStats.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <BookOpen className="w-16 h-16 text-gray-800 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400">Not enrolled in any courses</h3>
            <p className="text-gray-600 mt-2">Ask your teacher to enroll you in a course</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseStats.map((course) => (
              <div key={course.id} className="glass rounded-2xl p-5 hover:bg-white/[0.07] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                    {course.course_code}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1">{course.course_name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {course.attended} / {course.totalSessions} sessions attended
                </div>

                {/* Progress bar */}
                <div className="mb-1">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Attendance</span>
                    <span className={`font-semibold ${getAttendanceColor(course.percentage)}`}>{course.percentage}%</span>
                  </div>
                  <div className="bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getAttendanceBg(course.percentage)}`}
                      style={{ width: `${course.percentage}%` }}
                    />
                  </div>
                </div>

                {course.percentage < 75 && course.totalSessions > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Below 75% threshold — at risk!
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
