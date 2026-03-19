import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const SUPPORTED = new Set(['en', 'es'])

type LocaleParams = Promise<{ locale: string }>

function unsafeOgImageUrl(image: { _type: string } | null) {
  return `/api/og/${image!._type}`
}

async function getSiteSettingsLikeData(locale: string) {
  await Promise.resolve()

  if (!SUPPORTED.has(locale)) {
    return { ogImage: null }
  }

  return {
    ogImage: { _type: 'image' },
  }
}

export function generateStaticParams() {
  return [{ locale: 'en' }]
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: LocaleParams
}) {
  const { locale } = await params

  if (!SUPPORTED.has(locale)) {
    notFound()
  }

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  )
}

export async function generateMetadata({
  params,
}: {
  params: LocaleParams
}): Promise<Metadata> {
  const { locale } = await params
  const siteSettings = await getSiteSettingsLikeData(locale)

  return {
    title: `Locale ${locale}`,
    openGraph: {
      images: [{ url: unsafeOgImageUrl(siteSettings.ogImage) }],
    },
  }
}
