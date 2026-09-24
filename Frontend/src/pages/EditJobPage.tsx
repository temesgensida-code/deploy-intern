import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  CheckCircle,
  Briefcase,
  MapPin,
  FileText,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Save,
  Send,
  Loader2,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

import EmployerSidebar from '@/components/employer/EmployerSidebar'
import EmployerHeader from '@/components/employer/EmployerHeader'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'

type Category = {
  id: number
  name: string
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Technology' },
  { id: 2, name: 'Design' },
  { id: 3, name: 'Marketing' },
  { id: 4, name: 'Finance' },
  { id: 5, name: 'Human Resources' },
]

type JobForm = {
  title: string
  category_id: string
  job_type: string
  experience_level: string
  positions: string
  location: string
  workMode: string
  salary_min: string
  salary_max: string
  salary_currency: string
  description: string
  responsibilities: string
  requirements: string
  deadline: string
}

const initialJob: JobForm = {
  title: '',
  category_id: '',
  job_type: 'full_time',
  experience_level: 'mid',
  positions: '1',
  location: '',
  workMode: 'On-site',
  salary_min: '',
  salary_max: '',
  salary_currency: 'USD',
  description: '',
  responsibilities: '',
  requirements: '',
  deadline: '',
}

export default function EditJobPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobIdParam = searchParams.get('jobId')
  const jobId = jobIdParam ? Number(jobIdParam) : null

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [job, setJob] = useState<JobForm>(initialJob)
  const [savedJob, setSavedJob] = useState<JobForm>(initialJob)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [jobStatusRaw, setJobStatusRaw] = useState<string>('draft')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get('/categories')
        const raw = res.data?.data
        const items: Category[] = Array.isArray(raw) ? raw : raw?.data || []
        if (items.length > 0) {
          setCategories(items)
        }
      } catch (err) {
        console.warn('Could not load categories:', err)
      }
    }
    fetchCategories()
  }, [])

  // Fetch real job data if jobId provided
  useEffect(() => {
    if (!jobId) return

    let isMounted = true
    async function loadJobData() {
      try {
        setIsLoading(true)

        // Try direct endpoint first, fallback to employer list
        let found: any = null
        try {
          const directRes = await api.get(`/employer/jobs/${jobId}`)
          found = directRes.data?.data
        } catch {
          const res = await api.get('/employer/jobs')
          const data = res.data?.data?.data || res.data?.data
          if (Array.isArray(data)) {
            found = data.find((j: any) => j.id === jobId)
          }
        }

        if (found && isMounted) {
          const status = (found.status || '').toLowerCase()
          setJobStatusRaw(status)
          setRejectionReason(found.rejection_reason || null)

          const loadedForm: JobForm = {
            title: found.title || '',
            category_id: found.category_id ? String(found.category_id) : found.category?.id ? String(found.category.id) : '',
            job_type: found.job_type || 'full_time',
            experience_level: found.experience_level || 'mid',
            positions: found.positions ? String(found.positions) : '1',
            location: found.location || '',
            workMode: found.is_remote ? 'Remote' : (found.location?.toLowerCase().includes('hybrid') ? 'Hybrid' : 'On-site'),
            salary_min: found.salary_min != null ? String(found.salary_min) : '',
            salary_max: found.salary_max != null ? String(found.salary_max) : '',
            salary_currency: found.salary_currency || 'USD',
            description: found.description || '',
            responsibilities: Array.isArray(found.responsibilities)
              ? found.responsibilities.join('\n')
              : found.responsibilities || '',
            requirements: Array.isArray(found.requirements)
              ? found.requirements.join('\n')
              : found.requirements || '',
            deadline: found.expires_at
              ? found.expires_at.split('T')[0]
              : found.deadline
              ? found.deadline.split('T')[0]
              : '',
          }

          setJob(loadedForm)
          setSavedJob(loadedForm)
        }
      } catch (err) {
        console.error('Failed to load job post details:', err)
        toast.error('Failed to load job post details.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadJobData()

    return () => {
      isMounted = false
    }
  }, [jobId])

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target

    setJob((currentJob) => ({
      ...currentJob,
      [name]: value,
    }))
  }

  function buildPayload() {
    return {
      title: job.title.trim(),
      category_id: job.category_id ? parseInt(job.category_id, 10) : undefined,
      job_type: job.job_type,
      experience_level: job.experience_level,
      location: job.location.trim() || null,
      is_remote: job.workMode === 'Remote',
      salary_min: job.salary_min ? parseInt(job.salary_min, 10) : null,
      salary_max: job.salary_max ? parseInt(job.salary_max, 10) : null,
      salary_currency: job.salary_currency || 'USD',
      description: job.description.trim(),
      responsibilities: job.responsibilities
        ? job.responsibilities.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
        : [],
      requirements: job.requirements
        ? job.requirements.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
        : [],
      deadline: job.deadline || null,
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!job.title.trim()) {
      toast.error('Job title is required.')
      return
    }
    if (!job.description.trim()) {
      toast.error('Job description is required.')
      return
    }

    try {
      setIsSaving(true)
      setMessage('')

      if (jobId) {
        await api.put(`/employer/jobs/${jobId}`, buildPayload())
      }

      setSavedJob(job)
      setMessage('Job changes saved successfully.')
      toast.success('Job changes saved successfully.')
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : 'Failed to save job changes.')
      setMessage(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleResubmitOrRepost() {
    if (!jobId) return

    if (!job.title.trim()) {
      toast.error('Job title is required.')
      return
    }
    if (!job.description.trim()) {
      toast.error('Job description is required.')
      return
    }

    try {
      setIsSubmitting(true)

      // First save latest edits
      await api.put(`/employer/jobs/${jobId}`, buildPayload())

      // Submit for admin review / repost
      await api.post(`/employer/jobs/${jobId}/submit`)

      const isClosedState = jobStatusRaw === 'closed' || jobStatusRaw === 'expired'
      const isPubState = jobStatusRaw === 'published'
      const successText = isClosedState
        ? 'Job post updated and submitted to be reposted!'
        : isPubState
        ? 'Job post updated and reposted for review successfully!'
        : 'Job post updated and resubmitted for admin review!'

      toast.success(successText)
      setJobStatusRaw('pending_approval')
      setRejectionReason(null)

      setTimeout(() => {
        navigate('/my-job-posts')
      }, 1200)
    } catch (err: any) {
      console.error('Failed to submit/repost job post:', err)
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : 'Failed to submit/repost job post.')
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    setJob(savedJob)
    navigate('/my-job-posts')
  }

  async function handleCloseJob() {
    const confirmed = window.confirm(
      'Are you sure you want to close this job? New applications will no longer be accepted.',
    )

    if (!confirmed) {
      return
    }

    try {
      if (jobId) {
        await api.post(`/employer/jobs/${jobId}/close`)
      }
      setJobStatusRaw('closed')
      toast.success('Job has been closed.')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to close job.')
    }
  }

  const isClosed = jobStatusRaw === 'closed' || jobStatusRaw === 'expired'
  const isRejected = jobStatusRaw === 'rejected'
  const isPending = jobStatusRaw === 'pending_approval'
  const isPublished = jobStatusRaw === 'published'

  const repostButtonLabel = isClosed
    ? 'Save & Repost Job'
    : isRejected
    ? 'Save & Resubmit for Review'
    : isPublished
    ? 'Save & Repost'
    : 'Save & Submit for Review'

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <EmployerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title="Edit Job" />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-5xl mx-auto">
          {/* Breadcrumbs and Status Header */}
          <div className="border-b border-border/60 pb-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Link
                  to="/my-job-posts"
                  className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>Back to My Job Posts</span>
                </Link>
                <span>/</span>
                <span>Edit Listing</span>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium self-start sm:self-auto ${
                  isClosed
                    ? 'bg-muted text-muted-foreground border border-border'
                    : isRejected
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : isPending
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {isClosed
                  ? 'Closed'
                  : isRejected
                  ? 'Rejected'
                  : isPending
                  ? 'Pending Approval'
                  : 'Published'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Edit Job Post
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Update position details, requirements, compensation, or repost your listing.
                </p>
              </div>

              {jobId && (
                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleResubmitOrRepost}
                  className={`rounded-lg h-8 px-3.5 text-xs font-medium text-white hover:opacity-90 self-start sm:self-auto gap-1.5 ${
                    isClosed
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : isPublished
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isClosed ? (
                    <RotateCcw className="h-3.5 w-3.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {repostButtonLabel}
                </Button>
              )}
            </div>
          </div>

          {/* Rejection Feedback Alert Box */}
          {isRejected && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-3 text-rose-900 dark:text-rose-200">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex-shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-rose-950 dark:text-rose-100">
                    Admin Rejection Confirmation Message & Feedback
                  </h3>
                  <p className="text-xs text-rose-800 dark:text-rose-300">
                    The administrator reviewed this job listing and rejected it with the following note:
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-background/80 dark:bg-card/90 border border-rose-500/20 text-xs leading-relaxed text-foreground font-medium">
                {rejectionReason || 'No detailed reason was provided by the administrator.'}
              </div>

              <p className="text-[11px] text-rose-800/90 dark:text-rose-300/90">
                💡 <strong>Next steps:</strong> Review the issues raised above, make the necessary corrections in the form below, and click <strong>Save & Resubmit for Review</strong>.
              </p>
            </div>
          )}

          {/* Closed Job Alert Box */}
          {isClosed && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <RotateCcw className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">This job post is currently closed</p>
                <p className="text-muted-foreground">
                  You can update any of the job details below and click <strong>Save & Repost Job</strong> to submit it for review and make it active again.
                </p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading job post details...</span>
            </div>
          )}

          {/* Message Alert */}
          {message && (
            <div
              className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-400"
            >
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              {message}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSave}>
            {/* Basic Information */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                    Job Title <span className="text-rose-500">*</span>
                  </Label>
                  <input
                    id="title"
                    name="title"
                    value={job.title}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Senior Backend Developer"
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category_id" className="text-xs font-medium text-muted-foreground">
                    Job Category <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={job.category_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job_type" className="text-xs font-medium text-muted-foreground">
                    Employment Type <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="job_type"
                    name="job_type"
                    value={job.job_type}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="experience_level" className="text-xs font-medium text-muted-foreground">
                    Experience Level <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="experience_level"
                    name="experience_level"
                    value={job.experience_level}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="entry">Entry level</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="positions" className="text-xs font-medium text-muted-foreground">
                    Available Positions
                  </Label>
                  <input
                    id="positions"
                    name="positions"
                    type="number"
                    min="1"
                    value={job.positions}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Location & Compensation */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">Location & Compensation</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs font-medium text-muted-foreground">
                    Location
                  </Label>
                  <input
                    id="location"
                    name="location"
                    value={job.location}
                    onChange={handleChange}
                    placeholder="e.g. Addis Ababa, Ethiopia"
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="workMode" className="text-xs font-medium text-muted-foreground">
                    Workplace Type
                  </Label>
                  <select
                    id="workMode"
                    name="workMode"
                    value={job.workMode}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="On-site">On-site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="salary_min" className="text-xs font-medium text-muted-foreground">
                    Salary Minimum
                  </Label>
                  <input
                    id="salary_min"
                    name="salary_min"
                    type="number"
                    min="0"
                    value={job.salary_min}
                    onChange={handleChange}
                    placeholder="e.g. 50000"
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="salary_max" className="text-xs font-medium text-muted-foreground">
                    Salary Maximum
                  </Label>
                  <input
                    id="salary_max"
                    name="salary_max"
                    type="number"
                    min="0"
                    value={job.salary_max}
                    onChange={handleChange}
                    placeholder="e.g. 80000"
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="salary_currency" className="text-xs font-medium text-muted-foreground">
                    Currency
                  </Label>
                  <select
                    id="salary_currency"
                    name="salary_currency"
                    value={job.salary_currency}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="ETB">ETB (Br)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-foreground">Job Description & Requirements</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">
                    Job Description <span className="text-rose-500">*</span>
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={job.description}
                    onChange={handleChange}
                    required
                    placeholder="Describe the role, team, and company mission..."
                    className="w-full resize-none rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="responsibilities" className="text-xs font-medium text-muted-foreground">
                      Key Responsibilities <span className="text-[11px] text-muted-foreground font-normal">(one per line)</span>
                    </Label>
                    <textarea
                      id="responsibilities"
                      name="responsibilities"
                      rows={4}
                      value={job.responsibilities}
                      onChange={handleChange}
                      placeholder="Design and implement scalable APIs&#10;Write unit and integration tests&#10;Collaborate with cross-functional teams"
                      className="w-full resize-none rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="requirements" className="text-xs font-medium text-muted-foreground">
                      Requirements & Skills <span className="text-[11px] text-muted-foreground font-normal">(one per line)</span>
                    </Label>
                    <textarea
                      id="requirements"
                      name="requirements"
                      rows={4}
                      value={job.requirements}
                      onChange={handleChange}
                      placeholder="3+ years of professional experience&#10;Strong proficiency in TypeScript and React&#10;Familiarity with REST APIs"
                      className="w-full resize-none rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Application Deadline */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold text-foreground">Application Deadline</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="deadline" className="text-xs font-medium text-muted-foreground">
                    Application Deadline
                  </Label>
                  <input
                    id="deadline"
                    name="deadline"
                    type="date"
                    value={job.deadline}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Leave empty if there is no hard deadline.
                  </p>
                </div>
              </div>
            </div>

            {/* Status notice */}
            {isPublished && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold">Listing is Published & Active</p>
                  <p className="mt-0.5 text-emerald-700/90 dark:text-emerald-400/90">
                    You can save updates to keep the listing live, or choose <strong>Save & Repost</strong> to submit the revised position for review.
                  </p>
                </div>
              </div>
            )}

            {isPending && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold">Under Admin Review</p>
                  <p className="mt-0.5 text-amber-700/90 dark:text-amber-400/90">
                    This job is currently pending approval by the administration. You can update any information before review concludes.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2.5 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="rounded-lg h-8 px-3 text-xs"
              >
                Cancel
              </Button>

              {isPublished && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleCloseJob}
                  className="rounded-lg h-8 px-3 text-xs"
                >
                  Close Job Post
                </Button>
              )}

              {jobId && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleResubmitOrRepost}
                  className={`rounded-lg h-8 px-3.5 text-xs font-medium text-white hover:opacity-90 gap-1.5 ${
                    isClosed
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : isPublished
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isClosed ? (
                    <RotateCcw className="h-3.5 w-3.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {repostButtonLabel}
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="rounded-lg h-8 px-3.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
