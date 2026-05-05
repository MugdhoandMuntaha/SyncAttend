'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateSessionCode, getExpiryTime, getSecondsRemaining, formatTime } from '@/lib/utils'
import { Clock, Zap, Users, Copy, Check, BookOpen, ChevronDown, RefreshCw, Loader2, ShieldCheck } from 'lucide-react'
import { Suspense } from 'react'

type Course = {
  id: string
  course_code: string
  course_name: string
}

type AttendanceRecord = {
  id: string
  marked_at: string
  status: string
  profiles: { full_name: string; roll_number: string | null }
}

function SessionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [topic, setTopic] = useState('')
  const [expiryMinutes, setExpiryMinutes] = useState(15)
  const [allowMobileHotspot, setAllowMobileHotspot] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionCode, setSessionCode] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copied, setCopied] = useState(false)
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([])
  const [phase, setPhase] = useState<'setup' | 'active' | 'expired'>('setup')

  useEffect(() => {
    const fetchCourses = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('courses')
        .select('id, course_code, course_name')
        .eq('teacher_id', user.id)
        .order('course_name')
      setCourses(data ?? [])

      const preselect = searchParams.get('courseId')
      if (preselect) setSelectedCourse(preselect)
    }
    fetchCourses()
  }, [searchParams])

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const s = getSecondsRemaining(expiresAt)
      setSecondsLeft(s)
      if (s <= 0) {
        setPhase('expired')
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  // Real-time attendees
  const fetchAttendees = useCallback(async () => {
    if (!sessionId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('attendance_records')
      .select('id, marked_at, status, profiles(full_name, roll_number)')
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: false })
    setAttendees((data as AttendanceRecord[] | null) ?? [])
  }, [sessionId])

  useEffect(() => {
    if (phase !== 'active' || !sessionId) return
    fetchAttendees()
    const interval = setInterval(fetchAttendees, 5000)
    return () => clearInterval(interval)
  }, [phase, sessionId, fetchAttendees])

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse) return
    setLoading(true)

    const code = generateSessionCode()
    const expiry = getExpiryTime(expiryMinutes)
    const today = new Date().toISOString().split('T')[0]

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Capture teacher's IP for network lock
    let teacherIp = '127.0.0.1'
    try {
      const res = await fetch('/api/ip')
      const ipData = await res.json()
      teacherIp = ipData.ip
    } catch (e) {
      console.warn('Could not fetch IP', e)
    }

    if (allowMobileHotspot) {
      teacherIp = '0.0.0.0' // Bypass network lock
    }

    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({
        course_id: selectedCourse,
        teacher_id: user!.id,
        session_code: code,
        session_date: today,
        topic: topic || null,
        expires_at: expiry,
        is_active: true,
        teacher_ip: teacherIp,
      })
      .select()
      .single()

    if (!error && data) {
      setSessionCode(code)
      setSessionId(data.id)
      setExpiresAt(expiry)
      setSecondsLeft(getSecondsRemaining(expiry))
      setPhase('active')
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNewSession = () => {
    setPhase('setup')
    setSessionCode('')
    setSessionId('')
    setExpiresAt('')
    setAttendees([])
    setTopic('')
  }

  const progressPercent = expiresAt
    ? (getSecondsRemaining(expiresAt) / (expiryMinutes * 60)) * 100
    : 0

  const selectedCourseObj = courses.find(c => c.id === selectedCourse)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          {phase === 'setup' ? 'Start Attendance Session' : phase === 'active' ? 'Session Active' : 'Session Expired'}
        </h1>
        <p className="text-gray-400 mt-1">
          {phase === 'setup' ? 'Generate a time-limited code for your class' : `${selectedCourseObj?.course_name} — Share the code with your students`}
        </p>
      </div>

      {phase === 'setup' && (
        <div className="max-w-xl">
          <div className="glass rounded-2xl p-6">
            <form onSubmit={handleCreateSession} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Course</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                    className="w-full pl-10 pr-8 py-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-white text-sm appearance-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">-- Choose a course --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                {courses.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1.5">No courses found. <a href="/teacher/courses/new" className="underline">Create one first.</a></p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Topic (optional)</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Normalization, ER Diagrams..."
                  className="w-full px-4 py-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Code Expiry: <span className="text-indigo-400">{expiryMinutes} minutes</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={5}
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 min</span><span>15 min</span><span>30 min</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-800/40 border border-gray-700/50 rounded-lg">
                <input
                  type="checkbox"
                  id="hotspot-toggle"
                  checked={allowMobileHotspot}
                  onChange={(e) => setAllowMobileHotspot(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
                />
                <label htmlFor="hotspot-toggle" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                  Allow Mobile Hotspot (Disables Network Lock)
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedCourse}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? 'Generating...' : 'Generate Session Code'}
              </button>
            </form>
          </div>
        </div>
      )}

      {(phase === 'active' || phase === 'expired') && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Code Display */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              {phase === 'active' ? (
                <>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm text-emerald-400 font-medium">Live Session</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-sm text-red-400 font-medium">Expired</span>
                </>
              )}
            </div>

            {/* Session Code */}
            <div className={`session-code text-6xl font-black mb-4 tracking-widest ${
              phase === 'active' ? 'text-white' : 'text-gray-600'
            }`}>
              {sessionCode}
            </div>

            {/* Circular Countdown */}
            {phase === 'active' && (
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="2" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={secondsLeft < 60 ? '#ef4444' : secondsLeft < 180 ? '#f59e0b' : '#6366f1'}
                    strokeWidth="2"
                    strokeDasharray="100"
                    strokeDashoffset={100 - progressPercent}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${secondsLeft < 60 ? 'text-red-400' : 'text-white'}`}>
                    {formatTime(secondsLeft)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={handleCopy}
                disabled={phase === 'expired'}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={handleNewSession}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                New Session
              </button>
            </div>

            {selectedCourseObj && (
              <div className="mt-4 p-3 bg-gray-800/60 rounded-xl">
                <p className="text-xs text-gray-400">Course</p>
                <p className="text-sm font-medium text-white">{selectedCourseObj.course_code} — {selectedCourseObj.course_name}</p>
                {topic && <p className="text-xs text-gray-400 mt-1">Topic: {topic}</p>}
              </div>
            )}
          </div>

          {/* Live Attendees */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">Attendees</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{attendees.length}</span>
                {phase === 'active' && (
                  <button onClick={fetchAttendees} className="p-1 hover:text-indigo-300 text-gray-500 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {attendees.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Waiting for students...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {attendees.map((a, i) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-800/60 rounded-xl hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-indigo-600/30 rounded-full flex items-center justify-center text-xs font-bold text-indigo-300">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{(a.profiles as { full_name: string })?.full_name}</p>
                        {(a.profiles as { roll_number: string | null })?.roll_number && (
                          <p className="text-xs text-gray-500">{(a.profiles as { roll_number: string })?.roll_number}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {a.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(a.marked_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewSessionPage() {
  return (
    <Suspense>
      <SessionForm />
    </Suspense>
  )
}
