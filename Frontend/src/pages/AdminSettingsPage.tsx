import { useState, useEffect } from 'react'
import {
  Globe,
  ShieldCheck,
  Save,
  Server,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

const SETTINGS_STORAGE_KEY = 'hirestream_admin_platform_settings'

interface PlatformSettings {
  platformName: string
  supportEmail: string
  requireJobApproval: boolean
  requireEmployerVerification: boolean
  notifyOnNewJob: boolean
  autoExpireDays: string
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'HireStream',
  supportEmail: 'admin@hirestream.io',
  requireJobApproval: true,
  requireEmployerVerification: true,
  notifyOnNewJob: true,
  autoExpireDays: '30',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      }
    } catch (err) {
      console.error('Failed to parse stored settings:', err)
    }
    return DEFAULT_SETTINGS
  })

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)

  useEffect(() => {
    api.get('/user/notification-preferences')
      .then((res) => {
        if (res.data?.data?.email_notifications_enabled !== undefined) {
          setEmailNotificationsEnabled(Boolean(res.data.data.email_notifications_enabled))
        }
      })
      .catch(() => {})
  }, [])

  const handleToggleAdminEmail = async (enabled: boolean) => {
    setEmailNotificationsEnabled(enabled)
    try {
      await api.put('/user/notification-preferences', {
        email_notifications_enabled: enabled,
      })
      toast.success(enabled ? 'Admin email notifications enabled' : 'Admin email notifications disabled')
    } catch {
      setEmailNotificationsEnabled(!enabled)
      toast.error('Failed to update email preferences')
    }
  }

  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
      }
    } catch {
      // Ignore fallback
    }
  }, [])

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      setTimeout(() => {
        setIsSaving(false)
        setIsSaved(true)
        toast.success('Platform settings saved and persisted successfully!')
        setTimeout(() => setIsSaved(false), 3000)
      }, 300)
    } catch (err) {
      setIsSaving(false)
      console.error('Failed to save settings:', err)
      toast.error('Failed to persist settings.')
    }
  }

  const handleResetDefaults = () => {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY)
      setSettings(DEFAULT_SETTINGS)
      toast.info('Settings restored to platform defaults.')
    } catch (err) {
      console.error('Failed to reset settings:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Notion Document Header */}
      <div className="border-b border-border/60 pb-5 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
            ⚙️
          </span>
          <span>System Configuration / Platform Preferences</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Platform Settings
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Platform-wide moderation workflows, notification preferences, and system lifecycle parameters.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="rounded-lg h-8 px-3 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Reset Defaults
            </Button>
            <Button
              onClick={() => handleSave()}
              disabled={isSaving}
              size="sm"
              className="rounded-lg h-8 px-3.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
            >
              {isSaving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : isSaved ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* General Settings */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/60">
            <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-foreground">Platform Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Platform Name
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, platformName: e.target.value }))
                }
                className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Support & Contact Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, supportEmail: e.target.value }))
                }
                className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Moderation Controls */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/60">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Moderation & Quality Controls</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-start justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-foreground block">
                  Mandatory Job Post Review
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Require manual administrative approval before any newly posted job is visible to candidates.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.requireJobApproval}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    requireJobApproval: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-border accent-neutral-900 dark:accent-white"
              />
            </label>

            <label className="flex items-start justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-foreground block">
                  Employer Business Verification
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Require employer company profiles to be verified and approved before they can publish jobs.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.requireEmployerVerification}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    requireEmployerVerification: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-border accent-neutral-900 dark:accent-white"
              />
            </label>

            <label className="flex items-start justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-foreground block">
                  Admin Email Review Alerts
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Receive email notifications when new job posts or employer companies are pending moderation.
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailNotificationsEnabled}
                onChange={(e) => handleToggleAdminEmail(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-neutral-900 dark:accent-white"
              />
            </label>

            <label className="flex items-start justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-foreground block">
                  Instant Admin Review Alerts
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Send live notification alerts to admin headers when jobs or employers are submitted.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyOnNewJob}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    notifyOnNewJob: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-border accent-neutral-900 dark:accent-white"
              />
            </label>
          </div>
        </div>

        {/* System & Expiration */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/60">
            <Server className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-semibold text-foreground">Listing Lifecycle</h3>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Job Listing Expiration Period (Days)
            </label>
            <select
              value={settings.autoExpireDays}
              onChange={(e) =>
                setSettings((s) => ({ ...s, autoExpireDays: e.target.value }))
              }
              className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="15">15 Days</option>
              <option value="30">30 Days (Default)</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  )
}
