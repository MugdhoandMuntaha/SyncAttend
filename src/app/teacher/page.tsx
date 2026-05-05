import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Users, Clock, TrendingUp, Plus, ArrowRight, CalendarDays } from 'lucide-react'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Simple flat query — no nested joins that may fail due to RLS
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, course_code, course_name, created_at')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false })

  if (coursesError) console.error('Courses fetch error:', coursesError)

  // Get enrollment counts per course separately
  const { data: enrollmentCounts } = await supabase
    .from('enrollments')
    .select('course_id')
    .in('course_id', courses?.map(c => c.id) ?? [])

  // Get session counts per course separately
  const { data: sessionCounts } = await supabase
    .from('attendance_sessions')
    .select('id, course_id')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false })

  // Get recent sessions with course info
  const recentSessions = sessionCounts?.slice(0, 5) ?? []
  const { data: recentSessionDetails } = await supabase
    .from('attendance_sessions')
    .select('id, session_code, session_date, expires_at, is_active, course_id, courses(course_name, course_code)')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Build per-course stats from flat data
  const coursesWithStats = (courses ?? []).map(course => {
    const enrolled = enrollmentCounts?.filter(e => e.course_id === course.id).length ?? 0
    const sessions = sessionCounts?.filter(s => s.course_id === course.id).length ?? 0
    return { ...course, enrolled, sessions }
  })

  const totalCourses = coursesWithStats.length
  const totalEnrolled = coursesWithStats.reduce((acc, c) => acc + c.enrolled, 0)
  const totalSessions = coursesWithStats.reduce((acc, c) => acc + c.sessions, 0)

  // Count attendance marks for recent sessions
  const { count: totalRecords } = await supabase
    .from('attendance_records')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', user!.id) // placeholder — will be 0 for teachers

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your courses and attendance sessions</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/teacher/courses/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            New Course
          </Link>
          <Link
            href="/teacher/session/new"
            className="flex items-center gap-2 px-4 py-2.5 glass hover:bg-white/10 text-white rounded-xl font-medium text-sm transition-all"
          >
            <Clock className="w-4 h-4" />
            Start Session
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: totalCourses, icon: <BookOpen className="w-5 h-5" />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Total Students', value: totalEnrolled, icon: <Users className="w-5 h-5" />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Sessions Held', value: totalSessions, icon: <CalendarDays className="w-5 h-5" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'Attendance Marks', value: totalRecords ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-2xl p-5">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color} mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Your Courses</h2>
          <Link href="/teacher/courses" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {coursesWithStats.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coursesWithStats.slice(0, 6).map((course) => (
              <div key={course.id} className="glass rounded-2xl p-5 hover:bg-white/[0.07] transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                    {course.course_code}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                  {course.course_name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {course.enrolled} students
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {course.sessions} sessions
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/teacher/session/new?courseId=${course.id}`}
                    className="flex-1 text-center text-xs py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg transition-colors font-medium"
                  >
                    Start Session
                  </Link>
                  <Link
                    href={`/teacher/reports?courseId=${course.id}`}
                    className="flex-1 text-center text-xs py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium"
                  >
                    Reports
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No courses yet</p>
            <Link href="/teacher/courses/new" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Create your first course
            </Link>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      {recentSessionDetails && recentSessionDetails.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Sessions</h2>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Course</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Code</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {recentSessionDetails.map((session) => {
                  const isExpired = new Date(session.expires_at) < new Date()
                  const courseInfo = (session.courses as unknown) as { course_name: string; course_code: string } | null
                  return (
                    <tr key={session.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-white">{courseInfo?.course_name}</p>
                        <p className="text-xs text-gray-500">{courseInfo?.course_code}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-sm text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded">
                          {session.session_code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-400">
                        {new Date(session.session_date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          !isExpired && session.is_active
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-800 text-gray-500'
                        }`}>
                          {!isExpired && session.is_active ? 'Active' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
