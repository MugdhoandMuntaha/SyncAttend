'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Users, TrendingUp, AlertTriangle, BookOpen, ChevronDown, Loader2 } from 'lucide-react'
import { getAttendanceBg, getAttendanceColor } from '@/lib/utils'

type Course = { id: string; course_code: string; course_name: string }
type StudentStat = {
  student_id: string
  full_name: string
  email: string
  roll_number: string | null
  presentCount: number
  percentage: number
  totalSessions: number
}
type Session = {
  id: string
  session_date: string
  topic: string | null
  session_code: string
  expires_at: string
  marked: number
}

export default function ReportsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState<StudentStat[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [enrolledCount, setEnrolledCount] = useState(0)

  // Load courses
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('courses')
        .select('id, course_code, course_name')
        .eq('teacher_id', user.id)
        .order('course_name')

      setCourses(data ?? [])

      // Check URL for preselected course
      const params = new URLSearchParams(window.location.search)
      const preselect = params.get('courseId')
      if (preselect && data?.some(c => c.id === preselect)) {
        setSelectedCourseId(preselect)
      } else if (data && data.length > 0) {
        setSelectedCourseId(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Load report data when course changes
  const loadReportData = useCallback(async () => {
    if (!selectedCourseId) return
    setLoading(true)
    const supabase = createClient()

    // Sessions for this course
    const { data: sessionsData } = await supabase
      .from('attendance_sessions')
      .select('id, session_date, topic, session_code, expires_at')
      .eq('course_id', selectedCourseId)
      .order('session_date', { ascending: false })

    const total = sessionsData?.length ?? 0
    setTotalSessions(total)

    // Enrollments - fetch student profiles separately
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', selectedCourseId)

    setEnrolledCount(enrollments?.length ?? 0)

    // Fetch student profile data
    const studentIds = enrollments?.map(e => e.student_id) ?? []
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, roll_number')
      .in('id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])

    // All attendance records for this course
    const { data: allRecords } = await supabase
      .from('attendance_records')
      .select('student_id, session_id, status')
      .eq('course_id', selectedCourseId)

    // Build student stats
    const stats: StudentStat[] = (profiles ?? []).map(profile => {
      const records = allRecords?.filter(r => r.student_id === profile.id) ?? []
      const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length
      const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0
      return {
        student_id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        roll_number: profile.roll_number,
        presentCount,
        percentage,
        totalSessions: total,
      }
    }).sort((a, b) => b.percentage - a.percentage)
    setStudentStats(stats)

    // Session list with mark counts
    const sessionList: Session[] = (sessionsData ?? []).map(s => {
      const marked = allRecords?.filter(r => r.session_id === s.id).length ?? 0
      return { ...s, marked }
    })
    setSessions(sessionList)
    setLoading(false)
  }, [selectedCourseId])

  useEffect(() => {
    loadReportData()
  }, [loadReportData])

  const atRisk = studentStats.filter(s => s.percentage < 75).length
  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Reports</h1>
          <p className="text-gray-400 mt-1">View detailed attendance analytics</p>
        </div>
      </div>

      {/* Course Selector */}
      {courses.length > 0 && (
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <div className="relative">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="pl-3 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm appearance-none focus:border-indigo-500 transition-colors"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No courses found. Create a course first.</p>
        </div>
      ) : selectedCourse && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5">
              <p className="text-3xl font-bold text-white">{totalSessions}</p>
              <p className="text-sm text-gray-400 mt-1">Total Sessions</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-3xl font-bold text-white">{enrolledCount}</p>
              <p className="text-sm text-gray-400 mt-1">Enrolled Students</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className={`text-3xl font-bold ${atRisk > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{atRisk}</p>
              <p className="text-sm text-gray-400 mt-1">At Risk (&lt;75%)</p>
            </div>
          </div>

          {/* Student Table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h2 className="font-semibold text-white">Student Attendance</h2>
              </div>
              <span className="text-xs text-gray-500">{studentStats.length} students</span>
            </div>
            {studentStats.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500">No students enrolled yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Student</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Roll No</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Attended</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Percentage</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {studentStats.map((student) => (
                      <tr key={student.student_id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-white">{student.full_name}</p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-400">{student.roll_number ?? '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-300">
                          {student.presentCount} / {student.totalSessions}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-800 rounded-full h-1.5 max-w-24">
                              <div
                                className={`h-1.5 rounded-full ${getAttendanceBg(student.percentage)}`}
                                style={{ width: `${student.percentage}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${getAttendanceColor(student.percentage)}`}>
                              {student.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {student.percentage < 75 ? (
                            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              At Risk
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
                              <TrendingUp className="w-3 h-3" />
                              Good
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sessions List */}
          {sessions.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="font-semibold text-white">All Sessions</h2>
              </div>
              <div className="divide-y divide-gray-800/50">
                {sessions.map((session) => {
                  const isExpired = new Date(session.expires_at) < new Date()
                  return (
                    <div key={session.id} className="px-5 py-3.5 hover:bg-white/[0.03] transition-colors flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded">{session.session_code}</span>
                          <span className="text-sm text-white">
                            {new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {session.topic && <p className="text-xs text-gray-500 mt-0.5">{session.topic}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-300">{session.marked} marked</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isExpired ? 'bg-gray-800 text-gray-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {isExpired ? 'Closed' : 'Active'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
