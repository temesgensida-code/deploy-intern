import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Eye,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  User as UserIcon,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { getStorageUrl } from '@/lib/utils'
import { usePageRefresh } from '@/hooks/usePageRefresh'

interface ApplicantInfo {
  id: number
  name: string
  email: string
  username: string
  cv_path: string | null
  profile_photo_url?: string | null
  profile_photo_path?: string | null
}

interface EmployerInfo {
  id: number
  company_name: string
  logo: string | null
}

interface JobPostInfo {
  id: number
  title: string
  slug: string
  job_type: string
  job_type_label: string
  location: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  employer?: EmployerInfo
}

interface ApplicationItem {
  id: number
  user_id: number
  job_post_id: number
  applicant?: ApplicantInfo
  job_post?: JobPostInfo
  cv_path: string | null
  cover_letter: string | null
  status: string
  status_label: string
  created_at: string
}

interface PaginatedApplicationsResponse {
  data: ApplicationItem[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

const STATUS_TABS = [
  { id: 'all', label: 'All Applications' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'hired', label: 'Hired' },
  { id: 'rejected', label: 'Rejected' },
]

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [lastPage, setLastPage] = useState<number>(1)
  const [totalApplications, setTotalApplications] = useState<number>(0)

  // Modals state
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null)
  const [deletingApp, setDeletingApp] = useState<ApplicationItem | null>(null)
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false)

  const fetchApplications = useCallback(async (page: number, status: string, search: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const params: Record<string, string | number> = { page }
      if (status !== 'all') {
        params.status = status
      }
      if (search.trim()) {
        params.search = search.trim()
      }

      const response = await api.get('/admin/applications', { params })
      const resData = response.data?.data ?? response.data
      const paginated: PaginatedApplicationsResponse = resData.data ? resData : resData

      setApplications(paginated.data || [])
      setCurrentPage(paginated.current_page || 1)
      setLastPage(paginated.last_page || 1)
      setTotalApplications(paginated.total || 0)
    } catch (err: unknown) {
      console.error('Failed to load applications:', err)
      setError('Failed to fetch job applications. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications(currentPage, statusFilter, searchQuery)
  }, [currentPage, statusFilter, searchQuery, fetchApplications])

  // Wire into global refresh button
  usePageRefresh(() => {
    fetchApplications(currentPage, statusFilter, searchQuery)
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput)
  }

  const handleStatusTabChange = (statusId: string) => {
    setStatusFilter(statusId)
    setCurrentPage(1)
  }

  const handleUpdateStatus = async (appId: number, newStatus: string) => {
    try {
      setIsActionLoading(true)
      const response = await api.patch(`/admin/applications/${appId}/status`, {
        status: newStatus,
      })
      const updatedApp: ApplicationItem = response.data?.data ?? response.data

      toast.success(`Application status updated to "${updatedApp.status_label || newStatus}".`)

      if (selectedApp?.id === appId) {
        setSelectedApp(updatedApp)
      }

      fetchApplications(currentPage, statusFilter, searchQuery)
    } catch (err: unknown) {
      console.error('Failed to update application status:', err)
      toast.error('Failed to update application status.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingApp) return
    try {
      setIsActionLoading(true)
      await api.delete(`/admin/applications/${deletingApp.id}`)
      toast.success('Application record deleted successfully.')
      setDeletingApp(null)
      if (selectedApp?.id === deletingApp.id) {
        setSelectedApp(null)
      }
      fetchApplications(currentPage, statusFilter, searchQuery)
    } catch (err: unknown) {
      console.error('Failed to delete application:', err)
      toast.error('Failed to delete application record.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDownloadCv = async (app: ApplicationItem) => {
    try {
      const response = await api.get(`/admin/applications/${app.id}/download-cv`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `cv_${app.applicant?.name || 'applicant'}_${app.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('CV downloaded successfully!')
    } catch (err: unknown) {
      console.error('Failed to download CV:', err)
      toast.error('CV file unavailable for download.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'under_review':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'shortlisted':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'hired':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const formatDate = (dateStr?: string) => {
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
            📄
          </span>
          <span>Job Applications / Platform Submissions</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Job Applications
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track and manage candidate job applications across all platform listings ({totalApplications} total).
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                type="text"
                placeholder="Search applicant, job, company..."
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
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleStatusTabChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-muted text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm font-medium">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-5 py-3">Applicant</th>
                <th className="px-5 py-3">Applied Job</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Applied Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-muted-foreground" size={20} />
                      <p className="text-xs font-medium">Loading applications...</p>
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">No applications found</p>
                    <p className="text-xs mt-1">Try selecting another filter tab or search term.</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {app.applicant?.profile_photo_url ? (
                          <img
                            src={getStorageUrl(app.applicant.profile_photo_url)}
                            alt={app.applicant.name}
                            className="w-8 h-8 rounded-full object-cover border border-border/60 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted text-foreground font-bold text-xs flex items-center justify-center border border-border/60 flex-shrink-0">
                            {app.applicant?.name?.charAt(0).toUpperCase() || "A"}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{app.applicant?.name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">{app.applicant?.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-medium text-foreground">
                      {app.job_post?.title || "Job Listing"}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground">
                      {app.job_post?.employer?.company_name || "N/A"}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        {app.status_label || app.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(app.created_at)}</td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Download CV */}
                        <button
                          onClick={() => handleDownloadCv(app)}
                          title="Download CV"
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Download size={15} />
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedApp(app)}
                          title="View Application Details"
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Delete Application */}
                        <button
                          onClick={() => setDeletingApp(app)}
                          title="Delete Application Record"
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
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

      {/* Application Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-border p-6 space-y-5 text-foreground">
            <div className="flex items-start justify-between border-b border-border/60 pb-4">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${getStatusBadge(selectedApp.status)}`}>
                  {selectedApp.status_label || selectedApp.status}
                </span>
                <h3 className="text-lg font-bold text-foreground">Application Review</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  Applied for <span className="font-semibold text-foreground">{selectedApp.job_post?.title}</span> at{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedApp.job_post?.employer?.company_name || "N/A"}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Applicant Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/40 p-4 rounded-xl text-xs border border-border/60">
              {selectedApp.applicant?.profile_photo_url ? (
                <img
                  src={getStorageUrl(selectedApp.applicant.profile_photo_url)}
                  alt={selectedApp.applicant?.name || 'Applicant'}
                  className="w-12 h-12 rounded-xl object-cover border border-border/60 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-muted text-foreground font-bold text-sm flex items-center justify-center border border-border/60 flex-shrink-0">
                  {selectedApp.applicant?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium block">Applicant Name</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <UserIcon size={13} className="text-blue-600 dark:text-blue-400" />
                  {selectedApp.applicant?.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium block">Email Address</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail size={13} className="text-blue-600 dark:text-blue-400" />
                  {selectedApp.applicant?.email}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium block">Applied Date</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
                  {formatDate(selectedApp.created_at)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium block">Curriculum Vitae</span>
                <button
                  onClick={() => handleDownloadCv(selectedApp)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <Download size={13} /> Download CV Document
                </button>
              </div>
              </div>
            </div>

            {/* Cover Letter */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText size={14} className="text-blue-600 dark:text-blue-400" /> Cover Letter
              </h4>
              <div className="p-3.5 bg-muted/30 rounded-xl border border-border/60 text-xs text-foreground whitespace-pre-line leading-relaxed min-h-[90px]">
                {selectedApp.cover_letter || "No cover letter submitted."}
              </div>
            </div>

            {/* Status Modification Actions */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2.5">Update Application Status</h4>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "submitted", label: "Submitted" },
                  { id: "under_review", label: "Under Review" },
                  { id: "shortlisted", label: "Shortlist Candidate" },
                  { id: "hired", label: "Hire Candidate" },
                  { id: "rejected", label: "Reject Candidate" },
                ].map((st) => {
                  const isCurrent = selectedApp.status === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleUpdateStatus(selectedApp.id, st.id)}
                      disabled={isActionLoading || isCurrent}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                        isCurrent
                          ? "bg-muted text-foreground font-semibold border-border shadow-2xs"
                          : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/70"
                      }`}
                    >
                      {isCurrent && <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />}
                      {st.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <button
                onClick={() => setDeletingApp(selectedApp)}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete Record
              </button>

              <button
                onClick={() => setSelectedApp(null)}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Application Modal */}
      {deletingApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card rounded-xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 text-foreground">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Delete Application</h3>
              <button onClick={() => setDeletingApp(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this application record? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setDeletingApp(null)}
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
