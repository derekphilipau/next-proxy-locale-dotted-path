import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

const SUPPORTED = new Set(['en', 'es'])

type LocaleParams = Promise<{ locale: string }>

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

  setRequestLocale(locale)

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

  if (!SUPPORTED.has(locale)) {
    return {}
  }

  return {
    title: `Locale ${locale}`,
  }
}
