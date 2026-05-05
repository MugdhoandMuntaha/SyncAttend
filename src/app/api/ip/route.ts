import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const headersList = await headers()
  
  // Get IP from headers (works in Vercel and most proxies)
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  
  // Extract the first IP if multiple are forwarded
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || '127.0.0.1')
  
  return NextResponse.json({ ip })
}
