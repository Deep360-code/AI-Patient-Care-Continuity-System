'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Users, LayoutDashboard, FileText, LogOut, MessageSquare, Bell } from 'lucide-react'
import { logoutFromBackend } from '@/utils/api'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'AI Assistant', href: '/chat', icon: MessageSquare },
  { name: 'Alerts', href: '/alerts', icon: Bell },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    logoutFromBackend()
  }

  return (
    <div className="w-64 h-screen border-r border-white/10 glass-panel flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          AI Patient Care
        </h1>
        <p className="text-xs text-gray-400 mt-1">Continuity System</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                ? 'bg-primary/20 text-primary font-medium border border-primary/20 ring-1 ring-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-primary' : 'text-gray-400'} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
