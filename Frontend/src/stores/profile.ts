import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkExperience {
  id: string
  title: string
  company: string
  period: string
}

export interface Education {
  id: string
  degree: string
  institution: string
  year: string
}

export interface Language {
  id: string
  name: string
  level: string
  isCustom?: boolean
}

export interface ProfileData {
  headline: string
  phone: string
  location: string
  bio: string
  skills: string[]
  experience: WorkExperience[]
  education: Education[]
  languages: Language[]
}

interface ProfileStore {
  profile: ProfileData
  setProfile: (data: Partial<ProfileData>) => void
}

const defaultProfile: ProfileData = {
  headline: '',
  phone: '',
  location: '',
  bio: '',
  skills: [],
  experience: [],
  education: [],
  languages: [],
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      setProfile: (data) =>
        set((state) => ({ profile: { ...state.profile, ...data } })),
    }),
    { name: 'jobseeker-profile' }
  )
)
