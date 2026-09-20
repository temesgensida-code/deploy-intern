import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Upload, Download, Trash2, Eye,
  CheckCircle2, AlertCircle, ShieldCheck,
  FileText, ExternalLink, X, AlertTriangle, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import EmployeeSidebar from '@/components/employee/EmployeeSidebar'
import EmployerHeader from '@/components/employer/EmployerHeader'
import api from '@/lib/api'

interface CvStatus {
  has_cv: boolean
  file_name?: string | null
  uploaded_at?: string | null
  file_size?: number | null
  cv_path?: string | null
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return 'Unknown size'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Recently uploaded'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function CVResumePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // View modal state
  const [isViewing, setIsViewing] = useState(false)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Delete confirmation modal state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const { data: cvStatus, isLoading } = useQuery<CvStatus>({
    queryKey: ['cv-status'],
    queryFn: async () => {
      try {
        const res = await api.get('/users/cv/status')
        return res.data?.data ?? res.data
      } catch {
        const fallbackRes = await api.get('/users/cv')
        return fallbackRes.data?.data ?? fallbackRes.data
      }
    },
  })

  // Cleanup object URL on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
      }
    }
  }, [previewBlobUrl])

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('cv', file)
      const res = await api.post('/users/cv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-status'] })
      setUploadState('success')
      setUploadError(null)
      toast.success(t('cv.uploadSuccess', 'CV uploaded successfully'))
      setTimeout(() => setUploadState('idle'), 3000)
    },
    onError: (err: any) => {
      setUploadState('error')
      const msg =
        err.response?.data?.errors?.cv?.[0] ??
        err.response?.data?.message ??
        t('cv.uploadFailed', 'Failed to upload CV')
      setUploadError(msg)
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/users/cv')
    },
    onSuccess: () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
      setIsViewing(false)
      setIsConfirmingDelete(false)
      queryClient.invalidateQueries({ queryKey: ['cv-status'] })
      toast.success(t('cv.deleted', 'CV removed successfully'))
      setUploadState('idle')
      setUploadError(null)
    },
    onError: (err: any) => {
      setIsConfirmingDelete(false)
      toast.error(err.response?.data?.message ?? t('cv.deleteFailed', 'Failed to delete CV'))
    },
  })

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return t('cv.onlyPdf', 'Only PDF files are allowed')
    }
    if (file.size > 2 * 1024 * 1024) {
      return t('cv.fileTooLarge', 'File size exceeds 2MB limit')
    }
    return null
  }

  const handleFile = (file: File) => {
    const error = validateFile(file)
    if (error) {
      setUploadState('error')
      setUploadError(error)
      toast.error(error)
      return
    }
    setUploadState('uploading')
    uploadMutation.mutate(file)
  }

  const handleOpenPreview = async () => {
    setIsViewing(true)
    setIsLoadingPreview(true)
    try {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
      const res = await api.get('/users/cv/download', { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPreviewBlobUrl(url)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to load CV preview')
      setIsViewing(false)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleClosePreview = () => {
    setIsViewing(false)
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
    }
  }

  const handleDownload = async () => {
    try {
      const res = await api.get('/users/cv/download', { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = cvStatus?.file_name ?? 'CV-Resume.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to download CV')
    }
  }

  const cvTitle = cvStatus?.file_name || 'My_Resume.pdf'

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <EmployeeSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title={t('cv.title', 'CV / Resume')} />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-5xl">
          {/* Document Repository Header */}
          <div className="border-b border-border/60 pb-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
                📄
              </span>
              <span>Document Repository</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('cv.title', 'CV / Resume')}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upload and manage your primary resume. This document is automatically attached to your job applications.
            </p>
          </div>

          {isLoading ? (
            <div className="bg-card border border-border/70 rounded-xl p-6 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-20 bg-muted rounded-lg" />
            </div>
          ) : cvStatus?.has_cv ? (
            /* Active CV Document Card */
            <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('cv.activeCV', 'Active CV / Resume')}
                  </h2>
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Ready for applications</span>
                </span>
              </div>

              {/* CV Title & Metadata Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-lg bg-rose-600/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-rose-200 dark:border-rose-900/40">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    {/* CV Title */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="text-sm font-bold text-foreground truncate max-w-md"
                        title={cvTitle}
                        data-testid="cv-title"
                      >
                        {cvTitle}
                      </p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                        PDF
                      </span>
                    </div>
                    {/* CV Metadata */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span data-testid="cv-size">{formatBytes(cvStatus.file_size)}</span>
                      <span className="text-border">•</span>
                      <span data-testid="cv-date">Uploaded on {formatDate(cvStatus.uploaded_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions: View, Download, Remove */}
                <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <button
                    onClick={handleOpenPreview}
                    data-testid="view-cv-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span>View CV</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    data-testid="download-cv-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={deleteMutation.isPending}
                    data-testid="remove-cv-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-200 dark:border-rose-900/40 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Upload / Replace Dropzone */}
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {cvStatus?.has_cv ? 'Replace Current CV' : 'Upload CV / Resume'}
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">Max: 2MB (PDF only)</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files?.[0]
                if (file) handleFile(file)
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center space-y-2.5 ${
                dragOver
                  ? 'border-foreground bg-neutral-100 dark:bg-neutral-800/80'
                  : 'border-border/80 hover:border-foreground/40 hover:bg-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                data-testid="cv-input"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />

              <div className="h-10 w-10 rounded-lg bg-muted text-foreground flex items-center justify-center">
                <Upload className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  {t('cv.dragDrop', 'Drag and drop your CV here')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('cv.supportedFormat', 'Supported format: PDF (Max 2MB)')}
                </p>
              </div>

              {uploadState === 'uploading' && (
                <div className="flex items-center gap-2 text-xs font-medium text-foreground pt-2">
                  <div className="h-3.5 w-3.5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                  <span>{t('cv.uploading', 'Uploading your CV...')}</span>
                </div>
              )}
            </div>

            {uploadState === 'success' && (
              <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t('cv.uploadSuccess', 'CV uploaded successfully')}</span>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-800 dark:text-rose-300 bg-rose-500/10 border border-rose-200 dark:border-rose-900/40 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* View CV Modal */}
      {isViewing && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          data-testid="cv-preview-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClosePreview()
          }}
        >
          <div className="bg-card rounded-2xl max-w-4xl w-full h-[88vh] flex flex-col shadow-2xl border border-border overflow-hidden text-foreground">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70 bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-rose-600/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate max-w-md">
                    {cvTitle}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Document Preview • {formatBytes(cvStatus?.file_size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewBlobUrl && (
                  <button
                    onClick={() => window.open(previewBlobUrl, '_blank')}
                    title="Open in new tab"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New Tab</span>
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  title="Download PDF"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={handleClosePreview}
                  data-testid="close-preview-btn"
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors ml-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: PDF Viewer / Loader */}
            <div className="flex-1 bg-neutral-900/5 dark:bg-neutral-950/40 relative flex items-center justify-center p-2 sm:p-4">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-medium">Loading document preview...</p>
                </div>
              ) : previewBlobUrl ? (
                <iframe
                  src={`${previewBlobUrl}#toolbar=1&navpanes=0`}
                  title={`Preview of ${cvTitle}`}
                  data-testid="cv-preview-iframe"
                  className="w-full h-full rounded-xl border border-border bg-white shadow-inner"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Could not preview document</p>
                  <p className="text-xs text-muted-foreground">
                    Your browser might not support embedded PDFs. You can download it directly.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download CV</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove CV Confirmation Modal */}
      {isConfirmingDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          data-testid="delete-confirm-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteMutation.isPending) {
              setIsConfirmingDelete(false)
            }
          }}
        >
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-5 text-foreground">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-200 dark:border-rose-900/40">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-base font-bold text-foreground">
                  Remove CV / Resume
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to remove <strong className="text-foreground">{cvTitle}</strong>? This file will be permanently deleted from your profile and will no longer be submitted with your applications.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={deleteMutation.isPending}
                className="px-3.5 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                data-testid="confirm-remove-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove CV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
