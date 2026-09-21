import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MyProfilePage from './MyProfilePage'
import { useProfileStore } from '@/stores/profile'

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    getProfile: vi.fn().mockResolvedValue(null),
  }),
}))

vi.mock('@/services/employeeFeedService', () => ({
  employeeFeedService: {
    getProfile: vi.fn().mockResolvedValue({
      profile: {
        headline: 'Full Stack Engineer',
        languages: [
          { id: '1', name: 'English', level: 'Native' },
          { id: '2', name: 'Amharic', level: 'Fluent' },
        ],
      },
    }),
  },
}))

describe('MyProfilePage', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: {
        headline: '',
        phone: '',
        location: '',
        bio: '',
        skills: [],
        experience: [],
        education: [],
        languages: [
          { id: '1', name: 'English', level: 'Native' },
          { id: '2', name: 'Amharic', level: 'Fluent' },
        ],
      },
    })
  })

  it('renders the My Profile heading', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MyProfilePage />
        </BrowserRouter>
      </QueryClientProvider>
    )
    expect(screen.getByRole('heading', { name: 'My Profile' })).toBeInTheDocument()
    expect(screen.getByText('Work Experience')).toBeInTheDocument()
  })

  it('renders languages with fluency tags', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MyProfilePage />
        </BrowserRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Native')).toBeInTheDocument()
    expect(screen.getByText('Amharic')).toBeInTheDocument()
    expect(screen.getByText('Fluent')).toBeInTheDocument()
  })
})
