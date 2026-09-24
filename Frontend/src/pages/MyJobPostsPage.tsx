import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Users,
  Eye,
  Pencil,
  XCircle,
  AlertCircle,
  X,
  Send,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import EmployerSidebar from '@/components/employer/EmployerSidebar'
import EmployerHeader from '@/components/employer/EmployerHeader'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { usePageRefresh } from '@/hooks/usePageRefresh'

export interface EmployerJob {
  id: number
  title: string
  category: string
  location: string
  type: string
  applications: number
  deadline: string
  status: string
  rejection_reason?: string | null
}

const initialJobs: EmployerJob[] = [
  {
    id: 1,
    title: 'Senior React Developer',
    category: 'Technology',
    location: 'Addis Ababa',
    type: 'Full-time',
    applications: 24,
    deadline: 'Aug 30, 2026',
    status: 'Approved',
    rejection_reason: null,
  },
  {
    id: 2,
    title: 'UI/UX Designer',
    category: 'Design',
    location: 'Addis Ababa',
    type: 'Contract',
    applications: 12,
    deadline: 'Sep 5, 2026',
    status: 'Pending',
    rejection_reason: null,
  },
  {
    id: 3,
    title: 'Marketing Manager',
    category: 'Marketing',
    location: 'Remote',
    type: 'Full-time',
    applications: 15,
    deadline: 'Aug 25, 2026',
    status: 'Closed',
    rejection_reason: null,
  },
]

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    Rejected: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    Closed: 'bg-muted text-muted-foreground border border-border',
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        styles[status] ?? 'bg-muted text-muted-foreground border border-border'
      }`}
    >
      {status}
    </span>
  )
}

export default function MyJobPostsPage() {
  const [jobs, setJobs] = useState<EmployerJob[]>(initialJobs)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [typeFilter, setTypeFilter] = useState('All Employment Types')

  const [currentPage, setCurrentPage] = useState(1)
  const jobsPerPage = 5

  // Rejection modal state
  const [selectedRejectionJob, setSelectedRejectionJob] = useState<EmployerJob | null>(null)
  const [resubmittingId, setResubmittingId] = useState<number | null>(null)

  const fetchEmployerJobs = useCallback(async () => {
    try {
      const res = await api.get('/employer/jobs')
      const data = res.data?.data?.data || res.data?.data
      if (Array.isArray(data)) {
        setJobs(
          data.map((j: any) => {
            let normalizedStatus = 'Pending'
            const s = (j.status || '').toLowerCase()
            if (s === 'published' || s === 'approved') {
              normalizedStatus = 'Approved'
            } else if (s === 'rejected') {
              normalizedStatus = 'Rejected'
            } else if (s === 'closed') {
              normalizedStatus = 'Closed'
            } else if (s === 'pending_approval' || s === 'pending') {
              normalizedStatus = 'Pending'
            } else if (j.status) {
              normalizedStatus = j.status.charAt(0).toUpperCase() + j.status.slice(1)
            }

            return {
              id: j.id,
              title: j.title,
              category: j.category?.name || 'General',
              location: j.location || 'Remote',
              type: j.job_type_label || j.job_type || 'Full-time',
              applications: j.applications_count ?? 0,
              deadline: j.deadline ? new Date(j.deadline).toLocaleDateString() : 'N/A',
              status: normalizedStatus,
              rejection_reason: j.rejection_reason || null,
            }
          }),
        )
      }
    } catch {
      // Fallback to initialJobs if guest or offline
    }
  }, [])

  useEffect(() => {
    fetchEmployerJobs()
  }, [fetchEmployerJobs])

  // Wire into global refresh button
  usePageRefresh(fetchEmployerJobs)

  const filteredJobs = jobs.filter((job) => {
    const search = searchTerm.toLowerCase()

    const matchesSearch =
      job.title.toLowerCase().includes(search) ||
      job.category.toLowerCase().includes(search) ||
      job.location.toLowerCase().includes(search)

    const matchesStatus =
      statusFilter === 'All Status' ||
      job.status === statusFilter

    const matchesType =
      typeFilter === 'All Employment Types' ||
      job.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const totalPages = Math.max(
    1,
    Math.ceil(filteredJobs.length / jobsPerPage),
  )

  const startIndex = (currentPage - 1) * jobsPerPage

  const paginatedJobs = filteredJobs.slice(
    startIndex,
    startIndex + jobsPerPage,
  )

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }

  const handleCloseJob = async (jobId: number) => {
    try {
      await api.post(`/employer/jobs/${jobId}/close`)
      toast.success('Job post closed successfully.')
      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.id === jobId
            ? { ...job, status: 'Closed' }
            : job,
        ),
      )
    } catch (err: any) {
      console.error('Failed to close job:', err)
      toast.error(err.response?.data?.message || 'Failed to close job post.')
    }
  }

  const handleResubmitJob = async (jobId: number) => {
    try {
      setResubmittingId(jobId)
      await api.post(`/employer/jobs/${jobId}/submit`)
      toast.success('Job post resubmitted for admin review successfully!')
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: 'Pending', rejection_reason: null }
            : j,
        ),
      )
      if (selectedRejectionJob?.id === jobId) {
        setSelectedRejectionJob(null)
      }
    } catch (err: any) {
      console.error('Failed to resubmit job post:', err)
      toast.error(err.response?.data?.message || 'Failed to resubmit job post.')
    } finally {
      setResubmittingId(null)
    }
  }

  const activeCount = jobs.filter((j) => j.status === 'Approved').length
  const pendingCount = jobs.filter((j) => j.status === 'Pending').length
  const rejectedCount = jobs.filter((j) => j.status === 'Rejected').length
  const totalAppsCount = jobs.reduce((acc, j) => acc + (j.applications || 0), 0)

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <EmployerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title="My Job Posts" />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Notion Document Header */}
          <div className="border-b border-border/60 pb-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
                💼
              </span>
              <span>Job Postings / Listings Directory</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  My Job Posts
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Manage your active listings, track candidate submissions, and post new positions.
                </p>
              </div>

              <Link to="/create-job">
                <Button size="sm" className="rounded-lg h-8 px-3.5 text-xs font-medium self-start sm:self-auto bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Post a New Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs space-y-2 hover:border-foreground/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Jobs</span>
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{jobs.length}</p>
              <p className="text-[11px] text-muted-foreground">Created by organization</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs space-y-2 hover:border-foreground/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Active Listings</span>
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{activeCount}</p>
              <p className="text-[11px] text-muted-foreground">Currently receiving applications</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs space-y-2 hover:border-foreground/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending Review</span>
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{pendingCount}</p>
              <p className="text-[11px] text-muted-foreground">Awaiting admin moderation</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs space-y-2 hover:border-foreground/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {rejectedCount > 0 ? 'Rejected Posts' : 'Total Applications'}
                </span>
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  {rejectedCount > 0 ? (
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
              </div>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  rejectedCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-foreground'
                }`}
              >
                {rejectedCount > 0 ? rejectedCount : totalAppsCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {rejectedCount > 0 ? 'Needs updates & resubmission' : 'Across all positions'}
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search job title, category, or location..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-muted/30 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="All Status">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="All Employment Types">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">Job Title</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Applications</th>
                    <th className="px-5 py-3">Deadline</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/50">
                  {paginatedJobs.length > 0 ? (
                    paginatedJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          {job.title}
                        </td>

                        <td className="px-5 py-3.5 text-muted-foreground">
                          {job.category}
                        </td>

                        <td className="px-5 py-3.5 text-muted-foreground">
                          {job.location}
                        </td>

                        <td className="px-5 py-3.5 text-muted-foreground">
                          {job.type}
                        </td>

                        <td className="px-5 py-3.5 font-mono text-foreground">
                          {job.applications}
                        </td>

                        <td className="px-5 py-3.5 text-muted-foreground">
                          {job.deadline}
                        </td>

                        <td className="px-5 py-3.5">
                          <StatusBadge status={job.status} />
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {job.status === 'Rejected' ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedRejectionJob(job)}
                                  className="h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                  title="View Admin Confirmation Message"
                                >
                                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                  Reason
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={resubmittingId === job.id}
                                  onClick={() => handleResubmitJob(job.id)}
                                  className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                                  title="Resubmit for admin approval"
                                >
                                  {resubmittingId === job.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Resubmit
                                </Button>

                                <Link to={`/edit-job?jobId=${job.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    title="Edit Job"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                              </>
                            ) : (
                              <>
                                <Link to={`/job-applicants?jobId=${job.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    title="View Applicants"
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    Applicants
                                  </Button>
                                </Link>

                                <Link to={`/edit-job?jobId=${job.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    title="Edit Job"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>

                                {job.status === 'Closed' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={resubmittingId === job.id}
                                    onClick={() => handleResubmitJob(job.id)}
                                    className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                    title="Repost this job"
                                  >
                                    {resubmittingId === job.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Repost
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCloseJob(job.id)}
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                                    title="Close Job"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Close
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No job posts found</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Try changing your search keywords or filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{paginatedJobs.length}</span> of{' '}
              <span className="font-semibold text-foreground">{filteredJobs.length}</span> job posts
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs rounded-lg"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Previous
              </Button>

              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                    currentPage === index + 1
                      ? 'bg-foreground text-background font-semibold'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {index + 1}
                </button>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs rounded-lg"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              >
                Next
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Rejection Confirmation Message Modal */}
      {selectedRejectionJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card rounded-xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 text-foreground">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Rejection Confirmation Message</h3>
                  <p className="text-[11px] text-muted-foreground">Admin review reason for "{selectedRejectionJob.title}"</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRejectionJob(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                  Admin Rejection Reason:
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed whitespace-pre-wrap">
                  {selectedRejectionJob.rejection_reason || 'No specific rejection message was provided by the administrator.'}
                </p>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">What should you do next?</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Review the rejection feedback provided by the administrator above.</li>
                  <li>Click <strong>Edit Job</strong> to adjust the job details according to the requirements.</li>
                  <li>After updating or resolving the concerns, click <strong>Resubmit for Review</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRejectionJob(null)}
                className="h-8 text-xs"
              >
                Close
              </Button>

              <Link to={`/edit-job?jobId=${selectedRejectionJob.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                >
                  <Pencil size={13} />
                  Edit Job
                </Button>
              </Link>

              <Button
                size="sm"
                disabled={resubmittingId === selectedRejectionJob.id}
                onClick={() => handleResubmitJob(selectedRejectionJob.id)}
                className="h-8 text-xs gap-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
              >
                {resubmittingId === selectedRejectionJob.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Resubmit for Review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
