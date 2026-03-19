type LocaleParams = Promise<{ locale: string }>

export default async function LocalePage({
  params,
}: {
  params: LocaleParams
}) {
  const { locale } = await params

  return <main>Hello from {locale}</main>
}
