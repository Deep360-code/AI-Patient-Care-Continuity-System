'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Activity, Pill, Check, Send, RefreshCw, Loader2 } from 'lucide-react'
import { getAlerts, resolveAlert, sendAlert } from '@/utils/api'

interface Alert {
  id: string
  patient_name?: string
  message: string
  type: string
  resolved: boolean
  time?: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  function loadAlerts() {
    setLoading(true)
    getAlerts()
      .then(data => setAlerts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAlerts() }, [])

  async function handleResolve(id: string) {
    try {
      await resolveAlert(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSendWhatsApp(alert: Alert) {
    if (!alert.patient_name) return
    setSending(alert.id)
    try {
      await sendAlert('+919999999999', alert.patient_name, alert.message)
      alert && setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, resolved: true } : a))
    } catch (err) {
      console.error(err)
    } finally {
      setSending(null)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'inactive': return <Activity className="text-blue-400" size={22} />
      case 'ai_report': case 'anomaly': return <AlertTriangle className="text-yellow-400" size={22} />
      case 'side_effect': return <Pill className="text-red-400" size={22} />
      default: return <AlertTriangle className="text-gray-400" size={22} />
    }
  }

  const getStyle = (type: string) => {
    switch (type) {
      case 'inactive': return 'bg-blue-400/10 border-blue-400/20'
      case 'ai_report': case 'anomaly': return 'bg-yellow-400/10 border-yellow-400/20'
      case 'side_effect': return 'bg-red-400/10 border-red-400/20'
      default: return 'bg-white/5 border-white/10'
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Alerts</h1>
          <p className="text-gray-400">Manage automated notifications, anomalies, and patient reports.</p>
        </div>
        <button
          onClick={loadAlerts}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm transition-colors border border-white/10"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 size={20} className="animate-spin" /> Loading alerts from backend...
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No active alerts. System is healthy!</div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start justify-between p-5 rounded-xl border ${
                alert.resolved ? 'bg-white/5 border-white/5 opacity-50' : getStyle(alert.type)
              } transition-all`}
            >
              <div className="flex gap-4">
                <div className="mt-0.5">{getIcon(alert.type)}</div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${alert.resolved ? 'text-gray-400' : 'text-white'}`}>
                      {alert.patient_name || 'System Alert'}
                    </h3>
                    <span className="text-xs text-gray-500 bg-black/20 px-2 py-0.5 rounded capitalize">{alert.type?.replace('_', ' ')}</span>
                  </div>
                  <p className={`text-sm ${alert.resolved ? 'text-gray-500' : 'text-gray-300'}`}>{alert.message}</p>
                </div>
              </div>

              {!alert.resolved && (
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {alert.patient_name && (
                    <button
                      onClick={() => handleSendWhatsApp(alert)}
                      disabled={sending === alert.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      {sending === alert.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Check size={14} /> Resolve
                  </button>
                </div>
              )}

              {alert.resolved && (
                <div className="flex items-center gap-1.5 text-gray-500 text-xs ml-4 shrink-0">
                  <Check size={14} /> Resolved
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
