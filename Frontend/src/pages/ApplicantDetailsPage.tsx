import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Download,
  Loader2,
  FileText,
  Mail,
  Calendar,
  Briefcase,
  AlertCircle,
  Inbox,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  Video,
  ExternalLink,
} from 'lucide-react'
import { ScheduleInterviewModal } from '@/components/interview/ScheduleInterviewModal'
import { InterviewDetailsModal } from '@/components/interview/InterviewDetailsModal'
import { InterviewCountdown } from '@/components/interview/InterviewCountdown'
import { interviewService } from '@/services/interviewService'
import type { InterviewItem } from '@/types'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import EmployerSidebar from '@/components/employer/EmployerSidebar'
import EmployerHeader from '@/components/employer/EmployerHeader'
import { Button } from '@/components/ui/button'
import { getStorageUrl } from '@/lib/utils'
import api from '@/lib/api'

export type ApplicationStatusType =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'rejected'
  | 'hired'

interface ApplicantUser {
  id: number
  name: string
  email: string
  username: string
  cv_path?: string | null
  profile_photo_url?: string | null
  profile_photo_path?: string | null
}

interface JobPostInfo {
  id: number
  title: string
  slug: string
  job_type: string
  job_type_label: string
  location?: string | null
}

interface ApplicationDetails {
  id: number
  user_id: number
  job_post_id: number
  applicant?: ApplicantUser
  job_post?: JobPostInfo
  cv_path: string | null
  cover_letter: string | null
  status: ApplicationStatusType
  status_label: string
  created_at: string
  interview?: InterviewItem | null
}

const STATUS_CONFIG: Record<
  ApplicationStatusType,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  submitted: {
    label: 'Submitted',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    icon: Inbox,
  },
  under_review: {
    label: 'Under review',
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

function StatusBadge({ status, label }: { status: ApplicationStatusType; label?: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    badgeClass: 'bg-muted text-muted-foreground border border-border',
    icon: Clock,
  }

  const IconComponent = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      <IconComponent className="h-3.5 w-3.5" />
      {label || config.label}
    </span>
  )
}

