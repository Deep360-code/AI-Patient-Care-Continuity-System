'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Calendar, Phone, X, Send, Loader2, Check } from 'lucide-react'
import { getPatients, addPatient, fetchAPI } from '@/utils/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Patient {
  id: string
  name: string
  age: number
  condition?: string
  phone: string
  last_visit_date?: string
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', age: '', condition: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Summary state per patient
  const [summaryNote, setSummaryNote] = useState('')
  const [summaryPatientId, setSummaryPatientId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sentId, setSentId] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState('')

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleAddPatient(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const newPatient = await addPatient({
        name: form.name, age: Number(form.age),
        condition: form.condition || undefined, phone: form.phone,
      })
      setPatients(prev => [newPatient, ...prev])
      setShowForm(false)
      setForm({ name: '', age: '', condition: '', phone: '' })
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendSummary(patient: Patient) {
    setSendingId(patient.id)
    setSummaryError('')
    setSentId(null)
    try {
      await fetchAPI(`/patients/${patient.id}/send-summary`, {
        method: 'POST',
        body: JSON.stringify({ custom_note: summaryNote }),
      })
      setSentId(patient.id)
      setSummaryPatientId(null)
      setSummaryNote('')
    } catch (err: any) {
      setSummaryError(err.message)
    } finally {
      setSendingId(null)
    }
  }

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.condition || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Patients</h1>
          <p className="text-gray-400">Manage patients and send WhatsApp health summaries.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-primary/25"
        >
          <Plus size={20} /> Add Patient
        </button>
      </div>

      {/* Add Patient Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">New Patient</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <form onSubmit={handleAddPatient} className="flex flex-col gap-3">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                { label: 'Age', key: 'age', type: 'number', placeholder: '45' },
                { label: 'Condition (optional)', key: 'condition', type: 'text', placeholder: 'Type 2 Diabetes' },
                { label: 'Phone (with country code)', key: 'phone', type: 'tel', placeholder: '+911234567890' },
              ].map(f => (
                <div key={f.key} className="flex flex-col gap-1">
                  <label className="text-sm text-gray-400">{f.label}</label>
                  <input
                    type={f.type} placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    required={f.key !== 'condition'}
                    className="bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              ))}
              <button type="submit" disabled={saving}
                className="mt-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-lg transition">
                {saving ? 'Saving...' : 'Save Patient'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
            <Loader2 size={20} className="animate-spin" /> Loading patients...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 text-center py-10">No patients found. Add one above.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(patient => (
              <div key={patient.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3 hover:bg-white/8 transition-colors">
                <div>
                  <h3 className="text-lg font-semibold text-white">{patient.name}</h3>
                  <p className="text-primary/80 text-sm">{patient.condition || 'General Checkup'}</p>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-gray-400">
                  <div className="flex items-center gap-2"><Phone size={14} />{patient.phone}</div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {patient.last_visit_date ? new Date(patient.last_visit_date).toLocaleDateString() : 'No visit recorded'}
                  </div>
                </div>

                {/* Send Summary section */}
                {summaryPatientId === patient.id ? (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <textarea
                      value={summaryNote}
                      onChange={e => setSummaryNote(e.target.value)}
                      placeholder="Optional doctor note to include..."
                      rows={2}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    {summaryError && <p className="text-red-400 text-xs">{summaryError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendSummary(patient)}
                        disabled={sendingId === patient.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                      >
                        {sendingId === patient.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Send via WhatsApp
                      </button>
                      <button onClick={() => { setSummaryPatientId(null); setSummaryNote(''); setSummaryError('') }}
                        className="px-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setSummaryPatientId(patient.id); setSentId(null) }}
                    className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-sm font-medium transition"
                  >
                    {sentId === patient.id
                      ? <><Check size={14} className="text-green-400" /> Summary Sent!</>
                      : <><Send size={14} /> Send Health Summary</>
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
