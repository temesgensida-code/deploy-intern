import { useEffect, useState, useCallback } from 'react'
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import api from '@/lib/api'
import { getStorageUrl } from '@/lib/utils'
import { usePageRefresh } from '@/hooks/usePageRefresh'

type CompanyUser = {
  id: number
  name: string
  email: string
}

type JobPostItem = {
  id: number
  title: string
  job_type: string
  location: string | null
  status: string
  created_at: string
}

type EmployerCompany = {
  id: number
  company_name: string
  email: string | null
  phone: string | null
  location: string | null
  industry: string | null
  company_size: string | null
  website: string | null
  description: string | null
  logo: string | null
  approval_status: 'approved' | 'pending' | 'rejected'
  job_posts_count?: number
  user?: CompanyUser
  job_posts?: JobPostItem[]
  created_at: string
}

type Stats = {
  total_companies: number
  approved_companies: number
  pending_companies: number
  rejected_companies: number
  total_jobs: number
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<EmployerCompany[]>([])
  const [brokenLogos, setBrokenLogos] = useState<Record<number, boolean>>({})
  const [stats, setStats] = useState<Stats>({
    total_companies: 0,
    approved_companies: 0,
    pending_companies: 0,
    rejected_companies: 0,
    total_jobs: 0,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [totalCompanies, setTotalCompanies] = useState(0)

  const [selectedCompany, setSelectedCompany] = useState<EmployerCompany | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    company_name: '',
    industry: '',
    location: '',
    company_size: '',
    email: '',
    website: '',
    description: '',
    approval_status: 'pending' as 'approved' | 'pending' | 'rejected',
  })

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const fetchCompanies = useCallback(async (searchTerm = search, page = currentPage) => {
    try {
      setIsLoading(true)
      const params: Record<string, string | number> = { page }
      if (searchTerm.trim()) params.search = searchTerm.trim()
      if (statusFilter !== 'all') params.status = statusFilter

      const res = await api.get('/admin/companies', { params })
      if (res.data.success && res.data.data) {
        const rawCompanies = res.data.data.companies
        if (Array.isArray(rawCompanies)) {
          setCompanies(rawCompanies)
          setCurrentPage(1)
          setLastPage(1)
          setTotalCompanies(rawCompanies.length)
        } else if (rawCompanies && Array.isArray(rawCompanies.data)) {
          setCompanies(rawCompanies.data)
          setCurrentPage(rawCompanies.current_page || page)
          setLastPage(rawCompanies.last_page || 1)
          setTotalCompanies(rawCompanies.total ?? rawCompanies.data.length)
        } else {
          setCompanies([])
        }

        if (res.data.data.stats) {
          setStats(res.data.data.stats)
        }
      }
    } catch {
      setErrorMessage('Failed to load companies list.')
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, currentPage])

  useEffect(() => {
    fetchCompanies(search, 1)
  }, [search, statusFilter])

  // Wire into global refresh button
  usePageRefresh(() => {
    fetchCompanies(search, currentPage)
  })

  async function openCompanyDetail(companyId: number) {
    try {
      setActionLoadingId(companyId)
      setIsEditing(false)
      const res = await api.get(`/admin/companies/${companyId}`)
      if (res.data.success && res.data.data) {
        setSelectedCompany(res.data.data)
      }
    } catch {
      setErrorMessage('Failed to load company details.')
    } finally {
      setActionLoadingId(null)
    }
  }

  function startEditing(company: EmployerCompany) {
    setEditForm({
      company_name: company.company_name || '',
      industry: company.industry || '',
      location: company.location || '',
      company_size: company.company_size || '',
      email: company.email || '',
      website: company.website || '',
      description: company.description || '',
      approval_status: company.approval_status || 'pending',
    })
    setIsEditing(true)
  }

  async function handleSaveCompanyEdit() {
    if (!selectedCompany) return
    try {
      setActionLoadingId(selectedCompany.id)
      const res = await api.put(`/admin/companies/${selectedCompany.id}`, editForm)
      if (res.data.success && res.data.data) {
        setMessage('Company profile updated successfully.')
        setSelectedCompany(res.data.data)
        setIsEditing(false)
        await fetchCompanies(search, currentPage)
        window.setTimeout(() => setMessage(''), 3500)
      }
    } catch {
      setErrorMessage('Failed to update company profile.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleStatusUpdate(companyId: number, status: 'approved' | 'rejected') {
    try {
      setActionLoadingId(companyId)
      const actionEndpoint = status === 'approved' ? 'approve' : 'reject'
      const res = await api.post(`/admin/companies/${companyId}/${actionEndpoint}`)
      if (res.data.success) {
        setMessage(`Company ${status} successfully.`)
        await fetchCompanies(search, currentPage)
        if (selectedCompany?.id === companyId && res.data.data) {
          setSelectedCompany(res.data.data)
        }
        window.setTimeout(() => setMessage(''), 3500)
      }
    } catch {
      setErrorMessage(`Failed to update company status to ${status}.`)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDeleteCompany() {
    if (!deleteTargetId) return
    try {
      setActionLoadingId(deleteTargetId)
      const res = await api.delete(`/admin/companies/${deleteTargetId}`)
      if (res.data.success) {
        setMessage('Company removed permanently.')
        setDeleteTargetId(null)
        if (selectedCompany?.id === deleteTargetId) {
          setSelectedCompany(null)
        }
        await fetchCompanies(search, currentPage)
        window.setTimeout(() => setMessage(''), 3500)
      }
    } catch {
      setErrorMessage('Failed to delete company profile.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Notion Document Header */}
      <div className="border-b border-border/60 pb-5 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
            C
          </span>
          <span>Workspace</span>
          <span>/</span>
          <span className="text-foreground">Companies Directory</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Registered Companies
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review company identities, verify business registrations, and manage platform permissions.
            </p>
          </div>
          <button
            onClick={() => fetchCompanies(search, currentPage)}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Total Registered</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-foreground">{stats.total_companies}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Approved / Active</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.approved_companies}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Pending Review</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{stats.pending_companies}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Rejected / Suspended</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{stats.rejected_companies}</p>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-xs underline hover:opacity-80 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Controls / Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company, contact, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Status:</span>
          <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs font-medium w-full sm:w-auto overflow-x-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-md capitalize transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-muted text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Companies Notion Database Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground font-medium">
                <th className="px-4 py-2.5">Organization</th>
                <th className="px-4 py-2.5">Industry & HQ</th>
                <th className="px-4 py-2.5">Contact</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-center">Jobs Posted</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-foreground">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs font-medium">Loading companies registry...</span>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-foreground">No companies found</p>
                    <p className="text-[11px] mt-0.5">Try refining your search terms or filter selection.</p>
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted text-sm font-bold text-foreground">
                          {c.logo && !brokenLogos[c.id] ? (
                            <img
                              src={getStorageUrl(c.logo)}
                              alt={c.company_name}
                              className="h-full w-full object-cover"
                              onError={() => setBrokenLogos((prev) => ({ ...prev, [c.id]: true }))}
                            />
                          ) : (
                            c.company_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground hover:underline cursor-pointer" onClick={() => openCompanyDetail(c.id)}>
                            {c.company_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3" />
                            <span>{c.user ? c.user.name : 'Unknown User'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="font-medium text-foreground">{c.industry || '—'}</div>
                      <div className="text-[11px] flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[140px]">{c.location || 'Remote / Unset'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[160px]">{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${
                          c.approval_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : c.approval_status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {c.approval_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {c.job_posts_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openCompanyDetail(c.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            openCompanyDetail(c.id)
                            startEditing(c)
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Edit Profile"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {c.approval_status !== 'approved' && (
                          <button
                            onClick={() => handleStatusUpdate(c.id, 'approved')}
                            disabled={actionLoadingId === c.id}
                            className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                            title="Approve Company"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {c.approval_status !== 'rejected' && (
                          <button
                            onClick={() => handleStatusUpdate(c.id, 'rejected')}
                            disabled={actionLoadingId === c.id}
                            className="p-1 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                            title="Reject Company"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTargetId(c.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-muted transition-colors cursor-pointer"
                          title="Delete Company"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!isLoading && totalCompanies > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border/60 gap-3 text-xs text-muted-foreground">
            <div>
              Showing {companies.length} of {totalCompanies} organizations
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchCompanies(search, Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 border border-border/70 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-medium text-foreground">
                {currentPage} / {lastPage}
              </span>
              <button
                onClick={() => fetchCompanies(search, Math.min(lastPage, currentPage + 1))}
                disabled={currentPage >= lastPage || isLoading}
                className="p-1.5 border border-border/70 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Edit Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-xl bg-card border border-border p-6 shadow-2xl space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted text-lg font-bold text-foreground">
                  {selectedCompany.logo && !brokenLogos[selectedCompany.id] ? (
                    <img
                      src={getStorageUrl(selectedCompany.logo)}
                      alt={selectedCompany.company_name}
                      className="h-full w-full object-cover"
                      onError={() => setBrokenLogos((prev) => ({ ...prev, [selectedCompany.id]: true }))}
                    />
                  ) : (
                    selectedCompany.company_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedCompany.company_name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedCompany.industry || "Industry not set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={() => startEditing(selectedCompany)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedCompany(null)
                    setIsEditing(false)
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-md cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSaveCompanyEdit()
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-foreground mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.company_name}
                      onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-foreground mb-1">Industry</label>
                    <input
                      type="text"
                      value={editForm.industry}
                      onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      placeholder="e.g. Technology, Finance"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-foreground mb-1">Headquarters / Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      placeholder="e.g. Addis Ababa, Ethiopia"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-foreground mb-1">Company Scale</label>
                    <input
                      type="text"
                      value={editForm.company_size}
                      onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      placeholder="e.g. 51-200 employees"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-foreground mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-foreground mb-1">Website</label>
                    <input
                      type="text"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-foreground mb-1">Approval Status</label>
                    <select
                      value={editForm.approval_status}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          approval_status: e.target.value as 'approved' | 'pending' | 'rejected',
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-foreground mb-1">Company Overview / Description</label>
                    <textarea
                      rows={4}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === selectedCompany.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === selectedCompany.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Headquarters</span>
                    <p className="font-semibold">{selectedCompany.location || 'Not provided'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Company Scale</span>
                    <p className="font-semibold">{selectedCompany.company_size || 'Not provided'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Official Contact</span>
                    <p className="font-semibold">{selectedCompany.email || 'None'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Official Website</span>
                    {selectedCompany.website ? (
                      <a
                        href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        <Globe className="h-3 w-3" />
                        Visit Website
                      </a>
                    ) : (
                      <p className="font-semibold">None</p>
                    )}
                  </div>
                </div>

                {selectedCompany.description && (
                  <div className="space-y-1 text-xs border-t border-border/50 pt-3">
                    <span className="text-muted-foreground font-medium">Company Dossier / Overview</span>
                    <p className="text-foreground/90 whitespace-pre-line leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                      {selectedCompany.description}
                    </p>
                  </div>
                )}

                {selectedCompany.user && (
                  <div className="text-xs border-t border-border/50 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-foreground">Registered User: {selectedCompany.user.name}</span>
                        <span className="text-muted-foreground block text-[11px]">{selectedCompany.user.email}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Joined: {new Date(selectedCompany.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                  {selectedCompany.approval_status !== 'approved' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedCompany.id, 'approved')}
                      disabled={actionLoadingId === selectedCompany.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      Approve Company
                    </button>
                  )}
                  {selectedCompany.approval_status !== 'rejected' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedCompany.id, 'rejected')}
                      disabled={actionLoadingId === selectedCompany.id}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      Reject Company
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl bg-card border border-border p-5 shadow-2xl space-y-4 text-foreground">
            <h3 className="font-bold text-sm">Confirm Entity Deletion</h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this organization record and its associated jobs? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={actionLoadingId === deleteTargetId}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