export default function ApplicantDetailsPage() {
  const [searchParams] = useSearchParams()
  const applicationId = searchParams.get('id')

  const [application, setApplication] = useState<ApplicationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatusType>('under_review')
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isCancellingInterview, setIsCancellingInterview] = useState(false)

  const handleCancelInterview = async () => {
    if (!application?.id) return
    if (!window.confirm('Are you sure you want to cancel this scheduled interview?')) return
    try {
      setIsCancellingInterview(true)
      await interviewService.cancel(application.id)
      setApplication({ ...application, interview: null })
      toast.success('Interview cancelled.')
    } catch (err) {
      console.error('Failed to cancel interview:', err)
      toast.error('Failed to cancel interview.')
    } finally {
      setIsCancellingInterview(false)
    }
  }
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDownloadingCv, setIsDownloadingCv] = useState(false)

  useEffect(() => {
    if (!applicationId) {
      setError('No application ID specified in the URL.')
      setIsLoading(false)
      return
    }

    let mounted = true

    const fetchApplication = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await api.get(`/employer/applications/${applicationId}`)
        const data: ApplicationDetails = res.data?.data || res.data
        if (mounted) {
          setApplication(data)
          setSelectedStatus(data.status)
        }
      } catch (err) {
        console.error('Failed to fetch applicant details:', err)
        if (mounted) {
          setError('Failed to load application details. Please confirm you have access.')
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchApplication()

    return () => {
      mounted = false
    }
  }, [applicationId])

  const handleDownloadCv = async () => {
    if (!application) return

    try {
      setIsDownloadingCv(true)
      toast.info('Downloading applicant CV...')
      const response = await api.get(`/employer/applications/${application.id}/cv`, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const name = application.applicant?.name
        ? application.applicant.name.toLowerCase().replace(/\s+/g, '-')
        : 'applicant'
      link.download = `${name}-cv-${application.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('CV downloaded successfully!')
    } catch (err) {
      console.error('Error downloading CV:', err)
      toast.error('Applicant CV file not found or unavailable.')
    } finally {
      setIsDownloadingCv(false)
    }
  }

  const handleUpdateStatus = async (statusToSet?: ApplicationStatusType) => {
    if (!application) return
    const statusValue = statusToSet || selectedStatus

    if (application.interview && statusValue === 'rejected') {
      const confirmed = window.confirm(
        'This candidate has an active scheduled interview. Marking them as Rejected will automatically cancel the interview schedule. Do you wish to continue?'
      )
      if (!confirmed) return
    }

    try {
      setIsUpdatingStatus(true)
      const res = await api.put(`/employer/applications/${application.id}/status`, {
        status: statusValue,
      })
      const updated: ApplicationDetails = res.data?.data || res.data
      setApplication(updated)
      setSelectedStatus(updated.status)
      toast.success(`Application status updated to "${updated.status_label || statusValue}".`)
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
      toast.error(message || 'Failed to update application status. Please try again.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'AP'
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <EmployerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title="Applicant Details" />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Notion Document Header */}
          <div className="border-b border-border/60 pb-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
                👤
              </span>
              <span>Job Applicants / Candidate Profile</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Applicant Details
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Examine candidate qualifications, review cover letter, download CV, and update hiring status.
                </p>
              </div>

              <Link
                to={
                  application?.job_post_id
                    ? `/job-applicants?jobId=${application.job_post_id}`
                    : '/job-applicants'
                }
              >
                <Button variant="outline" size="sm" className="rounded-lg h-8 px-3 text-xs self-start sm:self-auto">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to Applicants
                </Button>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-border/70 bg-card flex flex-col items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Loading applicant profile...</p>
            </div>
          ) : error || !application ? (
            <div className="rounded-xl border border-border/70 bg-card p-10 flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-foreground">Unable to load candidate details</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              <Link to="/job-applicants" className="mt-4">
                <Button variant="outline" size="sm" className="rounded-lg text-xs">Return to Applicants</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Quick Status Bar */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground mr-1">
                  Change Stage to:
                </span>

                <Button
                  size="sm"
                  variant={application.status === 'submitted' ? 'default' : 'outline'}
                  className={`h-7 px-2.5 text-xs rounded-lg ${
                    application.status === 'submitted'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10'
                  }`}
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('submitted')}
                >
                  <Inbox className="mr-1 h-3 w-3" />
                  Submitted
                </Button>

                <Button
                  size="sm"
                  variant={application.status === 'under_review' ? 'default' : 'outline'}
                  className={`h-7 px-2.5 text-xs rounded-lg ${
                    application.status === 'under_review'
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10'
                  }`}
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('under_review')}
                >
                  <Clock className="mr-1 h-3 w-3" />
                  Under review
                </Button>

                <Button
                  size="sm"
                  variant={application.status === 'shortlisted' ? 'default' : 'outline'}
                  className={`h-7 px-2.5 text-xs rounded-lg ${
                    application.status === 'shortlisted'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/10'
                  }`}
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('shortlisted')}
                >
                  <Star className="mr-1 h-3 w-3" />
                  Shortlisted
                </Button>

                <Button
                  size="sm"
                  variant={application.status === 'hired' ? 'default' : 'outline'}
                  className={`h-7 px-2.5 text-xs rounded-lg ${
                    application.status === 'hired'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                  }`}
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('hired')}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Hired
                </Button>

                <Button
                  size="sm"
                  variant={application.status === 'rejected' ? 'destructive' : 'outline'}
                  className={`h-7 px-2.5 text-xs rounded-lg ${
                    application.status === 'rejected'
                      ? ''
                      : 'text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
                  }`}
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('rejected')}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Rejected
                </Button>
              </div>

              {/* Two Column Layout */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Applicant Profile */}
                <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Applicant Information</h3>
                    <StatusBadge status={application.status} label={application.status_label} />
                  </div>

                  {/* Avatar & Basic Info */}
                  <div className="flex items-center gap-3.5 pb-2">
                    {application.applicant?.profile_photo_url ? (
                      <img
                        src={getStorageUrl(application.applicant.profile_photo_url)}
                        alt={application.applicant.name}
                        className="h-12 w-12 rounded-xl object-cover border border-border/70 flex-shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground border border-border/70 font-bold text-sm flex-shrink-0">
                        {getInitials(application.applicant?.name)}
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-foreground text-sm">
                        {application.applicant?.name || 'Unknown Candidate'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        @{application.applicant?.username || 'user'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-xs">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Email Address</p>
                        <p className="font-medium text-foreground">
                          {application.applicant?.email || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Applied Position</p>
                        <p className="font-medium text-foreground">
                          {application.job_post?.title || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Application Date</p>
                        <p className="font-medium text-foreground">
                          {new Date(application.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cover Letter */}
                  <div className="border-t border-border/60 pt-3">
                    <p className="text-xs font-semibold text-foreground mb-1.5">
                      Cover Letter
                    </p>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed">
                      {application.cover_letter?.trim()
                        ? application.cover_letter
                        : 'No cover letter was submitted with this application.'}
                    </div>
                  </div>
                </div>

                {/* Application Management */}
                <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-5">
                  <div className="border-b border-border/60 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Review & Decision</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Examine attached documents and assign final status</p>
                  </div>

                  {/* Interview Schedule Section */}
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-foreground" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Interview Schedule
                        </h4>
                      </div>
                      {application.interview ? (
                        <InterviewCountdown
                          scheduledAt={application.interview.scheduled_at}
                          durationMinutes={application.interview.duration_minutes}
                          variant="badge"
                        />
                      ) : (
                        <span className="text-[11px] font-medium text-muted-foreground">Not Scheduled</span>
                      )}
                    </div>

                    {application.interview ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="bg-background/80 border border-border/70 rounded-lg p-3 space-y-1.5 text-xs">
                          <div className="font-semibold text-foreground">
                            {application.interview.title || 'Candidate Interview'}
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(application.interview.scheduled_at).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}{' '}
                            ({application.interview.duration_minutes} mins)
                          </div>
                          <div className="text-muted-foreground capitalize">
                            Format: {application.interview.type === 'video' ? 'Video Conference' : application.interview.type === 'in_person' ? 'On-Site' : 'Phone'}
                          </div>
                          {application.interview.meeting_link && (
                            <div className="pt-1">
                              <a
                                href={application.interview.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium break-all"
                              >
                                <Video className="w-3.5 h-3.5" />
                                {application.interview.meeting_link}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsDetailsModalOpen(true)}
                            className="h-7 px-2.5 text-xs"
                          >
                            <Calendar className="mr-1 h-3.5 w-3.5 text-foreground" />
                            Calendar & Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="h-7 px-2.5 text-xs"
                          >
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isCancellingInterview}
                            onClick={handleCancelInterview}
                            className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-500/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <p className="text-xs text-muted-foreground">
                          Invite this candidate to a technical interview, phone call, or on-site meeting with live countdown and calendar sync.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setIsScheduleModalOpen(true)}
                          className="h-7 px-3 text-xs bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg shadow-xs font-semibold"
                        >
                          <Calendar className="mr-1.5 h-3.5 w-3.5" />
                          Schedule Interview
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* CV Download Section */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      Resume / Curriculum Vitae
                    </p>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5">
                      <div className="flex items-center gap-3">
                        <FileText className="h-7 w-7 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {application.applicant?.name
                              ? `${application.applicant.name}_CV.pdf`
                              : 'Applicant_CV.pdf'}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Official candidate snapshot captured at submission
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isDownloadingCv}
                        onClick={handleDownloadCv}
                        className="rounded-lg h-7 px-2.5 text-xs"
                      >
                        {isDownloadingCv ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3.5 w-3.5" />
                        )}
                        <span>Download CV</span>
                      </Button>
                    </div>
                  </div>

                  {/* Change Status Section */}
                  <div className="border-t border-border/60 pt-4 space-y-2">
                    <label htmlFor="status-select" className="block text-xs font-semibold text-foreground">
                      Update Candidate Status
                    </label>

                    <p className="text-[11px] text-muted-foreground">
                      Assign one of the 5 hiring statuses. The candidate will receive an immediate notification.
                    </p>

                    <select
                      id="status-select"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatusType)}
                      className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground outline-none"
                    >
                      <option value="submitted">Submitted (New application received)</option>
                      <option value="under_review">Under review (Evaluating candidate profile & CV)</option>
                      <option value="shortlisted">Shortlisted (Selected for interview / next round)</option>
                      <option value="rejected">Rejected (Not selected for this role)</option>
                      <option value="hired">Hired (Final offer extended and candidate hired)</option>
                    </select>

                    <Button
                      size="sm"
                      className="w-full mt-2 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
                      disabled={isUpdatingStatus || selectedStatus === application.status}
                      onClick={() => handleUpdateStatus(selectedStatus)}
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Save Status Update
                    </Button>
                  </div>
                </div>
              </div>

              {/* Hiring Pipeline Timeline Card */}
              <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-sm font-semibold text-foreground">Hiring Pipeline Progression</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Current stage of this applicant in your hiring workflow</p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs">
                  {/* Stage 1: Submitted */}
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                      ✓
                    </span>
                    <div>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">1. Submitted</p>
                      <p className="text-[10px] text-muted-foreground">Application received</p>
                    </div>
                  </div>

                  <span className="hidden text-muted-foreground/50 sm:block">→</span>

                  {/* Stage 2: Under review */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs ${
                        application.status !== 'submitted'
                          ? 'bg-amber-600 text-white'
                          : 'border border-border text-muted-foreground'
                      }`}
                    >
                      {application.status !== 'submitted' ? '✓' : '2'}
                    </span>
                    <div>
                      <p
                        className={
                          application.status !== 'submitted'
                            ? 'font-semibold text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground'
                        }
                      >
                        2. Under review
                      </p>
                      <p className="text-[10px] text-muted-foreground">Profile & CV screening</p>
                    </div>
                  </div>

                  <span className="hidden text-muted-foreground/50 sm:block">→</span>

                  {/* Stage 3: Shortlisted */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs ${
                        application.status === 'shortlisted' || application.status === 'hired'
                          ? 'bg-purple-600 text-white'
                          : 'border border-border text-muted-foreground'
                      }`}
                    >
                      {application.status === 'shortlisted' || application.status === 'hired'
                        ? '✓'
                        : '3'}
                    </span>
                    <div>
                      <p
                        className={
                          application.status === 'shortlisted' || application.status === 'hired'
                            ? 'font-semibold text-purple-600 dark:text-purple-400'
                            : 'text-muted-foreground'
                        }
                      >
                        3. Shortlisted
                      </p>
                      <p className="text-[10px] text-muted-foreground">Interview selection</p>
                    </div>
                  </div>

                  <span className="hidden text-muted-foreground/50 sm:block">→</span>

                  {/* Stage 4: Decision (Hired / Rejected) */}
                  <div className="flex items-center gap-2.5">
                    {application.status === 'hired' ? (
                      <>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                          ✓
                        </span>
                        <div>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">4. Hired</p>
                          <p className="text-[10px] text-emerald-600">Offer accepted</p>
                        </div>
                      </>
                    ) : application.status === 'rejected' ? (
                      <>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
                          ✕
                        </span>
                        <div>
                          <p className="font-bold text-rose-600 dark:text-rose-400">4. Rejected</p>
                          <p className="text-[10px] text-rose-600">Application closed</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
                          4
                        </span>
                        <div>
                          <p className="text-muted-foreground font-medium">4. Final Decision</p>
                          <p className="text-[10px] text-muted-foreground">Hired or Rejected</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {application && (
        <>
          <ScheduleInterviewModal
            isOpen={isScheduleModalOpen}
            onClose={() => setIsScheduleModalOpen(false)}
            applicationId={application.id}
            candidateName={application.applicant?.name}
            jobTitle={application.job_post?.title}
            existingInterview={application.interview}
            onSuccess={(interview) => {
              setApplication({
                ...application,
                status: 'shortlisted',
                status_label: 'Shortlisted',
                interview,
              })
              setSelectedStatus('shortlisted')
              toast.success('Interview scheduled successfully! Candidate notified.')
            }}
          />

          {application.interview && (
            <InterviewDetailsModal
              isOpen={isDetailsModalOpen}
              onClose={() => setIsDetailsModalOpen(false)}
              interview={application.interview}
              companyName={application.job_post?.title}
              jobTitle={application.job_post?.title}
            />
          )}
        </>
      )}
    </div>
  )
}
