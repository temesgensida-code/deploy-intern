export type UserRole = 'admin' | 'employer' | 'employee'

export interface User {
  id: number
  name: string
  email: string
  username: string
  role: UserRole
  role_label?: string
  is_suspended?: boolean
  email_notifications_enabled?: boolean
  status?: string
  email_verified_at: string | null
  created_at?: string
  updated_at?: string
  cv_path?: string | null
  cv_original_name?: string | null
  cv_uploaded_at?: string | null
}

export interface AuthResponse {
  user: User
  access_token: string
  token_type: string
  expires_at?: string
}

export interface LoginRequest {
  login: string
  password: string
  remember_me?: boolean
}

export interface RegisterRequest {
  name: string
  email: string
  username: string
  password: string
  password_confirmation: string
  role: UserRole
  remember_me?: boolean
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

export interface AdminNotificationData {
  type?: string
  title?: string
  message?: string
  job_post_id?: number
  job_title?: string
  employer_id?: number
  company_name?: string
  action_url?: string
  [key: string]: unknown
}

export interface AdminNotification {
  id: string
  type: string
  title?: string
  message?: string
  action_url?: string
  data: AdminNotificationData
  read_at: string | null
  is_read: boolean
  unread_count?: number
  created_at: string
  created_at_human?: string
}

export interface EmployerNotificationData {
  type?: string
  title?: string
  message?: string
  job_post_id?: number
  job_title?: string
  employer_id?: number
  company_name?: string
  application_id?: number
  applicant_name?: string
  applicant_email?: string
  action_url?: string
  rejection_reason?: string
  [key: string]: unknown
}

export interface EmployerNotification {
  id: string
  type: string
  title?: string
  message?: string
  action_url?: string
  data: EmployerNotificationData
  read_at: string | null
  is_read: boolean
  unread_count?: number
  created_at: string
  created_at_human?: string
}

export type { EmployeeNotification } from '@/services/employeeNotificationService'

export type InterviewType = 'video' | 'in_person' | 'phone'
export type InterviewStatus = 'scheduled' | 'rescheduled' | 'completed' | 'cancelled'

export interface InterviewItem {
  id: number
  application_id: number
  employer_id: number
  user_id: number
  job_post_id: number
  title: string
  type: InterviewType
  scheduled_at: string
  scheduled_at_formatted?: string
  duration_minutes: number
  timezone?: string
  meeting_link?: string | null
  location?: string | null
  notes?: string | null
  status: InterviewStatus
  created_at?: string
  updated_at?: string
}

export interface JobPost {
  id: number
  employer_id?: number
  category_id?: number
  title: string
  slug: string
  description?: string
  requirements?: string[]
  responsibilities?: string[]
  job_type?: string
  experience_level?: string
  location?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  is_remote?: boolean
  status?: string
  employer?: {
    id?: number
    company_name?: string
    logo?: string | null
    location?: string | null
  } | null
  category?: {
    id?: number
    name?: string
    slug?: string
  } | null
  published_at?: string | null
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}
