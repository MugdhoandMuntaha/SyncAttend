'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Search, Check, X, Loader2, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Student = {
  id: string
  full_name: string
  email: string
  roll_number: string | null
  enrolled: boolean
}

type Course = {
  id: string
  course_code: string
  course_name: string
}

export default function EnrollStudentsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourses = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('courses')
        .select('id, course_code, course_name')
        .eq('teacher_id', user!.id)
        .order('course_name')
      setCourses(data ?? [])
    }
    fetchCourses()
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    const fetchStudents = async () => {
      setLoading(true)
      const supabase = createClient()

      // All students
      const { data: allStudents } = await supabase
        .from('profiles')
        .select('id, full_name, email, roll_number')
        .eq('role', 'student')

      // Already enrolled
      const { data: enrolled } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', selectedCourse)

      const enrolledIds = new Set(enrolled?.map(e => e.student_id) ?? [])

      setStudents(
        (allStudents ?? []).map(s => ({
          ...s,
          enrolled: enrolledIds.has(s.id),
        }))
      )
      setLoading(false)
    }
    fetchStudents()
  }, [selectedCourse])

  const toggleEnroll = async (studentId: string, currentlyEnrolled: boolean) => {
    setEnrolling(studentId)
    const supabase = createClient()

    if (currentlyEnrolled) {
      await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', studentId)
        .eq('course_id', selectedCourse)
    } else {
      await supabase.from('enrollments').insert({
        student_id: studentId,
        course_id: selectedCourse,
      })
    }

    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, enrolled: !currentlyEnrolled } : s)
    )
    setEnrolling(null)
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const enrolledCount = students.filter(s => s.enrolled).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher/courses" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Enroll Students</h1>
          <p className="text-gray-400 mt-1">Add or remove students from your courses</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Course selector */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Select Course
          </h2>
          <div className="space-y-2">
            {courses.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCourse(c.id)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-colors text-sm ${
                  selectedCourse === c.id
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                    : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300 border border-transparent'
                }`}
              >
                <span className="font-mono font-semibold">{c.course_code}</span>
                <span className="text-gray-400"> — {c.course_name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Students list */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Students
              {selectedCourse && <span className="text-xs text-gray-500 font-normal">({enrolledCount} enrolled)</span>}
            </h2>
          </div>

          {!selectedCourse ? (
            <p className="text-gray-500 text-sm text-center py-8">Select a course first</p>
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:border-indigo-500 transition-colors"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No students found</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filtered.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">{student.full_name}</p>
                        <p className="text-xs text-gray-500">{student.roll_number ?? student.email}</p>
                      </div>
                      <button
                        onClick={() => toggleEnroll(student.id, student.enrolled)}
                        disabled={enrolling === student.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          student.enrolled
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40'
                        }`}
                      >
                        {enrolling === student.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : student.enrolled ? (
                          <><Check className="w-3 h-3" /> Enrolled</>
                        ) : (
                          <><UserPlus className="w-3 h-3" /> Enroll</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
