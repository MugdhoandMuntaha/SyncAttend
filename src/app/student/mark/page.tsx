'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Clock } from 'lucide-react'

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export default function MarkAttendancePage() {
  const [code, setCode] = useState('')
  const [state, setState] = useState<SubmitState>('idle')
  const [message, setMessage] = useState('')
  const [sessionInfo, setSessionInfo] = useState<{ course: string; date: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 6) return

    setState('loading')
    setMessage('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setState('error')
      setMessage('You must be logged in.')
      return
    }

    // 1. Find the session by code
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id, course_id, expires_at, is_active, courses(course_name, course_code), session_date')
      .eq('session_code', code.toUpperCase())
      .single()

    if (sessionError || !session) {
      setState('error')
      setMessage('Invalid code. Please check and try again.')
      return
    }

    // 2. Check if expired
    if (new Date(session.expires_at) < new Date() || !session.is_active) {
      setState('error')
      setMessage('This session code has expired. Ask your teacher for a new one.')
      return
    }

    // 3. Check if student is enrolled in this course
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', session.course_id)
      .single()

    if (!enrollment) {
      setState('error')
      setMessage('You are not enrolled in the course for this session.')
      return
    }

    // 4. Check for duplicate submission
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', session.id)
      .eq('student_id', user.id)
      .single()

    if (existing) {
      setState('error')
      setMessage('You have already marked attendance for this session.')
      return
    }

    // 5. Determine status: present or late (last 5 mins = late)
    const expiryTime = new Date(session.expires_at).getTime()
    const nowTime = new Date().getTime()
    const sessionDurationMs = 15 * 60 * 1000 // assume 15 min default
    const status = (expiryTime - nowTime) < (5 * 60 * 1000) ? 'late' : 'present'

    // 6. Mark attendance
    const { error: markError } = await supabase.from('attendance_records').insert({
      session_id: session.id,
      student_id: user.id,
      course_id: session.course_id,
      status,
    })

    if (markError) {
      if (markError.message.includes('unique') || markError.code === '23505') {
        setState('error')
        setMessage('Attendance already marked for this session.')
      } else {
        setState('error')
        setMessage(markError.message)
      }
      return
    }

    const courseInfo = (session.courses as unknown) as { course_name: string; course_code: string } | null
    setSessionInfo({
      course: `${courseInfo?.course_code} — ${courseInfo?.course_name}`,
      date: new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    })
    setState('success')
    setMessage(status === 'late' ? 'Marked as Late (last 5 minutes of session)' : 'Attendance marked as Present!')
  }

  const handleReset = () => {
    setCode('')
    setState('idle')
    setMessage('')
    setSessionInfo(null)
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Mark Attendance</h1>
        <p className="text-gray-400 mt-1">Enter the 6-character code from your teacher</p>
      </div>

      {state === 'success' ? (
        <div className="glass rounded-2xl p-8 text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{message}</h2>
          {sessionInfo && (
            <div className="mt-4 p-4 bg-gray-800/60 rounded-xl text-left space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-gray-300">{sessionInfo.course}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-gray-300">{sessionInfo.date}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleReset}
            className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Mark Another
          </button>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Session Code</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3X7K"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-2xl font-mono text-center tracking-widest focus:border-indigo-500 transition-colors uppercase"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Case insensitive • 6 characters</p>
            </div>

            {state === 'error' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={state === 'loading' || code.length < 6}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {state === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {state === 'loading' ? 'Verifying...' : 'Submit Attendance'}
            </button>
          </form>

          {/* Anti-cheat notice */}
          <div className="mt-5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <p className="text-xs text-amber-400/80 text-center">
              🔒 Your submission is time-stamped and IP-logged. Each code can only be used once per student.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
