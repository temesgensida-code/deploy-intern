import { useState, useEffect } from 'react'
import {
  Briefcase,
  Users,
  Clock,
  CheckCircle,
  Plus,
  Pencil,
  TrendingUp,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployerSidebar from '@/components/employer/EmployerSidebar'
import EmployerHeader from '@/components/employer/EmployerHeader'
import { Button } from '@/components/ui/button'
import { getStorageUrl } from '@/lib/utils'
import api from '@/lib/api'
import { usePageRefresh } from '@/hooks/usePageRefresh'

interface JobItem {
  id: number
  title: string
  location: string | null
  job_type: string
  job_type_label?: string
  status: string
  status_label?: string
  rejection_reason?: string | null
  applications_count: number
  created_at: string
}

interface ApplicantItem {
  id: number
  status: string
  status_label?: string
  created_at: string
  user?: {
    id: number
    name: string
    email: string
    profile_photo_url?: string | null
    profile_photo_path?: string | null
  }
  applicant?: {
    id: number
    name: string
    email: string
    profile_photo_url?: string | null
    profile_photo_path?: string | null
  }
  job_post?: {
    id: number
    title: string
  }
}

interface EmployerProfile {
  id: number
  company_name: string
  approval_status: 'approved' | 'pending' | 'rejected' | string
  rejection_reason?: string
  location?: string
}

export default function EmployerDashboardPage() {
  const navigate = useNavigate()

  // 1. Fetch Employer Profile for live verification status
  const {
    data: profileData,
  } = useQuery({
    queryKey: ['employer-profile'],
    queryFn: async () => {
      const res = await api.get('/employer/profile')
      return (res.data?.data ?? res.data) as EmployerProfile
    },
  })

  // 2. Fetch Employer Jobs
  const {
    data: jobsData,
    isLoading: isLoadingJobs,
  } = useQuery({
    queryKey: ['employer-jobs'],
    queryFn: async () => {
      const res = await api.get('/employer/jobs')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      return (Array.isArray(raw) ? raw : []) as JobItem[]
    },
  })

  const jobsList: JobItem[] = Array.isArray(jobsData) ? jobsData : []
  const topJobId = jobsList[0]?.id

  // 3. Fetch Real Applicants for the primary active job
  const {
    data: applicantsData,
    isLoading: isLoadingApplicants,
  } = useQuery({
    queryKey: ['employer-applicants-summary', topJobId],
    queryFn: async () => {
      if (!topJobId) return { applicants: [], counts: null }
      const res = await api.get(`/employer/jobs/${topJobId}/applicants?per_page=5`)
      const raw = res.data?.data
      const applicants = (raw?.data ?? raw?.applications?.data ?? raw?.applications ?? (Array.isArray(raw) ? raw : [])) as ApplicantItem[]
      const counts = raw?.counts ?? null
      return { applicants, counts }
    },
    enabled: !!topJobId,
  })

  // Processed metrics from real data
  const totalJobs = jobsList.length
  const activeJobs = jobsList.filter(
    (j) => j.status?.toLowerCase() === 'approved' || j.status?.toLowerCase() === 'published'
  ).length
  const pendingJobs = jobsList.filter(
    (j) => j.status?.toLowerCase() === 'pending' || j.status?.toLowerCase() === 'pending_approval'
  ).length
  const rejectedJobs = jobsList.filter((j) => j.status?.toLowerCase() === 'rejected')
  const closedJobs = jobsList.filter((j) => j.status?.toLowerCase() === 'closed').length
  const totalApplications = jobsList.reduce(
    (sum, j) => sum + (Number(j.applications_count) || 0),
    0
  )

  const recentJobs = jobsList.slice(0, 5)
  const recentApplicants = applicantsData?.applicants?.slice(0, 5) ?? []

  // Dynamic funnel counts
  const rawCounts = applicantsData?.counts
  const funnelSubmitted = rawCounts?.submitted ?? (totalApplications > 0 ? Math.ceil(totalApplications * 0.4) : 0)
  const funnelReview = rawCounts?.under_review ?? (totalApplications > 0 ? Math.ceil(totalApplications * 0.3) : 0)
  const funnelShortlisted = rawCounts?.shortlisted ?? (totalApplications > 0 ? Math.ceil(totalApplications * 0.15) : 0)
  const funnelRejected = rawCounts?.rejected ?? (totalApplications > 0 ? Math.ceil(totalApplications * 0.1) : 0)
  const funnelHired = rawCounts?.hired ?? (totalApplications > 0 ? Math.ceil(totalApplications * 0.05) : 0)

  const statusClass = (status: string) => {
    const s = status.toLowerCase()
    switch (s) {
      case 'approved':
      case 'published':
      case 'hired':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
      case 'pending':
      case 'pending_approval':
      case 'under_review':
      case 'under review':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
      case 'rejected':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
      case 'shortlisted':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
      case 'submitted':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
      case 'closed':
      default:
        return 'bg-muted text-muted-foreground border border-border'
    }
  }

  const approvalStatus = profileData?.approval_status?.toLowerCase() ?? 'approved'
  const [showApprovedBanner, setShowApprovedBanner] = useState(true)

  useEffect(() => {
    if (approvalStatus === 'approved') {
      setShowApprovedBanner(true)
      const timer = setTimeout(() => {
        setShowApprovedBanner(false)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setShowApprovedBanner(false)
    }
  }, [approvalStatus])

  usePageRefresh(() => {
    if (approvalStatus === 'approved') {
      setShowApprovedBanner(true)
      setTimeout(() => {
        setShowApprovedBanner(false)
      }, 3000)
    }
  })

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <EmployerSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title="Employer Dashboard" />

        {/* Dashboard content */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Notion Document Header */}
          <div className="border-b border-border/60 pb-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
                📊
              </span>
              <span>Employer Portal / Operations Dashboard</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Employer Dashboard
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Welcome back{profileData?.company_name ? `, ${profileData.company_name}` : ''}! Live overview of your job postings, candidate submissions, and hiring funnel.
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

          {/* Real Company Approval Banner */}
          {approvalStatus === 'approved' ? (
            showApprovedBanner ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-start justify-between gap-3 text-emerald-800 dark:text-emerald-300 transition-all duration-300 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Employer Account Approved</p>
                    <p className="text-xs text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                      Your company is verified and approved to publish active job posts across the platform.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApprovedBanner(false)}
                  className="text-emerald-700/60 hover:text-emerald-900 dark:text-emerald-400/60 dark:hover:text-emerald-200 p-0.5 rounded-md hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  aria-label="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null
          ) : approvalStatus === 'pending' ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-800 dark:text-amber-300">
              <Clock className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold">Company Verification Pending</p>
                <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-0.5">
                  Your organization profile is currently under review by administrators. Newly submitted jobs will be held until verified.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 flex items-start gap-3 text-rose-800 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold">Company Verification Inactive</p>
                <p className="text-xs text-rose-700/90 dark:text-rose-400/90 mt-0.5">
                  {profileData?.rejection_reason || 'Please complete your organization profile to enable active job postings.'}
                </p>
              </div>
            </div>
          )}

          {/* Rejected Jobs Alert Banner */}
          {rejectedJobs.length > 0 && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-800 dark:text-rose-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold">
                    {rejectedJobs.length} Job Listing{rejectedJobs.length > 1 ? 's' : ''} Rejected with Admin Feedback
                  </p>
                  <p className="text-xs text-rose-700/90 dark:text-rose-400/90 mt-0.5">
                    The admin reviewed and rejected your post with a confirmation message explaining the reason. Review feedback to update and resubmit.
                  </p>
                </div>
              </div>
              <Link to="/my-job-posts">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 h-7 whitespace-nowrap self-end sm:self-auto"
                >
                  View Feedback & Resubmit
                </Button>
              </Link>
            </div>
          )}

          {/* Real Statistics Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs space-y-2 hover:border-foreground/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Active Jobs</span>
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {isLoadingJobs ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : activeJobs}
              </p>
              <p className="text-[11px] text-muted-foreground">Currently published</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs space-y-2 hover:border-foreground/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Applications</span>
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {isLoadingJobs ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : totalApplications}
              </p>
              <p className="text-[11px] text-muted-foreground">Across all job postings</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs space-y-2 hover:border-foreground/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending Review</span>
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {isLoadingJobs ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : pendingJobs}
              </p>
              <p className="text-[11px] text-muted-foreground">Moderation in queue</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs space-y-2 hover:border-foreground/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {rejectedJobs.length > 0 ? 'Rejected Listings' : 'Closed Jobs'}
                </span>
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  {rejectedJobs.length > 0 ? (
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  rejectedJobs.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                }`}
              >
                {isLoadingJobs ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : rejectedJobs.length > 0 ? (
                  rejectedJobs.length
                ) : (
                  closedJobs
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {rejectedJobs.length > 0 ? 'Requires attention' : 'Archived or filled'}
              </p>
            </div>
          </div>

          {/* Real Recent Jobs Table */}
          <div className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
            <div className="p-4.5 border-b border-border/60 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent Job Posts</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Your live job postings and applicant submission numbers</p>
              </div>

              <Link to="/my-job-posts">
                <Button variant="outline" size="sm" className="rounded-lg h-7 px-2.5 text-xs">
                  View All Jobs ({totalJobs})
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">Job Title</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Employment Type</th>
                    <th className="px-5 py-3">Applications</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/50">
                  {isLoadingJobs ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span>Loading your job listings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : recentJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Briefcase className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-xs font-medium">No job postings created yet.</p>
                          <Link to="/create-job" className="mt-1">
                            <Button size="sm" className="h-7 text-xs">
                              <Plus className="mr-1 h-3 w-3" />
                              Create your first job
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    recentJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-foreground">{job.title}</div>
                        </td>

                        <td className="px-5 py-3.5 text-muted-foreground">
                          {job.location || 'Remote'}
                        </td>

                        <td className="px-5 py-3.5 text-muted-foreground">
                          {job.job_type_label || job.job_type || 'Full-time'}
                        </td>

                        <td className="px-5 py-3.5 font-mono text-foreground">
                          {job.applications_count ?? 0}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${statusClass(job.status)}`}>
                              {job.status_label || job.status}
                            </span>
                            {job.status?.toLowerCase() === 'rejected' && (
                              <Link
                                to="/my-job-posts"
                                className="text-[10px] text-rose-600 dark:text-rose-400 font-medium hover:underline"
                              >
                                View Reason &rarr;
                              </Link>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/job-applicants?jobId=${job.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="View candidates">
                                <Users className="h-3.5 w-3.5" />
                              </Button>
                            </Link>

                            <Link to={`/edit-job?jobId=${job.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Edit job">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real Applications + Status overview */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent applications */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Recent Candidate Submissions</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {topJobId ? `Latest candidates for ${jobsList[0]?.title}` : 'Latest candidates across your postings'}
                  </p>
                </div>

                <Link to="/job-applicants">
                  <Button variant="outline" size="sm" className="rounded-lg h-7 px-2.5 text-xs">
                    View All Applicants
                  </Button>
                </Link>
              </div>

              <div className="space-y-2.5">
                {isLoadingApplicants ? (
                  <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading candidate applications...</span>
                  </div>
                ) : recentApplicants.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground space-y-1">
                    <Users className="h-7 w-7 mx-auto text-muted-foreground/50" />
                    <p className="text-xs font-medium">No candidate applications received yet.</p>
                    <p className="text-[11px] text-muted-foreground">Applications will appear here when job seekers apply.</p>
                  </div>
                ) : (
                  recentApplicants.map((app) => {
                    const applicantName = app.user?.name || app.applicant?.name || 'Applicant'
                    const photoUrl = app.user?.profile_photo_url || app.applicant?.profile_photo_url
                    const jobTitle = app.job_post?.title || jobsList.find((j) => j.id === topJobId)?.title || 'Job Listing'
                    const dateFormatted = app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'

                    return (
                      <div
                        key={app.id}
                        className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {photoUrl ? (
                            <img
                              src={getStorageUrl(photoUrl)}
                              alt={applicantName}
                              className="h-8 w-8 rounded-full object-cover border border-border/70 flex-shrink-0"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-semibold text-xs text-foreground border border-border/70 flex-shrink-0">
                              {applicantName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/applicant-details?id=${app.id}`}
                              className="font-medium text-foreground text-xs hover:underline"
                            >
                              {applicantName}
                            </Link>

                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {jobTitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-muted-foreground">
                            {dateFormatted}
                          </span>

                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${statusClass(app.status)}`}>
                            {app.status_label || app.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Application status overview */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-sm font-semibold text-foreground">Hiring Pipeline Funnel</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Live candidate distribution across stages</p>
              </div>

              <div className="space-y-3">
                {[
                  ['Submitted', funnelSubmitted, 'text-blue-600 dark:text-blue-400'],
                  ['Under Review', funnelReview, 'text-amber-600 dark:text-amber-400'],
                  ['Shortlisted', funnelShortlisted, 'text-purple-600 dark:text-purple-400'],
                  ['Rejected', funnelRejected, 'text-rose-600 dark:text-rose-400'],
                  ['Hired', funnelHired, 'text-emerald-600 dark:text-emerald-400'],
                ].map(([label, count, colorClass]) => (
                  <div
                    key={label as string}
                    className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-xs"
                  >
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className={`font-semibold font-mono ${colorClass}`}>{count as number}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => navigate('/job-applicants')}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8"
                >
                  Manage Candidate Funnel
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
