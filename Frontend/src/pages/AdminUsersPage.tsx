import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Ban,
  CheckCircle,
  MoreVertical,
  Loader2,
  AlertCircle,
  Mail,
  Building2,
  Calendar,
  ShieldCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  UserCheck,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { getStorageUrl } from '@/lib/utils'
import { usePageRefresh } from '@/hooks/usePageRefresh'

interface EmployerInfo {
  id: number
  company_name: string
  logo: string | null
  approval_status: string
}

interface UserItem {
  id: number
  name: string
  email: string
  username: string
  role: string
  role_label?: string
  is_suspended: boolean
  status: string
  email_verified_at: string | null
  profile_photo_url?: string | null
  profile_photo_path?: string | null
  created_at: string
  employer?: EmployerInfo
}

interface PaginatedUsersResponse {
  data: UserItem[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

const FILTERS = [
  { id: 'All', label: 'All Users' },
  { id: 'Job Seekers', label: 'Job Seekers', role: 'employee' },
  { id: 'Employers', label: 'Employers', role: 'employer' },
  { id: 'Admins', label: 'Admins', role: 'admin' },
  { id: 'Suspended', label: 'Suspended', status: 'suspended' },
] as const

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filter & Search state
  const [activeFilter, setActiveFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [lastPage, setLastPage] = useState<number>(1)
  const [totalUsers, setTotalUsers] = useState<number>(0)

  // Modals state
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null)
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false)

  const fetchUsers = useCallback(async (page: number, filterId: string, search: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const params: Record<string, string | number> = { page }
      const filterConfig = FILTERS.find((f) => f.id === filterId)

      if (filterConfig && 'role' in filterConfig && filterConfig.role) {
        params.role = filterConfig.role
      }
      if (filterConfig && 'status' in filterConfig && filterConfig.status) {
        params.status = filterConfig.status
      }
      if (search.trim()) {
        params.search = search.trim()
      }

      const response = await api.get('/admin/users', { params })
      const resData = response.data?.data ?? response.data
      const paginated: PaginatedUsersResponse = resData.data ? resData : resData

      setUsers(paginated.data || [])
      setCurrentPage(paginated.current_page || 1)
      setLastPage(paginated.last_page || 1)
      setTotalUsers(paginated.total || 0)
    } catch (err: unknown) {
      console.error('Failed to load users:', err)
      setError('Failed to fetch platform users. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(currentPage, activeFilter, searchQuery)
  }, [currentPage, activeFilter, searchQuery, fetchUsers])

  // Wire into global refresh button
  usePageRefresh(() => {
    fetchUsers(currentPage, activeFilter, searchQuery)
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput)
  }

  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId)
    setCurrentPage(1)
  }

  const handleToggleSuspend = async (user: UserItem) => {
    try {
      setIsActionLoading(true)
      const response = await api.post(`/admin/users/${user.id}/toggle-suspend`)
      const updatedUser: UserItem = response.data?.data ?? response.data

      const actionText = updatedUser.is_suspended ? 'suspended' : 'reactivated'
      toast.success(`User "${user.name}" has been ${actionText}.`)

      if (selectedUser?.id === user.id) {
        setSelectedUser(updatedUser)
      }

      fetchUsers(currentPage, activeFilter, searchQuery)
    } catch (err: unknown) {
      console.error('Failed to toggle suspension:', err)
      toast.error('Failed to update user suspension status.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return
    try {
      setIsActionLoading(true)
      await api.delete(`/admin/users/${deletingUser.id}`)
      toast.success(`User "${deletingUser.name}" has been permanently deleted.`)
      setDeletingUser(null)
      if (selectedUser?.id === deletingUser.id) {
        setSelectedUser(null)
      }
      fetchUsers(currentPage, activeFilter, searchQuery)
    } catch (err: unknown) {
      console.error('Failed to delete user:', err)
      toast.error('Failed to delete user account.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'employer':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'employee':
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    }
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Notion Document Header */}
      <div className="border-b border-border/60 pb-5 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
            👥
          </span>
          <span>User Management / Directory & Access Control</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage registered accounts, roles, and status suspensions across the platform ({totalUsers} total).
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                type="text"
                placeholder="Search name, email, username..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-card border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.id
          return (
            <button
              key={f.id}
              onClick={() => handleFilterChange(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-muted text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm font-medium">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-muted-foreground" size={20} />
                      <p className="text-xs font-medium">Loading user accounts...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">No users found</p>
                    <p className="text-xs mt-1">Try selecting a different filter tab or search term.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {u.profile_photo_url ? (
                          <img
                            src={getStorageUrl(u.profile_photo_url)}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover border border-border/60 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground border border-border/60 flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground font-medium">{u.email}</td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${getRoleBadge(
                          u.role
                        )}`}
                      >
                        {u.role_label || u.role}
                      </span>
                      {u.employer && (
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Building2 size={11} /> {u.employer.company_name}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                          u.is_suspended
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {u.is_suspended ? "Suspended" : "Active"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(u.created_at)}</td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle Suspension */}
                        {u.is_suspended ? (
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            disabled={isActionLoading}
                            title="Reactivate Account"
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle size={13} /> Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            disabled={isActionLoading}
                            title="Suspend Account"
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1.5"
                          >
                            <Ban size={13} /> Suspend
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedUser(u)}
                          title="View Profile Details"
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {lastPage > 1 && (
          <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
              <span className="font-semibold text-foreground">{lastPage}</span>
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-1.5 border border-border/70 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, lastPage))}
                disabled={currentPage === lastPage || isLoading}
                className="p-1.5 border border-border/70 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card rounded-xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-5 text-foreground">
            <div className="flex items-start justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted text-foreground font-bold text-base flex items-center justify-center border border-border">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedUser.name}</h3>
                  <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
                <Mail className="text-blue-600 dark:text-blue-400" size={16} />
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Email Address</span>
                  <span className="font-semibold text-foreground">{selectedUser.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Role</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getRoleBadge(
                      selectedUser.role
                    )}`}
                  >
                    {selectedUser.role_label || selectedUser.role}
                  </span>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Status</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      selectedUser.is_suspended
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {selectedUser.is_suspended ? "Suspended" : "Active"}
                  </span>
                </div>
              </div>

              {selectedUser.employer && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
                  <Building2 className="text-blue-600 dark:text-blue-400" size={16} />
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">Employer Company</span>
                    <span className="font-semibold text-foreground">
                      {selectedUser.employer.company_name}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Email Verified</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5 mt-1">
                    {selectedUser.email_verified_at ? (
                      <>
                        <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" /> Verified
                      </>
                    ) : (
                      "Unverified"
                    )}
                  </span>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Joined Date</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5 mt-1">
                    <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                    {formatDate(selectedUser.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <button
                onClick={() => setDeletingUser(selectedUser)}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete Account
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSuspend(selectedUser)}
                  disabled={isActionLoading}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    selectedUser.is_suspended
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-rose-600 text-white hover:bg-rose-700"
                  }`}
                >
                  {isActionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : selectedUser.is_suspended ? (
                    <UserCheck size={14} />
                  ) : (
                    <UserX size={14} />
                  )}
                  {selectedUser.is_suspended ? "Reactivate User" : "Suspend User"}
                </button>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card rounded-xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 text-foreground">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Delete User Account</h3>
              <button onClick={() => setDeletingUser(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete user <strong>"{deletingUser.name}"</strong> (
              {deletingUser.email})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isActionLoading}
                className="px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
