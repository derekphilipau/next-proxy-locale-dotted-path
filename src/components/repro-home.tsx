import { DEPLOY_URL, TEST_PATHS } from '@/lib/repro-links'

export function ReproHome({ locale }: { locale: string }) {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24, lineHeight: 1.5 }}>
      <h1>Next Proxy Locale Dotted Path Repro</h1>
      <p>Current locale: {locale}</p>
      <p>Deploy URL: {DEPLOY_URL}</p>
      <ul>
        {TEST_PATHS.map((path) => (
          <li key={path}>
            <a href={path}>{path}</a>{' '}
            <span style={{ color: '#666' }}>
              (
              <a href={`${DEPLOY_URL}${path}`} target="_blank" rel="noreferrer">
                deployed
              </a>
              )
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
