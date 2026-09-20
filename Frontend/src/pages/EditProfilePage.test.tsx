import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EditProfilePage from './EditProfilePage'
import { useProfileStore } from '@/stores/profile'

vi.mock('@/services/employeeFeedService', () => ({
  employeeFeedService: {
    getProfile: vi.fn().mockResolvedValue({
      profile: {
        headline: 'Frontend Engineer',
        languages: [{ id: 'l-1', name: 'English', level: 'Fluent' }],
      },
    }),
    updateProfile: vi.fn().mockResolvedValue({ success: true }),
  },
}))

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <EditProfilePage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('EditProfilePage', () => {
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
        languages: [],
      },
    })
  })

  it('renders the page title', () => {
    renderPage()
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
  })

  it('renders personal information fields', () => {
    renderPage()
    expect(screen.getByText('Personal Information')).toBeInTheDocument()
    expect(screen.getByText(/Full Name/)).toBeInTheDocument()
  })

  it('renders skills section', () => {
    renderPage()
    expect(screen.getByText('Skills')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add Skill/i })).toBeInTheDocument()
  })

  it('renders save and cancel buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('allows adding a language with standard dropdown and fluency selection', async () => {
    renderPage()
    const addLangBtn = screen.getByRole('button', { name: /Add language/i })
    fireEvent.click(addLangBtn)

    // Language select should be rendered
    const langSelect = screen.getByTestId('language-select-0') as HTMLSelectElement
    const fluencySelect = screen.getByTestId('fluency-select-0') as HTMLSelectElement

    expect(langSelect).toBeInTheDocument()
    expect(fluencySelect).toBeInTheDocument()

    // Select Amharic
    fireEvent.change(langSelect, { target: { value: 'Amharic' } })
    expect(langSelect.value).toBe('Amharic')

    // Select Native / Bilingual fluency
    fireEvent.change(fluencySelect, { target: { value: 'Native' } })
    expect(fluencySelect.value).toBe('Native')
  })

  it('displays custom text input when Other is selected for language', async () => {
    renderPage()
    const addLangBtn = screen.getByRole('button', { name: /Add language/i })
    fireEvent.click(addLangBtn)

    const langSelect = screen.getByTestId('language-select-0') as HTMLSelectElement

    // Choose 'OTHER'
    fireEvent.change(langSelect, { target: { value: 'OTHER' } })

    // Custom input should now be displayed
    const customInput = screen.getByTestId('custom-language-input-0') as HTMLInputElement
    expect(customInput).toBeInTheDocument()

    // Enter custom language
    fireEvent.change(customInput, { target: { value: 'Swahili' } })
    expect(customInput.value).toBe('Swahili')
  })

  it('allows removing an added language', async () => {
    renderPage()
    const addLangBtn = screen.getByRole('button', { name: /Add language/i })
    fireEvent.click(addLangBtn)

    expect(screen.getByTestId('language-item-0')).toBeInTheDocument()

    const removeBtn = screen.getByTestId('remove-language-0')
    fireEvent.click(removeBtn)

    expect(screen.queryByTestId('language-item-0')).not.toBeInTheDocument()
  })
})
