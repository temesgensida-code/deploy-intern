import {
  LayoutDashboard, User, FileText, Search, LogOut,
  ChevronLeft, ChevronRight, Menu, X, FileUp, Settings
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Dashboard',   icon: LayoutDashboard, path: '/dashboard' },
  { label: 'My Profile',  icon: User,            path: '/my-profile' },
  { label: 'Applications',icon: FileText,        path: '/my-applications' },
  { label: 'CV/Resume',   icon: FileUp,          path: '/cv-resume' },
  { label: 'Job Search',  icon: Search,          path: '/job-search' },
  { label: 'Settings',    icon: Settings,        path: '/settings' },
]

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
      setShowConfirm(false)
    }
  }

  function go(path: string) {
    navigate(path)
    onNavigate?.()
  }

  return (
    <>
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        {!collapsed && (
          <div className="px-2.5 pt-2 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground/80 uppercase">
            Workspace
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            location.pathname === item.path ||
            (item.path === '/my-profile' && location.pathname === '/edit-profile') ||
            (item.path === '/job-search' && location.pathname.startsWith('/jobs/'))

          return (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              title={collapsed ? item.label : undefined}
              className={`group w-full flex items-center rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                collapsed ? 'justify-center' : 'gap-2.5'
              } ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <Icon
                className={`h-4 w-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Notion-style subtle footer */}
      <div className="p-2 border-t border-sidebar-border/70">
        <button
          onClick={() => setShowConfirm(true)}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center rounded-lg px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ${
            collapsed ? 'justify-center' : 'gap-2.5'
          }`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl bg-card border border-border p-5 shadow-lg space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex-shrink-0">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h2 className="font-semibold text-foreground text-sm">Sign out of HireStream</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to end your current candidate session?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg h-8 text-xs font-medium"
                onClick={() => setShowConfirm(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-lg h-8 text-xs font-medium"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function EmployeeSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs">
            H
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">HireStream</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col h-full shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border/70 px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs">
                  H
                </div>
                <div>
                  <span className="font-semibold text-sm tracking-tight text-sidebar-foreground leading-none">HireStream</span>
                  <span className="block text-[10px] text-muted-foreground font-normal">Candidate</span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavList onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sticky sidebar - Notion styled */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 border-r border-sidebar-border bg-sidebar-background sticky top-0 h-screen transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Workspace Brand Block */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border/70 px-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs flex-shrink-0 shadow-xs">
              H
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-semibold text-sm tracking-tight text-sidebar-foreground block leading-tight">
                  HireStream
                </span>
                <span className="text-[10px] text-muted-foreground font-normal tracking-wide block">
                  Workspace
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-1 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        <NavList collapsed={collapsed} />
      </aside>
    </>
  )
}
