'use client'

import { useState } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle2, MessageSquare, ChevronRight, Loader2 } from 'lucide-react'
import { getToken } from '@/utils/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AIAnalysis {
  disease: string
  medicines: string[]
  summary: string
  anomalies: string
}

interface Report {
  id: string
  patient_id: string
  ai_summary: string
  anomalies: string
}

export default function ReportsPage() {
  const [patientId, setPatientId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [lastReportId, setLastReportId] = useState('')

  const [question, setQuestion] = useState('')
  const [querying, setQuerying] = useState(false)
  const [answer, setAnswer] = useState('')

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !patientId) return
    setUploading(true)
    setUploadError('')
    setAnalysis(null)
    setAnswer('')

    const formData = new FormData()
    formData.append('patient_id', patientId)
    formData.append('file', file)

    try {
      const token = getToken()
      const res = await fetch(`${BASE_URL}/api/reports/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')

      setAnalysis(data.ai_analysis)
      setLastReportId(data.report?.id || '')
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault()
    if (!question || !lastReportId) return
    setQuerying(true)
    setAnswer('')

    try {
      const token = getToken()
      const res = await fetch(`${BASE_URL}/api/reports/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ report_id: lastReportId, question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Query failed')
      setAnswer(data.answer)
    } catch (err: any) {
      setAnswer(`Error: ${err.message}`)
    } finally {
      setQuerying(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Medical Reports</h1>
        <p className="text-gray-400">Upload a PDF report to get AI-powered analysis and ask questions about it.</p>
      </div>

      {/* Upload Form */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5">
        <h2 className="text-xl font-bold text-white">Upload Report</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Patient ID</label>
            <input
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              placeholder="Paste patient UUID here"
              required
              className="bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div
            className="border border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload size={28} className="text-gray-500 group-hover:text-primary transition-colors" />
            <p className="text-sm text-gray-400">{file ? file.name : 'Click to select a PDF file'}</p>
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}

          <button
            type="submit"
            disabled={uploading || !file || !patientId}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-lg transition"
          >
            {uploading ? <><Loader2 size={20} className="animate-spin" /> Analyzing...</> : 'Upload & Analyze'}
          </button>
        </form>
      </div>

      {/* AI Analysis Result */}
      {analysis && (
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="text-green-400" size={22} /> AI Analysis Results
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Identified Condition</p>
              <p className="text-white font-medium">{analysis.disease}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Medicines Mentioned</p>
              {analysis.medicines?.length > 0
                ? analysis.medicines.map((m, i) => <span key={i} className="inline-block bg-primary/20 text-primary text-xs px-2 py-1 rounded-full mr-1 mb-1">{m}</span>)
                : <p className="text-gray-400 text-sm">None detected</p>
              }
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Summary</p>
            <p className="text-gray-200 text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          {analysis.anomalies && analysis.anomalies !== 'N/A' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Anomalies / Abnormal Values</p>
                <p className="text-gray-200 text-sm">{analysis.anomalies}</p>
              </div>
            </div>
          )}

          {/* Q&A Section */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <MessageSquare size={20} className="text-primary" /> Ask About This Report
            </h3>
            <form onSubmit={handleQuery} className="flex gap-3">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="E.g., What medicines are prescribed? Is blood sugar normal?"
                className="flex-1 bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                disabled={querying || !question}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold px-4 py-3 rounded-lg transition whitespace-nowrap"
              >
                {querying ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                Ask
              </button>
            </form>
            {answer && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Answer</p>
                <p className="text-gray-200 text-sm leading-relaxed">{answer}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
