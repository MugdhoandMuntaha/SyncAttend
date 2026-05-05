import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Plus, Users, CalendarDays, ArrowRight, Clock } from 'lucide-react'
import { CourseCardActions } from '@/components/teacher/CourseCardActions'

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Simple flat query — no nested joins
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, course_code, course_name, created_at')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false })

  if (error) console.error('Courses fetch error:', error)

  // Get enrollment counts separately
  const { data: enrollmentCounts } = await supabase
    .from('enrollments')
    .select('course_id')
    .in('course_id', courses?.map(c => c.id) ?? [])

  // Get session counts separately
  const { data: sessionCounts } = await supabase
    .from('attendance_sessions')
    .select('id, course_id')
    .eq('teacher_id', user!.id)

  // Build combined stats
  const coursesWithStats = (courses ?? []).map(course => ({
    ...course,
    enrolled: enrollmentCounts?.filter(e => e.course_id === course.id).length ?? 0,
    sessions: sessionCounts?.filter(s => s.course_id === course.id).length ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Courses</h1>
          <p className="text-gray-400 mt-1">Manage your courses and view attendance</p>
        </div>
        <Link
          href="/teacher/courses/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          New Course
        </Link>
      </div>

      {coursesWithStats.length > 0 ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coursesWithStats.map((course) => (
            <div key={course.id} className="glass rounded-2xl p-5 hover:bg-white/[0.07] transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-gray-800 text-indigo-300 px-2.5 py-1 rounded-lg font-semibold">
                    {course.course_code}
                  </span>
                  <CourseCardActions courseId={course.id} />
                </div>
              </div>
              <h3 className="font-semibold text-white text-lg mb-3">{course.course_name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-400 pb-4 border-b border-gray-800">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {course.enrolled} enrolled
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  {course.sessions} sessions
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <Link
                  href={`/teacher/session/new?courseId=${course.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg transition-colors font-medium"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Start Session
                </Link>
                <Link
                  href={`/teacher/reports?courseId=${course.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Reports
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-16 text-center">
          <BookOpen className="w-16 h-16 text-gray-800 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400">No courses yet</h3>
          <p className="text-gray-600 mt-2 mb-6">Create your first course to start tracking attendance</p>
          <Link href="/teacher/courses/new" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors">
            <Plus className="w-4 h-4" /> Create Course
          </Link>
        </div>
      )}
    </div>
  )
}
