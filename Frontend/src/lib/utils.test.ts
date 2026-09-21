import { describe, it, expect } from 'vitest'
import { cn, getStorageUrl } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('p-4', 'bg-red-500')
    expect(result).toBe('p-4 bg-red-500')
  })

  it('handles conditional classes', () => {
    const shouldAddClass = false
    const result = cn('p-4', shouldAddClass && 'bg-red-500', 'text-white')
    expect(result).toBe('p-4 text-white')
  })

  it('handles undefined and null', () => {
    const result = cn('p-4', undefined, null, 'text-white')
    expect(result).toBe('p-4 text-white')
  })

  it('deduplicates Tailwind classes', () => {
    const result = cn('p-4', 'p-8')
    expect(result).toBe('p-8')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('normalizes localhost dummy storage URLs to relative storage paths', () => {
    expect(getStorageUrl('http://localhost/storage/profile-photos/abc.png')).toBe('/storage/profile-photos/abc.png')
    expect(getStorageUrl('http://localhost:8000/storage/profile-photos/abc.png')).toBe('/storage/profile-photos/abc.png')
    expect(getStorageUrl('http://127.0.0.1/storage/profile-photos/abc.png')).toBe('/storage/profile-photos/abc.png')
  })
})

describe('getStorageUrl', () => {
  it('returns empty string for null, undefined, or empty path', () => {
    expect(getStorageUrl(null)).toBe('')
    expect(getStorageUrl(undefined)).toBe('')
    expect(getStorageUrl('')).toBe('')
  })

  it('returns absolute http/https URLs as-is', () => {
    expect(getStorageUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png')
    expect(getStorageUrl('http://example.com/logo.png')).toBe('http://example.com/logo.png')
  })

  it('returns blob and data URLs as-is', () => {
    expect(getStorageUrl('blob:http://localhost:5173/abc')).toBe('blob:http://localhost:5173/abc')
    expect(getStorageUrl('data:image/png;base64,...')).toBe('data:image/png;base64,...')
  })

  it('prepends /storage/ to relative storage paths', () => {
    expect(getStorageUrl('logos/my-logo.png')).toBe('/storage/logos/my-logo.png')
    expect(getStorageUrl('/logos/my-logo.png')).toBe('/storage/logos/my-logo.png')
  })

  it('avoids duplicate /storage/ prefixes', () => {
    expect(getStorageUrl('/storage/logos/my-logo.png')).toBe('/storage/logos/my-logo.png')
    expect(getStorageUrl('storage/logos/my-logo.png')).toBe('/storage/logos/my-logo.png')
  })
})
