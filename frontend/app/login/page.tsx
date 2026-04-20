'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope, UserPlus, LogIn, Loader2 } from 'lucide-react'
import { getToken, setToken } from '@/utils/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [form, setForm] = useState({ name: '', username: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => { if (getToken()) router.replace('/dashboard') }, [router])

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (tab === 'signup' && form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const endpoint = tab === 'login' ? '/login' : '/register'
      const body = tab === 'login'
        ? { username: form.username, password: form.password }
        : { name: form.name, username: form.username, password: form.password }

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Request failed')

      setToken(data.access_token)
      // Store doctor name for display
      if (data.name) localStorage.setItem('doctor_name', data.name)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at top, #1a1f35 0%, #0a0d1a 70%)' }}>
      <div className="w-full max-w-sm rounded-2xl glass-panel p-8 flex flex-col gap-6">

        {/* Logo */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Stethoscope size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">AI Patient Care</h1>
          <p className="text-sm text-gray-400 mt-1">Continuity System</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-black/20 rounded-lg p-1">
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t ? 'bg-primary text-primary-foreground shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === 'signup' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Full Name</label>
              <input
                value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="Dr. Sarah Jones" required
                className="bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Username</label>
            <input
              value={form.username} onChange={e => update('username', e.target.value)}
              placeholder={tab === 'login' ? 'admin' : 'dr_jones'}
              required
              className="bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Password</label>
            <input
              type="password" value={form.password} onChange={e => update('password', e.target.value)}
              required
              className="bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          {tab === 'signup' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Confirm Password</label>
              <input
                type="password" value={form.confirm} onChange={e => update('confirm', e.target.value)}
                required
                className="bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-lg transition shadow-lg shadow-primary/25"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Processing...</>
              : tab === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>

          {tab === 'login' && (
            <p className="text-xs text-center text-gray-500">Default: <span className="text-gray-300">admin / 1234</span></p>
          )}
        </form>
      </div>
    </div>
  )
}
