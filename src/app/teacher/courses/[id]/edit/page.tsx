'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react'

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const courseId = resolvedParams.id
  
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchCourse = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (data) {
        setCourseCode(data.course_code)
        setCourseName(data.course_name)
      } else {
        setError('Failed to load course details.')
      }
      setLoading(false)
    }
    fetchCourse()
  }, [courseId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        course_code: courseCode.trim().toUpperCase(),
        course_name: courseName.trim(),
      })
      .eq('id', courseId)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('A course with this code already exists.')
      } else {
        setError(updateError.message)
      }
      setSaving(false)
    } else {
      router.push('/teacher/courses')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher/courses" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Edit Course</h1>
          <p className="text-gray-400 mt-1">Update course details</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 md:p-8">
        <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center mb-6">
          <BookOpen className="w-6 h-6 text-indigo-400" />
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="courseCode" className="block text-sm font-medium text-gray-300 mb-1.5">
              Course Code
            </label>
            <input
              id="courseCode"
              type="text"
              required
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              placeholder="e.g. CS101"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="courseName" className="block text-sm font-medium text-gray-300 mb-1.5">
              Course Name
            </label>
            <input
              id="courseName"
              type="text"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Introduction to Computer Science"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving || !courseCode.trim() || !courseName.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
