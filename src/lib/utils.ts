import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSessionCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous chars (0,O,1,I)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function getExpiryTime(minutesFromNow = 15): string {
  const expiry = new Date()
  expiry.setMinutes(expiry.getMinutes() + minutesFromNow)
  return expiry.toISOString()
}

export function getSecondsRemaining(expiresAt: string): number {
  const now = new Date().getTime()
  const expiry = new Date(expiresAt).getTime()
  return Math.max(0, Math.floor((expiry - now) / 1000))
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getAttendanceColor(percent: number): string {
  if (percent >= 75) return 'text-emerald-400'
  if (percent >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export function getAttendanceBg(percent: number): string {
  if (percent >= 75) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}
