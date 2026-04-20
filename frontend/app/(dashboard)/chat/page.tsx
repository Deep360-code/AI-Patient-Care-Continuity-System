'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, AlertTriangle, Loader2 } from 'lucide-react'
import { sendChatMessage, getChatHistory, getPatients } from '@/utils/api'

// Default patient ID for general queries
const GENERAL_ID = 'general'

export default function AssistantPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState(GENERAL_ID)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load patients for selector
  useEffect(() => {
    getPatients().then(setPatients).catch(() => {})
  }, [])

  // Load chat history when patient changes
  useEffect(() => {
    setLoadingHistory(true)
    setMessages([])
    getChatHistory(selectedPatientId)
      .then(data => {
        const history = data.history || []
        if (history.length === 0) {
          setMessages([{ role: 'assistant', content: 'Hello Doctor. How can I assist you today? Ask about medicines, conditions, or report findings.' }])
        } else {
          setMessages(history)
        }
      })
      .catch(() => {
        setMessages([{ role: 'assistant', content: 'Hello Doctor. How can I assist you today?' }])
      })
      .finally(() => setLoadingHistory(false))
  }, [selectedPatientId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)

    try {
      const data = await sendChatMessage(selectedPatientId, userMsg)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || "I couldn't generate a response."
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">AI Assistant</h1>
          <p className="text-gray-400 text-sm">Context-aware chat with persistent memory per patient.</p>
        </div>

        {/* Patient selector */}
        <select
          value={selectedPatientId}
          onChange={e => setSelectedPatientId(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value={GENERAL_ID}>General (No patient)</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden border border-white/10">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full text-gray-400 gap-2">
              <Loader2 size={20} className="animate-spin" /> Loading conversation history...
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'}`}>
                  {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'}`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-4">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot size={18} className="text-primary" />
              </div>
              <div className="p-4 bg-white/5 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span className="text-gray-400 text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about medicines, conditions, lab values..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-4 pr-14 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500">
            <AlertTriangle size={12} className="text-yellow-500" />
            <span>AI cannot replace medical advice. Always verify with clinical judgment.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
