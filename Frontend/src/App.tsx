import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/hooks/useTheme'
import type { UserRole } from '@/types'
import ErrorBoundary from '@/components/ErrorBoundary'

import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'
import JobSearchPage from '@/pages/JobSearchPage'
import EmployerDashboardPage from '@/pages/EmployerDashboardPage'
import MyJobPostsPage from '@/pages/MyJobPostsPage'
import CreateJobPage from '@/pages/CreateJobPage'
import EditJobPage from '@/pages/EditJobPage'
import JobApplicantsPage from '@/pages/JobApplicantsPage'
import ApplicantDetailsPage from '@/pages/ApplicantDetailsPage'
import CompanyProfilePage from '@/pages/CompanyProfilePage'
import SettingsPage from '@/pages/SettingsPage'
import MyProfilePage from '@/pages/MyProfilePage'
import MyApplicationsPage from '@/pages/MyApplicationsPage'
import EditProfilePage from '@/pages/EditProfilePage'

import AdminApplicationsPage from '@/pages/AdminApplicationsPage'
import AdminJobsPage from '@/pages/AdminJobsPage'
import AdminLayoutPage from '@/pages/AdminLayoutPage'
import AdminOverviewPage from '@/pages/AdminOverviewPage'
import AdminSettingsPage from '@/pages/AdminSettingsPage'
import AdminUsersPage from '@/pages/AdminUsersPage'
import AdmincompaniesPage from '@/pages/AdmincompaniesPage'
import CVResumePage from './pages/CVResumePage'
import JobDetailPage from './pages/JobDetailPage'
import LandingPage from '@/pages/LandingPage'

const queryClient = new QueryClient()

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(resolvedTheme)
  }, [resolvedTheme])

  return <>{children}</>
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading app session...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({
  children,
  requireVerification = true,
}: {
  children: React.ReactNode
  requireVerification?: boolean
}) {
  const { isAuthenticated, isInitialized, user } = useAuthStore()

  if (!isInitialized) {
    return <LoadingFallback />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireVerification && !user?.email_verified_at) {
    return <Navigate to="/verify-email" replace />
  }

  return <>{children}</>
}

function RoleProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: UserRole[]
}) {
  const { isAuthenticated, isInitialized, user, hasRole } = useAuthStore()

  if (!isInitialized) {
    return <LoadingFallback />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user?.email_verified_at) {
    return <Navigate to="/verify-email" replace />
  }

  if (user && !hasRole(allowedRoles)) {
    const fallbackPath =
      user.role === 'employer'
        ? '/employer-dashboard'
        : user.role === 'employee'
          ? '/my-applications'
          : user.role === 'admin'
            ? '/admin'
            : '/dashboard'
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, user } = useAuthStore()

  if (!isInitialized) {
    return <LoadingFallback />
  }

  if (isAuthenticated) {
    if (!user?.email_verified_at) {
      return <Navigate to="/verify-email" replace />
    }
    const defaultPath =
      user?.role === 'employer'
        ? '/employer-dashboard'
        : user?.role === 'employee'
          ? '/my-applications'
          : user?.role === 'admin'
            ? '/admin'
            : '/dashboard'
    return <Navigate to={defaultPath} replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          
            <Routes>
              <Route
                path="/"
                element={<LandingPage />}
              />

              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <LoginPage />
                  </GuestRoute>
                }
              />

              <Route
                path="/register"
                element={
                  <GuestRoute>
                    <RegisterPage />
                  </GuestRoute>
                }
              />

              <Route
                path="/verify-email"
                element={
                  <ProtectedRoute requireVerification={false}>
                    <VerifyEmailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/forgot-password"
                element={
                  <GuestRoute>
                    <ForgotPasswordPage />
                  </GuestRoute>
                }
              />

              <Route
                path="/reset-password"
                element={
                  <GuestRoute>
                    <ResetPasswordPage />
                  </GuestRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employer-dashboard"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <EmployerDashboardPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/my-job-posts"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <MyJobPostsPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/create-job"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <CreateJobPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/jobs/create"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <CreateJobPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/edit-job"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <EditJobPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/jobs/:id/edit"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <EditJobPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/job-applicants"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <JobApplicantsPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/jobs/:id/applicants"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <JobApplicantsPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/applicant-details"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <ApplicantDetailsPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/jobs/:jobId/applicants/:applicantId"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <ApplicantDetailsPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/company-profile"
                element={
                  <RoleProtectedRoute allowedRoles={['employer', 'admin']}>
                    <CompanyProfilePage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'employer']}>
                    <SettingsPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/my-profile"
                element={
                  <ProtectedRoute>
                    <MyProfilePage />
                  </ProtectedRoute>
                }
              />

               <Route
                path="/edit-profile"
                element={
                  <ProtectedRoute>
                    <EditProfilePage />
                  </ProtectedRoute>
                }
              />

            <Route
              path="/my-applications"
              element={
                <ProtectedRoute>
                  <MyApplicationsPage />
                </ProtectedRoute>
              }
            />

              <Route
                path="/cv-resume"
                element={
                  <ProtectedRoute>
                    <CVResumePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/jobs/:slug"
                element={
                  <ProtectedRoute>
                    <JobDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
  path="/job-search"
  element={
    <ProtectedRoute>
      <JobSearchPage />
    </ProtectedRoute>
  }
/>

              {/* Admin Routes - nested under AdminLayoutPage so the sidebar/header
                 render once and every sub-page shows inside it via <Outlet />.
                 AdminLayoutPage itself checks the admin role before rendering. */}
              <Route
                path="/admin"
                element={
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <AdminLayoutPage />
                  </RoleProtectedRoute>
                }
              >
                {/* /admin -> Overview */}
                <Route index element={<AdminOverviewPage />} />
                {/* /admin/users -> Users list */}
                <Route path="users" element={<AdminUsersPage />} />
                {/* /admin/jobs -> Job Postings */}
                <Route path="jobs" element={<AdminJobsPage />} />
                {/* /admin/applications -> All Applications */}
                <Route path="applications" element={<AdminApplicationsPage />} />
                {/* /admin/companies -> Companies */}
                <Route path="companies" element={<AdmincompaniesPage />} />
                {/* /admin/settings -> System Settings */}
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          
          <Toaster richColors position="top-right" />
        </AuthInitializer>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
