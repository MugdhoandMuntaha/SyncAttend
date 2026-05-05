'use client'

import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Fingerprint, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export function WebAuthnRegister() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleRegister = async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      // 1. Get options from server
      const resp = await fetch('/api/webauthn/register/generate', { method: 'POST' })
      if (!resp.ok) {
        const errData = await resp.json()
        throw new Error(errData.error || 'Failed to generate registration options')
      }
      const options = await resp.json()

      // 2. Pass options to browser to create passkey (prompts fingerprint sensor)
      const attResp = await startRegistration(options)

      // 3. Send response to server for verification
      const verifyResp = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      })

      if (!verifyResp.ok) {
        const errData = await verifyResp.json()
        throw new Error(errData.error || 'Failed to verify registration')
      }

      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Registration was cancelled or denied.')
      } else {
        setErrorMsg(err.message || 'Biometric registration failed. Ensure your device supports Passkeys.')
      }
    }
  }

  return (
    <div className="glass rounded-2xl p-6 border border-indigo-500/10 mt-6 relative overflow-hidden">
      <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
      
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-indigo-400" />
            Biometric Registration
          </h2>
          <p className="text-gray-400 text-sm mt-1 max-w-md">
            Register your physical fingerprint sensor (Touch ID, Android Fingerprint, Windows Hello) to securely mark attendance.
          </p>
        </div>
        
        <div className="shrink-0">
          {status === 'success' ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 px-5 py-2.5 rounded-xl text-sm font-medium border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Device Registered
            </div>
          ) : (
            <button
              onClick={handleRegister}
              disabled={status === 'loading'}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors border border-gray-700"
            >
              {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              {status === 'loading' ? 'Prompting Sensor...' : 'Register Fingerprint'}
            </button>
          )}
        </div>
      </div>

      {status === 'error' && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 relative">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
