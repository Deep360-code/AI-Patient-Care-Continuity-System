// Centralized API utility for FastAPI backend communication
// Handles both dev-JWT mode (no Supabase) and real Supabase sessions

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ------------------------------------------------------------------
// Token helpers — localStorage-backed
// ------------------------------------------------------------------
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function setToken(token: string) {
  localStorage.setItem('access_token', token)
}

export function clearToken() {
  localStorage.removeItem('access_token')
}

// ------------------------------------------------------------------
// Core fetch wrapper — auto-attaches Authorization header
// ------------------------------------------------------------------
export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  // Priority: 1) dev-JWT from localStorage, 2) Supabase session, 3) mock fallback
  const storedToken = getToken()

  if (storedToken) {
    headers.set('Authorization', `Bearer ${storedToken}`)
  } else {
    // Try Supabase session (works when Supabase is configured)
    try {
      const { createClient } = await import('./supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`)
      }
    } catch {
      // Supabase not configured — no Supabase token available
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) {
      clearToken() // Token expired — clear it
    }
    throw new Error(data.detail || data.error || `API error ${response.status}`)
  }
  return data
}

// ------------------------------------------------------------------
// Auth helpers
// ------------------------------------------------------------------
export async function loginWithBackend(username: string, password: string) {
  const data = await fetchAPI('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  if (data.access_token) {
    setToken(data.access_token)
  }
  return data
}

export function logoutFromBackend() {
  clearToken()
  window.location.href = '/login'
}

// ------------------------------------------------------------------
// Patient API helpers
// ------------------------------------------------------------------
export async function getPatients() {
  return fetchAPI('/patients/')
}

export async function addPatient(patient: {
  name: string
  age: number
  condition?: string
  phone: string
}) {
  return fetchAPI('/patients/', {
    method: 'POST',
    body: JSON.stringify(patient),
  })
}

// ------------------------------------------------------------------
// AI helpers
// ------------------------------------------------------------------
export async function queryMedicine(medicine_name: string, side_effects?: string) {
  return fetchAPI('/api/ai/medicine-query', {
    method: 'POST',
    body: JSON.stringify({ medicine_name, side_effects }),
  })
}

export async function analyzeReport(report_id: string, extracted_text: string) {
  return fetchAPI('/api/ai/analyze-report', {
    method: 'POST',
    body: JSON.stringify({ report_id, extracted_text }),
  })
}

export async function runAutomation() {
  return fetchAPI('/api/run-automation', { method: 'POST' })
}

// ------------------------------------------------------------------
// Alerts helpers
// ------------------------------------------------------------------
export async function getAlerts() {
  return fetchAPI('/api/alerts/')
}

export async function createAlert(alert: {
  patient_id: string
  patient_name: string
  patient_phone: string
  message: string
  type?: string
}) {
  return fetchAPI('/api/alerts/', { method: 'POST', body: JSON.stringify(alert) })
}

export async function resolveAlert(alert_id: string) {
  return fetchAPI('/api/alerts/resolve', { method: 'POST', body: JSON.stringify({ alert_id }) })
}

export async function sendAlert(patient_phone: string, patient_name: string, message: string) {
  return fetchAPI('/api/alerts/send', {
    method: 'POST',
    body: JSON.stringify({ patient_phone, patient_name, message }),
  })
}

// ------------------------------------------------------------------
// Chat with memory helpers
// ------------------------------------------------------------------
export async function sendChatMessage(patient_id: string, message: string) {
  return fetchAPI('/api/ai/chat', { method: 'POST', body: JSON.stringify({ patient_id, message }) })
}

export async function getChatHistory(patient_id: string) {
  return fetchAPI(`/api/ai/chat/${patient_id}/history`)
}
