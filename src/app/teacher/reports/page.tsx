'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Users, TrendingUp, AlertTriangle, BookOpen, ChevronDown, Loader2, Download, Check, X, Clock } from 'lucide-react'
import { getAttendanceBg, getAttendanceColor } from '@/lib/utils'
import * as XLSX from 'xlsx'

type Course = { id: string; course_code: string; course_name: string }
type StudentStat = {
  student_id: string
  full_name: string
  email: string
  roll_number: string | null
  presentCount: number
  percentage: number
  totalSessions: number
  attendanceBySession: Record<string, string>
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

    // Sessions for this course (ascending order for columns)
    const { data: sessionsData } = await supabase
      .from('attendance_sessions')
      .select('id, session_date, topic, session_code, expires_at')
      .eq('course_id', selectedCourseId)
      .order('session_date', { ascending: true })

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
      
      const attendanceBySession: Record<string, string> = {}
      sessionsData?.forEach(session => {
        const record = records.find(r => r.session_id === session.id)
        attendanceBySession[session.id] = record ? record.status : 'absent'
      })

      return {
        student_id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        roll_number: profile.roll_number,
        presentCount,
        percentage,
        totalSessions: total,
        attendanceBySession
      }
    }).sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || '')) // Sort by roll number
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

  const exportToExcel = () => {
    if (!selectedCourse) return;
    
    const data = studentStats.map(student => {
      const row: any = {
        'Student Name': student.full_name,
        'Roll Number': student.roll_number || 'N/A',
        'Email': student.email,
        'Sessions Attended': student.presentCount,
        'Total Sessions': student.totalSessions,
        'Attendance Percentage (%)': student.percentage,
        'Status': student.percentage < 75 ? 'At Risk' : 'Good'
      }

      // Add dynamic date columns
      sessions.forEach((session, index) => {
        const dateStr = new Date(session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const status = student.attendanceBySession[session.id]
        row[`${dateStr} (S${index + 1})`] = status.charAt(0).toUpperCase() + status.slice(1) // Present, Late, Absent
      })

      return row
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    
    XLSX.writeFile(workbook, `${selectedCourse.course_code}_Attendance_Report.xlsx`);
  }

  const renderStatusIcon = (status: string) => {
    if (status === 'present') return <Check className="w-4 h-4 text-emerald-400 mx-auto" />
    if (status === 'late') return <Clock className="w-4 h-4 text-amber-400 mx-auto" />
    return <X className="w-4 h-4 text-red-400 mx-auto opacity-50" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Reports</h1>
          <p className="text-gray-400 mt-1">View detailed date-wise attendance analytics</p>
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
          <div className="glass rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-900/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h2 className="font-semibold text-white">Date-wise Student Attendance</h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">{studentStats.length} students</span>
                {studentStats.length > 0 && (
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Excel
                  </button>
                )}
              </div>
            </div>
            {studentStats.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500">No students enrolled yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="sticky left-0 z-10 bg-[#161b22] px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-800/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Student</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-center border-r border-gray-800/50">Total</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-center border-r border-gray-800/50">Pct</th>
                      {sessions.map((session, index) => (
                        <th key={session.id} className="px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-center min-w-[70px]">
                          <div className="flex flex-col items-center">
                            <span>S{index + 1}</span>
                            <span className="text-[10px] text-gray-500 mt-0.5">{new Date(session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {studentStats.map((student) => (
                      <tr key={student.student_id} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="sticky left-0 z-10 bg-[#161b22] group-hover:bg-[#1c2128] px-5 py-3 border-r border-gray-800/50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                          <p className="text-sm font-medium text-white whitespace-nowrap">{student.full_name}</p>
                          <p className="text-xs text-gray-500">{student.roll_number ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 text-center border-r border-gray-800/50">
                          {student.presentCount}/{student.totalSessions}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-800/50">
                          <span className={`text-sm font-semibold ${getAttendanceColor(student.percentage)}`}>
                            {student.percentage}%
                          </span>
                        </td>
                        {sessions.map(session => (
                          <td key={session.id} className="px-3 py-3 text-center" title={`${student.full_name} - ${new Date(session.session_date).toLocaleDateString()}`}>
                            {renderStatusIcon(student.attendanceBySession[session.id])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 justify-center text-sm glass rounded-xl py-3 mt-4">
            <div className="flex items-center gap-2 text-gray-300">
              <Check className="w-4 h-4 text-emerald-400" /> Present
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 text-amber-400" /> Late
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <X className="w-4 h-4 text-red-400 opacity-50" /> Absent
            </div>
          </div>
        </>
      )}
    </div>
  )
}
