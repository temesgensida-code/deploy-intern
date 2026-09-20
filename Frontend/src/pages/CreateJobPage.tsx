import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  Loader2,
  Save,
  Send,
  MapPin,
  DollarSign,
  FileText,
} from 'lucide-react'

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
  { id: 1, name: 'Software & IT' },
  { id: 2, name: 'Data Science & Analytics' },
  { id: 3, name: 'Product & Design' },
  { id: 4, name: 'Marketing & Sales' },
  { id: 5, name: 'Customer Support' },
  { id: 6, name: 'Finance & Accounting' },
  { id: 7, name: 'Human Resources & Operations' },
  { id: 8, name: 'Healthcare & Medical' },
  { id: 9, name: 'Education & Training' },
]

export default function CreateJobPage() {
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [hasEmployerProfile, setHasEmployerProfile] = useState<boolean | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    job_type: 'full_time',
    experience_level: 'mid',
    location: '',
    is_remote: false,
    salary_min: '',
    salary_max: '',
    salary_currency: 'USD',
    description: '',
    responsibilities: '',
    requirements: '',
  })

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingPage(true)
        // Fetch categories
        try {
          const catRes = await api.get('/categories')
          const raw = catRes.data?.data
          const items: Category[] = Array.isArray(raw) ? raw : raw?.data || []
          if (items.length > 0) {
            setCategories(items)
          } else {
            setCategories(DEFAULT_CATEGORIES)
          }
        } catch (catErr) {
          console.warn('Could not fetch categories from API, using default list:', catErr)
          setCategories(DEFAULT_CATEGORIES)
        }

        // Check employer profile
        try {
          const profileRes = await api.get('/employer/profile')
          if (profileRes.data.success && profileRes.data.data) {
            setHasEmployerProfile(true)
          } else {
            setHasEmployerProfile(false)
          }
        } catch {
          setHasEmployerProfile(false)
        }
      } catch (err: any) {
        console.error('Error loading page data:', err)
      } finally {
        setIsLoadingPage(false)
      }
    }

    loadData()
  }, [])

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSubmit(submitNow: boolean) {
    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      if (!formData.title.trim()) {
        setErrorMessage('Job title is required.')
        setIsSubmitting(false)
        return
      }

      if (!formData.category_id) {
        setErrorMessage('Please select a job category.')
        setIsSubmitting(false)
        return
      }

      if (!formData.description.trim()) {
        setErrorMessage('Job description is required.')
        setIsSubmitting(false)
        return
      }

      const payload = {
        title: formData.title,
        category_id: parseInt(formData.category_id, 10),
        job_type: formData.job_type,
        experience_level: formData.experience_level,
        location: formData.location || null,
        is_remote: formData.is_remote,
        salary_min: formData.salary_min ? parseInt(formData.salary_min, 10) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max, 10) : null,
        salary_currency: formData.salary_currency,
        description: formData.description,
        responsibilities: formData.responsibilities
          ? formData.responsibilities.split('\n').filter((line) => line.trim().length > 0)
          : [],
        requirements: formData.requirements
          ? formData.requirements.split('\n').filter((line) => line.trim().length > 0)
          : [],
        submit_now: submitNow,
      }

      const res = await api.post('/employer/jobs', payload)

      if (res.data.success) {
        const msg = submitNow
          ? 'Job post created and submitted for review successfully!'
          : 'Job post draft saved successfully!'
        setSuccessMessage(msg)

        setTimeout(() => {
          navigate('/my-job-posts')
        }, 1500)
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Failed to create job post. Please verify your inputs.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <EmployerSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title="Create Job" />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Notion Document Header */}
          <div className="border-b border-border/60 pb-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
                ➕
              </span>
              <span>Job Postings / New Position</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Create a New Job
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Provide position details, compensation, and requirements to publish or draft a new listing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/my-job-posts')}
                  disabled={isSubmitting}
                  className="rounded-lg h-8 px-3 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {isLoadingPage ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <span className="ml-2.5 text-xs text-muted-foreground font-medium">Loading position form...</span>
            </div>
          ) : hasEmployerProfile === false ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-xs text-foreground">Company Profile Required</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You need to complete your company profile before posting or creating job listings.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 rounded-lg text-xs"
                    onClick={() => navigate('/company-profile')}
                  >
                    Set Up Company Profile
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {successMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit(true)
                }}
                className="space-y-6"
              >
                {/* Basic Information */}
                <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                    <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                        Job Title <span className="text-rose-500">*</span>
                      </Label>
                      <input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Senior React Developer"
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="category_id" className="text-xs font-medium text-muted-foreground">
                        Job Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        id="category_id"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
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
                        value={formData.job_type}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                        required
                      >
                        <option value="full_time">Full-time</option>
                        <option value="part_time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="freelance">Freelance</option>
                        <option value="internship">Internship</option>
                        <option value="remote">Remote Only</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="experience_level" className="text-xs font-medium text-muted-foreground">
                        Experience Level <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        id="experience_level"
                        name="experience_level"
                        value={formData.experience_level}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                        required
                      >
                        <option value="entry">Entry Level</option>
                        <option value="mid">Mid Level</option>
                        <option value="senior">Senior Level</option>
                        <option value="lead">Lead</option>
                        <option value="executive">Executive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location & Work Mode */}
                <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-semibold text-foreground">Location & Work Mode</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-xs font-medium text-muted-foreground">Location</Label>
                      <input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. Addis Ababa, Ethiopia"
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="is_remote" className="text-xs font-medium text-muted-foreground">Work Mode</Label>
                      <select
                        id="is_remote"
                        name="is_remote"
                        value={formData.is_remote ? 'true' : 'false'}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_remote: e.target.value === 'true',
                          }))
                        }
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="false">On-site</option>
                        <option value="true">Remote Supported</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Salary Details */}
                <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                    <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-semibold text-foreground">Compensation (Optional)</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="salary_min" className="text-xs font-medium text-muted-foreground">Minimum Salary</Label>
                      <input
                        id="salary_min"
                        name="salary_min"
                        type="number"
                        min="0"
                        value={formData.salary_min}
                        onChange={handleChange}
                        placeholder="e.g. 1000"
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="salary_max" className="text-xs font-medium text-muted-foreground">Maximum Salary</Label>
                      <input
                        id="salary_max"
                        name="salary_max"
                        type="number"
                        min="0"
                        value={formData.salary_max}
                        onChange={handleChange}
                        placeholder="e.g. 2500"
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="salary_currency" className="text-xs font-medium text-muted-foreground">Currency</Label>
                      <select
                        id="salary_currency"
                        name="salary_currency"
                        value={formData.salary_currency}
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

                {/* Job Description, Responsibilities & Requirements */}
                <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                    <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-semibold text-foreground">Job Details & Description</h3>
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
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the overall mission, role overview, and team context..."
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring resize-y"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="responsibilities" className="text-xs font-medium text-muted-foreground">
                        Responsibilities (One per line)
                      </Label>
                      <textarea
                        id="responsibilities"
                        name="responsibilities"
                        rows={4}
                        value={formData.responsibilities}
                        onChange={handleChange}
                        placeholder="Design core API services&#10;Optimize database queries&#10;Conduct code reviews"
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="requirements" className="text-xs font-medium text-muted-foreground">
                        Requirements (One per line)
                      </Label>
                      <textarea
                        id="requirements"
                        name="requirements"
                        rows={4}
                        value={formData.requirements}
                        onChange={handleChange}
                        placeholder="3+ years backend development experience&#10;Proficiency with Laravel / PHP&#10;Experience with PostgreSQL"
                        className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring resize-y"
                      />
                    </div>
                  </div>
                </div>

                {/* Workflow Notice */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-900 dark:text-blue-300">
                  <p className="font-semibold">Admin Approval Notice</p>
                  <p className="mt-0.5 text-blue-700/90 dark:text-blue-400/90">
                    When you click "Post Job", your listing will be submitted for admin review before becoming publicly visible. Saving as a draft lets you edit it anytime later.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-2.5 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/my-job-posts')}
                    disabled={isSubmitting}
                    className="rounded-lg h-8 px-3 text-xs"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                    className="rounded-lg h-8 px-3 text-xs"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Save as Draft
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="rounded-lg h-8 px-3.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Post Job
                  </Button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
