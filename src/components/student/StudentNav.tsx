'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, LayoutDashboard, KeyRound, History, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface Profile {
  full_name: string
  email: string
  roll_number: string | null
}

const navLinks = [
  { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/mark', label: 'Mark Attendance', icon: KeyRound },
  { href: '/student/history', label: 'My History', icon: History },
]

export default function StudentNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const handleLogout = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.last_sign_in_at) {
      const lastSignIn = new Date(user.last_sign_in_at)
      const today = new Date()
      
      if (lastSignIn.toDateString() === today.toDateString()) {
        setLogoutError('Security Lock: To prevent proxy attendance, you cannot log out on the same day you signed in.')
        setTimeout(() => setLogoutError(''), 5000)
        return
      }
    }

    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/student" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white hidden sm:block">SyncAttend</span>
            <span className="text-xs text-emerald-400 bg-emerald-600/15 px-1.5 py-0.5 rounded ml-0.5 hidden sm:block">Student</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/student' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-indigo-600/20 text-indigo-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-white leading-none">{profile.full_name}</span>
              <span className="text-xs text-gray-500">{profile.roll_number ?? profile.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {logoutError && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-gray-950 border border-red-500/50 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-fade-in-up">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Action Blocked</h3>
              <p className="text-gray-300 text-sm">{logoutError}</p>
            </div>
          </div>
        )}
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/student' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-indigo-600/20 text-indigo-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
