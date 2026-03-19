import { ReproHome } from '@/components/repro-home'

type LocaleParams = Promise<{ locale: string }>

export default async function LocalePage({
  params,
}: {
  params: LocaleParams
}) {
  const { locale } = await params

  return <ReproHome locale={locale} />
}
