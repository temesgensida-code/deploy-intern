import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, ChevronDown, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { RefreshButton } from '@/components/RefreshButton'
import { getStorageUrl } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import AdminNotificationDropdown from '@/components/admin/AdminNotificationDropdown'

function getInitials(name?: string) {
  if (!name) return 'A'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AdminHeader() {
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/70 bg-background/80 backdrop-blur-md px-4 sm:px-6 flex-shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight leading-tight">Admin Console</h1>
          <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">Platform Management & Supervision</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <RefreshButton />
        <ThemeToggle />
        <AdminNotificationDropdown />

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/70 transition-colors"
          >
            {user?.profile_photo_url ? (
              <img
                src={getStorageUrl(user.profile_photo_url)}
                alt={user?.name ?? 'Admin'}
                className="h-8 w-8 rounded-full object-cover border border-border/70 flex-shrink-0 shadow-2xs"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold flex-shrink-0 shadow-2xs">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-foreground leading-tight">{user?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-muted-foreground capitalize leading-tight">
                {user?.role_label ?? user?.role ?? 'Administrator'}
              </p>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl z-50 py-1.5 backdrop-blur-xs animate-in fade-in duration-100">
              <div className="px-3.5 py-2 border-b border-border/60">
                <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>

              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/admin/settings')
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-foreground hover:bg-muted/70 transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                Platform Settings
              </button>

              <div className="border-t border-border/60 my-1" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
