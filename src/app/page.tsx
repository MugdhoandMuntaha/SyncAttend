import Link from 'next/link'
import { GraduationCap, ShieldCheck, Clock, Users, ArrowRight, BookOpen, Zap, Lock } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">SyncAttend</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-20 pb-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-indigo-300 mb-6 animate-fade-in-up">
          <Zap className="w-3 h-3" />
          DBMS-Powered Attendance Management
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 animate-fade-in-up-delay-1">
          Smart Attendance<br />
          <span className="gradient-text">No Cheating. Ever.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fade-in-up-delay-2">
          Teachers generate time-limited session codes. Students self-mark attendance.
          Built-in anti-cheat ensures every mark is legitimate.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-3">
          <Link
            href="/register?role=teacher"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-600/30"
          >
            <BookOpen className="w-4 h-4" />
            I&apos;m a Teacher
          </Link>
          <Link
            href="/register?role=student"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 glass hover:bg-white/10 text-white rounded-xl font-semibold transition-all hover:scale-105"
          >
            <GraduationCap className="w-4 h-4" />
            I&apos;m a Student
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-16 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-4">How It Works</h2>
        <p className="text-center text-gray-400 mb-12">Three simple steps to verified attendance</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Clock className="w-6 h-6 text-indigo-400" />,
              step: '01',
              title: 'Teacher Generates Code',
              desc: 'Start class, generate a unique 6-character code. It expires in 15 minutes — so no sharing after class.',
            },
            {
              icon: <Users className="w-6 h-6 text-violet-400" />,
              step: '02',
              title: 'Students Mark Attendance',
              desc: 'Students enter the code from their dashboard. One submission per student, per session — no duplicates.',
            },
            {
              icon: <ShieldCheck className="w-6 h-6 text-cyan-400" />,
              step: '03',
              title: 'Verified & Stored',
              desc: 'Records are saved to PostgreSQL with timestamps, IP logs, and audit trails. Full DBMS integrity.',
            },
          ].map((item, i) => (
            <div key={i} className="glass rounded-2xl p-6 hover:bg-white/[0.07] transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span className="text-5xl font-black text-gray-800 group-hover:text-gray-700 transition-colors">{item.step}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Anti-cheat features */}
      <section className="relative z-10 px-6 py-16 max-w-7xl mx-auto">
        <div className="glass rounded-3xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white">Anti-Cheat Protection</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Time-Limited Codes', desc: 'Codes expire in 15 minutes' },
              { title: 'One Submission Only', desc: 'DB unique constraint prevents duplicates' },
              { title: 'Email Verification', desc: 'University email required for registration' },
              { title: 'IP Logging', desc: 'Suspicious patterns flagged for review' },
              { title: 'Session Binding', desc: 'Code tied to specific course + date' },
              { title: 'Role-Based Access', desc: 'Teacher/student separation enforced' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
                <div>
                  <p className="font-medium text-white text-sm">{f.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-gray-600 text-sm border-t border-gray-800">
        <p>SyncAttend — Built with Next.js + Supabase | DBMS Project</p>
      </footer>
    </div>
  )
}
