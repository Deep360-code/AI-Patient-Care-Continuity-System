import { Users, FileText, Bell, Activity } from "lucide-react"

export default function DashboardPage() {
  const stats = [
    { name: 'Total Patients', value: '142', icon: Users, color: 'text-blue-500' },
    { name: 'Active Alerts', value: '7', icon: Bell, color: 'text-red-500' },
    { name: 'Reports Analyzed', value: '38', icon: FileText, color: 'text-purple-500' },
    { name: 'Reminders Sent', value: '29', icon: Activity, color: 'text-green-500' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome, Doctor</h1>
        <p className="text-gray-400">Here is your daily care continuity overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="glass-panel p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group hover:border-white/20 transition-all duration-300 cursor-default">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium">{stat.name}</span>
                <Icon size={24} className={stat.color} />
              </div>
              <p className="text-4xl font-bold text-white">{stat.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h2 className="text-xl font-bold text-white mb-4">Recent Alerts</h2>
          <div className="flex flex-col gap-4 flex-1">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-2 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-400">Side Effect Reported</span>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <p className="text-gray-300 text-sm">Patient John Doe reported nausea after taking Metformin.</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h2 className="text-xl font-bold text-white mb-4">Automation Logs</h2>
          <div className="flex flex-col gap-4 flex-1">
             {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                <Activity size={20} className="text-green-500 mt-0.5" />
                <div>
                  <p className="text-gray-300 text-sm font-medium">WhatsApp Reminder Sent</p>
                  <p className="text-gray-500 text-xs mt-1">To Jane Smith (No visit in 35 days)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
