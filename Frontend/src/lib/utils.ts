import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStorageUrl(path?: string | null): string {
  if (!path) return ''
  if (path.startsWith('blob:') || path.startsWith('data:')) {
    return path
  }

  let clean = path
  // If path is a localhost URL pointing to storage (e.g. from backend APP_URL=http://localhost default),
  // strip the dummy localhost host so it resolves via the configured API base or Vite proxy
  const localhostStorageMatch = clean.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/(?:storage\/)?(.*)$/)
  if (localhostStorageMatch) {
    clean = localhostStorageMatch[1]
  } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean
  }

  clean = clean.replace(/^\/?(storage\/)?/, '')
  const rawBase = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const base = rawBase.replace(/\/api(\/v\d+)?\/?$/, '')
  return base ? `${base}/storage/${clean}` : `/storage/${clean}`
}
