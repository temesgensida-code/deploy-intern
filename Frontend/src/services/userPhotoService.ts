import api from '@/lib/api'
import type { User } from '@/types'

export interface UploadPhotoResponse {
  profile_photo_path: string
  profile_photo_url: string
  user: User
}

export const userPhotoService = {
  async uploadPhoto(file: File): Promise<UploadPhotoResponse> {
    const formData = new FormData()
    formData.append('photo', file)
    const response = await api.post('/user/profile-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data?.data ?? response.data
  },

  async deletePhoto(): Promise<{ user: User }> {
    const response = await api.delete('/user/profile-photo')
    return response.data?.data ?? response.data
  },
}
