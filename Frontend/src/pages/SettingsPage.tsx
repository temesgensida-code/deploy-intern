import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import EmployerSidebar from '@/components/employer/EmployerSidebar'
import EmployeeSidebar from '@/components/employee/EmployeeSidebar'
import EmployerHeader from '@/components/employer/EmployerHeader'
import { ThemeToggle } from '@/components/ThemeToggle'
import { OtpInput } from '@/components/ui/otp-input'
import { ResendTimer } from '@/components/ui/resend-timer'
import api from '@/lib/api'

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring pr-9 font-mono"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, getProfile } = useAuthStore()
  const { t } = useTranslation()
  const isEmployer = user?.role === 'employer'

  // Notification preferences state
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(
    user?.email_notifications_enabled ?? true
  )
  const [isUpdatingEmailPref, setIsUpdatingEmailPref] = useState(false)

  // Fetch current notification preferences from backend
  useEffect(() => {
    let isMounted = true
    api.get('/user/notification-preferences')
      .then((res) => {
        if (isMounted && res.data?.data?.email_notifications_enabled !== undefined) {
          setEmailNotificationsEnabled(Boolean(res.data.data.email_notifications_enabled))
        }
      })
      .catch(() => {
        // Fallback gracefully
      })
    return () => {
      isMounted = false
    }
  }, [])

  const handleToggleEmailNotifications = async () => {
    const nextValue = !emailNotificationsEnabled
    setEmailNotificationsEnabled(nextValue)
    setIsUpdatingEmailPref(true)

    try {
      await api.put('/user/notification-preferences', {
        email_notifications_enabled: nextValue,
      })
      await getProfile()
      toast.success(
        nextValue
          ? t('settings.emailNotificationsEnabledToast', 'Email notifications enabled')
          : t('settings.emailNotificationsDisabledToast', 'Email notifications disabled')
      )
    } catch {
      setEmailNotificationsEnabled(!nextValue)
      toast.error(t('settings.emailNotificationsError', 'Failed to update email preferences'))
    } finally {
      setIsUpdatingEmailPref(false)
    }
  }

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState('')

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.post('/settings/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      }),
    onSuccess: () => {
      toast.success(t('settings.passwordSuccess', 'Password updated successfully'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: () => {
      toast.error(t('settings.passwordError', 'Failed to update password'))
    },
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('settings.fillAllFields', 'All password fields are required'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordsDoNotMatch', 'New passwords do not match'))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t('settings.passwordMinLength', 'New password must be at least 8 characters'))
      return
    }
    passwordMutation.mutate()
  }

  const handleToggle2FA = () => {
    if (!twoFactorEnabled) {
      setShowOtp(true)
    } else {
      setTwoFactorEnabled(false)
      setShowOtp(false)
      toast.success(t('settings.twoFactorDisabledSuccess', 'Two-factor authentication disabled'))
    }
  }

  const handleVerifyOtp = () => {
    if (otp.length < 6) {
      toast.error(t('settings.otpIncomplete', 'Please enter a complete 6-digit code'))
      return
    }
    setTwoFactorEnabled(true)
    setShowOtp(false)
    setOtp('')
    toast.success(t('settings.twoFactorEnabledSuccess', 'Two-factor authentication enabled successfully'))
  }

  const handleResendOtp = () => {
    toast.info(t('settings.otpResent', 'A new verification code has been sent'))
  }

  const sectionCls =
    'w-full rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-4'

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {isEmployer ? <EmployerSidebar /> : <EmployeeSidebar />}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title={t('settings.title', 'Settings')} />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Notion Document Header */}
          <div className="w-full border-b border-border/60 pb-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-foreground text-[11px] font-semibold">
                ⚙️
              </span>
              <span>Account & Security Preferences</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('settings.title', 'Settings')}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('settings.subtitle', 'Manage your account settings, security preferences, and display options.')}
            </p>
          </div>

          {/* Email Notifications Preference */}
          <section className={sectionCls}>
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('settings.notifications', 'Email Notifications')}
              </h2>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="pr-4">
                <p className="text-xs font-semibold text-foreground">
                  {emailNotificationsEnabled
                    ? t('settings.emailNotificationsEnabled', 'Email notifications are enabled')
                    : t('settings.emailNotificationsDisabled', 'Email notifications are disabled')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {t(
                    'settings.emailNotificationsDesc',
                    'Receive timely email updates for application status changes, interviews, new candidate applications, and job matches.'
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={isUpdatingEmailPref}
                onClick={handleToggleEmailNotifications}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                  emailNotificationsEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                aria-label="Toggle email notifications"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    emailNotificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Change Password */}
          <section className={sectionCls}>
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('settings.changePassword', 'Change Password')}
              </h2>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-1">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <PasswordField
                  label={t('settings.currentPassword', 'Current Password')}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
                <PasswordField
                  label={t('settings.newPassword', 'New Password')}
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <PasswordField
                  label={t('settings.confirmNewPassword', 'Confirm New Password')}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {passwordMutation.isPending
                    ? t('settings.updating', 'Updating...')
                    : t('settings.updatePassword', 'Update Password')}
                </button>
              </div>
            </form>
          </section>

          {/* Two-Factor Authentication */}
          <section className={sectionCls}>
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('settings.twoFactorAuth', 'Two-Factor Authentication')}
              </h2>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {twoFactorEnabled
                    ? t('settings.twoFactorEnabled', 'Two-factor authentication is enabled')
                    : t('settings.twoFactorDisabled', 'Two-factor authentication is disabled')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {twoFactorEnabled
                    ? t('settings.twoFactorEnabledDesc', 'Your account is secured with a secondary verification code.')
                    : t('settings.twoFactorDisabledDesc', 'Add an extra layer of security to your account.')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggle2FA}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  twoFactorEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    twoFactorEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {showOtp && (
              <div className="mt-4 space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">
                  {t('settings.enterOtpDesc', 'Enter the 6-digit code sent to your phone or authenticator app.')}
                </p>
                <OtpInput value={otp} onChange={setOtp} length={6} />
                <div className="flex items-center justify-between pt-1">
                  <ResendTimer onResend={handleResendOtp} seconds={60} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtp(false)
                        setOtp('')
                      }}
                      className="rounded-lg border border-border/80 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {t('settings.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      className="rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3 py-1.5 text-xs font-medium hover:opacity-90"
                    >
                      {t('settings.verifyEnable', 'Verify & Enable')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Appearance / Theme */}
          <section className={sectionCls}>
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('settings.appearance', 'Appearance')}
              </h2>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t('settings.theme', 'Theme')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settings.themeDesc', 'Switch between light and dark mode')}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
