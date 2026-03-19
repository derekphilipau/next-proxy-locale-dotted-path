import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Repro',
    short_name: 'Repro',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff',
    theme_color: '#fff',
    icons: [
      { src: '/icon', sizes: 'any', type: 'image/png' },
      { src: '/apple-icon', sizes: 'any', type: 'image/png' },
    ],
  }
}
