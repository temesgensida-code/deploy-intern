import { useState, useEffect, useCallback } from 'react'
import {
  Download,
  Search,
  X,
  Loader2,
  Inbox,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { ScheduleInterviewModal } from '@/components/interview/ScheduleInterviewModal'
import { InterviewDetailsModal } from '@/components/interview/InterviewDetailsModal'
import type { InterviewItem } from '@/types'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import EmployerSidebar from '@/components/employer/EmployerSidebar'
import EmployerHeader from '@/components/employer/EmployerHeader'
import { Button } from '@/components/ui/button'
import { getStorageUrl } from '@/lib/utils'
import api from '@/lib/api'
import { usePageRefresh } from '@/hooks/usePageRefresh'

export type ApplicationStatusType =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'rejected'
  | 'hired'

export interface ApplicantUser {
  id: number
  name: string
  email: string
  profile_photo_url?: string | null
  profile_photo_path?: string | null
}

export interface ApplicationItem {
  id: number
  status: ApplicationStatusType
  status_label?: string
  created_at: string
  cover_letter?: string | null
  applicant?: ApplicantUser
  user?: ApplicantUser
  job_post?: {
    id: number
    title: string
  }
  interview?: InterviewItem | null
}

export interface EmployerJob {
  id: number
  title: string
  status: string
  applications_count: number
}

interface StatusCounts {
  submitted?: number
  under_review?: number
  shortlisted?: number
  rejected?: number
  hired?: number
  all?: number
}

const statusConfig: Record<
  ApplicationStatusType,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  submitted: {
    label: 'Submitted',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    icon: Inbox,
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    icon: Clock,
  },
  shortlisted: {
    label: 'Shortlisted',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    icon: Star,
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    icon: XCircle,
  },
  hired: {
    label: 'Hired',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    icon: CheckCircle2,
  },
}

