import { useState, useRef, useEffect } from 'react'
import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { ThemeToggle } from '@/components/ThemeToggle'
import { RefreshButton } from '@/components/RefreshButton'
import EmployerNotificationDropdown from '@/components/employer/EmployerNotificationDropdown'
import EmployeeNotificationDropdown from '@/components/employee/EmployeeNotificationDropdown'
import { useEmployerRealtimeNotifications } from '@/hooks/useEmployerRealtimeNotifications'
import { useEmployeeRealtimeNotifications } from '@/hooks/useEmployeeRealtimeNotifications'

interface EmployerHeaderProps {
  title: string
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function EmployerHeader({ title }: EmployerHeaderProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Stream real-time employer and employee notifications
  useEmployerRealtimeNotifications()
  useEmployeeRealtimeNotifications()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const isEmployer = user?.role === 'employer'
  const isEmployee = user?.role === 'employee'

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-md px-4 sm:px-6 flex-shrink-0 sticky top-0 z-30">
      <h1 className="text-base font-semibold text-foreground tracking-tight">{title}</h1>

      <div className="flex items-center gap-3">
        <RefreshButton />
        <ThemeToggle />
        {isEmployer ? (
          <EmployerNotificationDropdown />
        ) : isEmployee ? (
          <EmployeeNotificationDropdown />
        ) : (
          <button
            type="button"
            className="rounded-full p-2 hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
        )}

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white flex-shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-tight">{user?.name ?? 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize leading-tight">
                {user?.role_label ?? user?.role ?? 'Guest'
              }</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl z-50 py-1.5 backdrop-blur-xs">
              <div className="px-3.5 py-2 border-b border-border/60">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>

              {isEmployee && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate('/my-profile')
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  My Profile
                </button>
              )}

              {!isEmployee && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </button>
              )}

              <div className="border-t border-border/60 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
