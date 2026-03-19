type LocaleParams = Promise<{ locale: string }>

export default async function LocalePage({
  params,
}: {
  params: LocaleParams
}) {
  const { locale } = await params

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24, lineHeight: 1.5 }}>
      <h1>Repro</h1>
      <p>
        Current route: /{locale}
      </p>
      <p>
        <a href="/nonexistent-file.png">Test /nonexistent-file.png</a> (Should 404, not 500)
      </p>
      <p>
        <a href="/favicon.ico">Test /favicon.ico</a> (Should 200)
      </p>
    </main>
  )
}