export default function JobApplicantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialJobId = searchParams.get('jobId')

  const [jobs, setJobs] = useState<EmployerJob[]>([])
  const [selectedJobId, setSelectedJobId] = useState<number | null>(
    initialJobId ? Number(initialJobId) : null,
  )

  const [applicants, setApplicants] = useState<ApplicationItem[]>([])
  const [counts, setCounts] = useState<StatusCounts | null>(null)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false)

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalApplicants, setTotalApplicants] = useState(0)

  // Modal for quick status change
  const [updatingApp, setUpdatingApp] = useState<ApplicationItem | null>(null)
  const [schedulingApp, setSchedulingApp] = useState<ApplicationItem | null>(null)
  const [viewingInterviewApp, setViewingInterviewApp] = useState<ApplicationItem | null>(null)
  const [newStatus, setNewStatus] = useState<ApplicationStatusType>('submitted')
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch employer's jobs for the dropdown
  useEffect(() => {
    let mounted = true

    const fetchJobs = async () => {
      try {
        setIsLoadingJobs(true)
        const res = await api.get('/employer/jobs')
        const jobList: EmployerJob[] = res.data?.data?.data || res.data?.data || []
        if (mounted) {
          setJobs(jobList)
          if (jobList.length > 0) {
            const targetId = initialJobId ? Number(initialJobId) : jobList[0].id
            const exists = jobList.some((j) => j.id === targetId)
            setSelectedJobId(exists ? targetId : jobList[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load employer jobs:', err)
        toast.error('Failed to load job listings.')
      } finally {
        if (mounted) setIsLoadingJobs(false)
      }
    }

    fetchJobs()

    return () => {
      mounted = false
    }
  }, [initialJobId])

  // Fetch applicants for the selected job
  const fetchApplicants = useCallback(
    async (jobId: number, page: number, status: string, query: string) => {
      try {
        setIsLoadingApplicants(true)
        const params: Record<string, string | number> = {
          page,
          per_page: 10,
        }
        if (status !== 'all') {
          params.status = status
        }
        if (query.trim()) {
          params.search = query.trim()
        }

        const res = await api.get(`/employer/jobs/${jobId}/applicants`, { params })
        const paginatedData = res.data?.data?.data ?? res.data?.data ?? []
        const meta = res.data?.data?.meta ?? res.data?.data ?? {}
        const serverCounts: StatusCounts | undefined = res.data?.data?.counts

        setApplicants(paginatedData)
        setCurrentPage(meta.current_page || 1)
        setTotalPages(meta.last_page || 1)
        setTotalApplicants(meta.total || paginatedData.length)

        if (serverCounts) {
          setCounts(serverCounts)
        }
      } catch (err) {
        console.error('Failed to load applicants:', err)
        toast.error('Failed to load applicants for this job post.')
        setApplicants([])
      } finally {
        setIsLoadingApplicants(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (selectedJobId) {
      fetchApplicants(selectedJobId, currentPage, statusFilter, search)
    }
  }, [selectedJobId, currentPage, statusFilter, search, fetchApplicants])

  // Wire into global refresh button
  usePageRefresh(() => {
    if (selectedJobId) {
      fetchApplicants(selectedJobId, currentPage, statusFilter, search)
    }
  })

  const handleSelectedJobChange = (jobId: number) => {
    setSelectedJobId(jobId)
    setCurrentPage(1)
    setSearchParams({ jobId: String(jobId) })
  }

  const handleDownloadCV = async (applicant: ApplicationItem) => {
    try {
      toast.info('Downloading applicant CV...')
      const response = await api.get(`/employer/applications/${applicant.id}/cv`, {
        responseType: 'blob',
      })

      const contentType = response.headers['content-type']
      const blob = new Blob([response.data], {
        type: typeof contentType === 'string' ? contentType : 'application/pdf',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV-${applicant.user?.name || applicant.applicant?.name || 'Applicant'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('CV downloaded successfully!')
    } catch {
      toast.error('Applicant has not uploaded a CV document yet.')
    }
  }

  const handleStatusUpdate = async () => {
    if (!updatingApp) return

    try {
      setIsUpdating(true)
      const res = await api.put(`/employer/applications/${updatingApp.id}/status`, {
        status: newStatus,
      })

      const updatedPayload = res.data?.data || res.data
      toast.success(`Application status updated to ${statusConfig[newStatus]?.label || newStatus}!`)

      setApplicants((prev) =>
        prev.map((app) =>
          app.id === updatingApp.id
            ? {
                ...app,
                status: newStatus,
                status_label: statusConfig[newStatus]?.label || newStatus,
                interview: updatedPayload.interview !== undefined ? updatedPayload.interview : app.interview,
              }
            : app,
        ),
      )

      if (selectedJobId) {
        fetchApplicants(selectedJobId, currentPage, statusFilter, search)
      }
      setUpdatingApp(null)
    } catch (err: unknown) {
      console.error('Failed to update status:', err)
      const errorObj = err as {
        response?: {
          data?: {
            message?: string
            error?: string
            errors?: Record<string, string[]>
          }
        }
        message?: string
      }
      const data = errorObj.response?.data
      let message = data?.message || data?.error || errorObj.message
      if (data?.errors) {
        const firstKey = Object.keys(data.errors)[0]
        if (firstKey && data.errors[firstKey]?.[0]) {
          message = data.errors[firstKey][0]
        }
      }
      toast.error(message || 'Failed to update application status. Please check and retry.')
    } finally {
      setIsUpdating(false)
    }
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId)

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <EmployerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title="Job Applicants" />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Notion Document Header */}
          <div className="border-b border-border/60 pb-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
                👥
              </span>
              <span>Hiring Pipeline / Applicant Tracking Directory</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Candidate Applications
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Review applicant profiles, download attached CVs, and advance candidates through hiring stages.
                </p>
              </div>

              {/* Job Selector Dropdown */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filter by Position:</span>
                <select
                  value={selectedJobId || ''}
                  onChange={(e) => handleSelectedJobChange(Number(e.target.value))}
                  disabled={isLoadingJobs || jobs.length === 0}
                  className="rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs text-foreground font-medium outline-none focus:ring-1 focus:ring-ring max-w-xs"
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.applications_count || 0})
                    </option>
                  ))}
                  {jobs.length === 0 && <option>No job posts available</option>}
                </select>
              </div>
            </div>
          </div>

          {/* Metric Status Chips */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ['all', 'Total Applicants', counts?.all ?? totalApplicants, Inbox, 'text-foreground'],
                ['submitted', 'Submitted', counts?.submitted ?? 0, Inbox, 'text-blue-600 dark:text-blue-400'],
                ['under_review', 'Under Review', counts?.under_review ?? 0, Clock, 'text-amber-600 dark:text-amber-400'],
                ['shortlisted', 'Shortlisted', counts?.shortlisted ?? 0, Star, 'text-purple-600 dark:text-purple-400'],
                ['hired', 'Hired', counts?.hired ?? 0, CheckCircle2, 'text-emerald-600 dark:text-emerald-400'],
              ] as const
            ).map(([key, label, count, IconComponent, colorCls]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setStatusFilter(key)
                  setCurrentPage(1)
                }}
                className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-left shadow-2xs ${
                  statusFilter === key
                    ? 'border-foreground/30 bg-muted/40 ring-1 ring-ring/40'
                    : 'border-border/70 bg-card hover:bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs text-muted-foreground font-medium">{label}</span>
                  <IconComponent className={`h-3.5 w-3.5 ${colorCls}`} />
                </div>
                <span className={`text-xl font-bold font-mono ${colorCls}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card shadow-xs">
            <div className="relative flex-1 w-full max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search candidate name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full rounded-lg border border-border/80 bg-muted/30 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Showing applicants for <span className="font-semibold text-foreground">{selectedJob?.title || 'Selected Job'}</span>
            </div>
          </div>

          {/* Applicants Table */}
          <div className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-5 py-3">Applied On</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/50">
                  {isLoadingApplicants ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span>Loading applicant submissions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : applicants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                        <Inbox className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No candidate applications found</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {statusFilter !== 'all'
                            ? `No applicants marked as "${statusFilter}". Try selecting "Total Applicants".`
                            : 'This job posting currently has no applicant submissions.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    applicants.map((app) => {
                      const candidateName = app.user?.name || app.applicant?.name || 'Applicant'
                      const candidateEmail = app.user?.email || app.applicant?.email || 'N/A'
                      const candidatePhoto = app.user?.profile_photo_url || app.applicant?.profile_photo_url
                      const config = statusConfig[app.status] || statusConfig.submitted

                      return (
                        <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {candidatePhoto ? (
                                <img
                                  src={getStorageUrl(candidatePhoto)}
                                  alt={candidateName}
                                  className="h-9 w-9 rounded-full object-cover border border-border/70 flex-shrink-0"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-bold text-xs text-foreground border border-border/70 flex-shrink-0">
                                  {candidateName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate">{candidateName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{candidateEmail}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-muted-foreground">
                            {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'}
                          </td>

                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${config.badgeClass}`}>
                              <config.icon className="h-3 w-3" />
                              {app.status_label || config.label}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadCV(app)}
                                className="h-7 px-2 text-xs"
                                title="Download CV"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                CV
                              </Button>

                              {app.interview ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingInterviewApp(app)}
                                  className="h-7 px-2 text-xs border-border text-foreground hover:bg-muted bg-background shadow-2xs font-medium"
                                  title="View Interview Details"
                                >
                                  <Calendar className="h-3.5 w-3.5 mr-1 text-foreground" />
                                  Interview
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSchedulingApp(app)}
                                  className="h-7 px-2 text-xs border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                                  title="Schedule Candidate Interview"
                                >
                                  <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                  Schedule
                                </Button>
                              )}

                              <Link to={`/applicant-details?id=${app.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  title="View Details"
                                >
                                  Details
                                </Button>
                              </Link>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setUpdatingApp(app)
                                  setNewStatus(app.status)
                                }}
                                className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                title="Update Status"
                              >
                                Stage
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-2 text-xs">
              <p className="text-muted-foreground">
                Showing page <span className="font-semibold text-foreground">{currentPage}</span> of{' '}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </p>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="h-7 px-2 text-xs rounded-lg"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="h-7 px-2 text-xs rounded-lg"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Interview Scheduling Modal */}
      {schedulingApp && (
        <ScheduleInterviewModal
          isOpen={!!schedulingApp}
          onClose={() => setSchedulingApp(null)}
          applicationId={schedulingApp.id}
          candidateName={schedulingApp.user?.name || schedulingApp.applicant?.name}
          jobTitle={schedulingApp.job_post?.title || selectedJob?.title}
          existingInterview={schedulingApp.interview}
          onSuccess={(interview) => {
            setApplicants((prev) =>
              prev.map((item) =>
                item.id === schedulingApp.id
                  ? { ...item, status: 'shortlisted', status_label: 'Shortlisted', interview }
                  : item
              )
            )
            toast.success('Interview scheduled successfully! Candidate notified.')
          }}
        />
      )}

      {/* Interview Details Modal */}
      {viewingInterviewApp?.interview && (
        <InterviewDetailsModal
          isOpen={!!viewingInterviewApp}
          onClose={() => setViewingInterviewApp(null)}
          interview={viewingInterviewApp.interview}
          companyName={selectedJob?.title}
          jobTitle={viewingInterviewApp.job_post?.title || selectedJob?.title}
        />
      )}

      {/* Stage Change Modal */}
      {updatingApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card rounded-xl max-w-sm w-full p-5 shadow-2xl border border-border space-y-4 text-foreground">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground">Update Applicant Stage</h3>
              <button
                onClick={() => setUpdatingApp(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Candidate: <strong className="text-foreground">{updatingApp.user?.name || updatingApp.applicant?.name || 'Applicant'}</strong>
              </p>

              {updatingApp.interview && (
                <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Active Interview Scheduled</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {new Date(updatingApp.interview.scheduled_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}{' '}
                    ({updatingApp.interview.duration_minutes} mins).
                    {newStatus === 'rejected' && ' Changing status to Rejected will cancel this scheduled interview.'}
                    {newStatus === 'hired' && ' Changing status to Hired will mark this interview completed.'}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Select New Stage:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ApplicationStatusType)}
                  className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="hired">Hired</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUpdatingApp(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                disabled={isUpdating}
                onClick={handleStatusUpdate}
                className="h-8 text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
              >
                {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Save Stage
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
