import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, BookOpen, CheckCircle2, Clock } from 'lucide-react'

export default async function AttendanceHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: records } = await supabase
    .from('attendance_records')
    .select(`
      id,
      marked_at,
      status,
      courses(course_name, course_code),
      attendance_sessions(session_date, topic)
    `)
    .eq('student_id', user!.id)
    .order('marked_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance History</h1>
          <p className="text-gray-400 mt-1">{records?.length ?? 0} total records</p>
        </div>
      </div>

      {records && records.length > 0 ? (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Course</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Topic</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Time</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {records.map((record) => {
                const course = (record.courses as unknown) as { course_name: string; course_code: string } | null
                const session = (record.attendance_sessions as unknown) as { session_date: string; topic: string | null } | null
                return (
                  <tr key={record.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{course?.course_code}</p>
                          <p className="text-xs text-gray-500">{course?.course_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-300">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
                        {session?.session_date
                          ? new Date(session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">
                      {session?.topic ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {new Date(record.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`flex items-center gap-1 w-fit text-xs px-2.5 py-1 rounded-full font-medium ${
                        record.status === 'present'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass rounded-2xl p-16 text-center">
          <CalendarDays className="w-16 h-16 text-gray-800 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400">No attendance records yet</h3>
          <p className="text-gray-600 mt-2 mb-6">Mark your first attendance to see history here</p>
          <Link href="/student/mark" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors text-sm">
            Mark Attendance
          </Link>
        </div>
      )}
    </div>
  )
}
