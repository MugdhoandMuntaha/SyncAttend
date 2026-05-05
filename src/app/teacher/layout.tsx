import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TeacherNav from '@/components/teacher/TeacherNav'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') redirect('/student')

  return (
    <div className="min-h-screen bg-gray-950">
      <TeacherNav profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
