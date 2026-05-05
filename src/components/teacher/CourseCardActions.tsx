'use client'

import { useState } from 'react'
import { MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function CourseCardActions({ courseId }: { courseId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this course? All associated sessions, enrollments, and attendance records will be permanently deleted.')) return

    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('courses').delete().eq('id', courseId)
    
    if (!error) {
      router.refresh()
    } else {
      console.error(error)
      alert('Failed to delete course.')
    }
    setIsDeleting(false)
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-20">
            <Link 
              href={`/teacher/courses/${courseId}/edit`}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Course
            </Link>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Course
            </button>
          </div>
        </>
      )}
    </div>
  )
}
