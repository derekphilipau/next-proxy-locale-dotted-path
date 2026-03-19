 I’d aim for a minimal two-phase repro:

  1. show the bad behavior with a top-level dynamic [locale] route + proxy.ts matcher that excludes dotted paths
  2. show that removing only the dotted-path exclusion makes the same URL return 404

  That gives Next maintainers a tight A/B.

  ## Repro plan

  ### 1. Create a fresh app

  Use App Router.

  pnpm create next-app@latest next-proxy-locale-repro
  cd next-proxy-locale-repro

  Pick:

  - TypeScript: yes
  - App Router: yes
  - src/ directory: yes

  ### 2. Add a top-level dynamic locale route

  Create src/app/[locale]/layout.tsx:

  import { notFound } from 'next/navigation'
  import type { Metadata } from 'next'

  const SUPPORTED = new Set(['en', 'es'])

  export default async function LocaleLayout({
    children,
    params,
  }: {
    children: React.ReactNode
    params: Promise<{locale: string}>
  }) {
    const {locale} = await params

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
    params: Promise<{locale: string}>
  }): Promise<Metadata> {
    const {locale} = await params

    if (!SUPPORTED.has(locale)) {
      return {}
    }

    return {
      title: `Locale ${locale}`,
    }
  }

  Create src/app/[locale]/page.tsx:

  export default async function Page({
    params,
  }: {
    params: Promise<{locale: string}>
  }) {
    const {locale} = await params
    return <main>Hello from {locale}</main>
  }

  ### 3. Add metadata convention routes

  Create these files so we can verify real metadata routes still work:

  src/app/icon.tsx

  import { ImageResponse } from 'next/og'

  export const size = {width: 32, height: 32}
  export const contentType = 'image/png'

  export default function Icon() {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'red',
          color: 'white',
          fontSize: 20,
        }}
      >
        M
      </div>,
      size
    )
  }

  src/app/apple-icon.tsx

  export {default, size, contentType} from './icon'

  src/app/manifest.ts

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
        {src: '/icon', sizes: 'any', type: 'image/png'},
        {src: '/apple-icon', sizes: 'any', type: 'image/png'},
      ],
    }
  }

  src/app/robots.txt

  User-agent: *
  Allow: /

  src/app/sitemap.ts

  import type { MetadataRoute } from 'next'

  export default function sitemap(): MetadataRoute.Sitemap {
    return [{url: 'https://example.com/en'}]
  }

  Also add a real public favicon:

  printf '' > public/favicon.ico

  ### 4. Add proxy.ts with the old broken matcher

  Create src/proxy.ts:

  import {NextRequest, NextResponse} from 'next/server'

  export function proxy(_request: NextRequest) {
    return NextResponse.next()
  }

  export const config = {
    matcher: [
      '/((?!_next|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)',
    ],
  }

  The important part is the .*\\..* exclusion.

  ### 5. Test locally in dev

  Run:

  pnpm dev

  Check:

  - /en -> 200
  - /robots.txt -> 200
  - /sitemap.xml -> 200
  - /manifest.webmanifest -> 200
  - /favicon-does-not-exist.png -> likely 404 locally

  ### 6. Test production mode locally

  Run:

  pnpm build
  pnpm start

  Check the same URLs.

  ### 7. Deploy to Vercel

  This is the important part if the bug is prod-only there.

  Expected bad case:

  - /favicon-does-not-exist.png
  - /fakeroute.psd
  - /meta.json

  If the bug reproduces, these return 500, and Vercel logs should show something like:

  - nxtPlocale=favicon-does-not-exist.png

  ### 8. Now remove only the dotted-path exclusion

  Change src/proxy.ts to:

  import {NextRequest, NextResponse} from 'next/server'

  export function proxy(_request: NextRequest) {
    return NextResponse.next()
  }

  export const config = {
    matcher: [
      '/((?!_next|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|icon$|apple-icon$).*)',
    ],
  }

  ### 9. Redeploy and compare

  Expected fixed behavior:

  - /favicon-does-not-exist.png -> 404
  - /fakeroute.psd -> 404
  - real metadata routes still work:
      - /favicon.ico
      - /robots.txt
      - /sitemap.xml
      - /manifest.webmanifest
      - /icon
      - /apple-icon

  ## What to include in the GitHub issue

  Include:

  - exact Next version
  - exact Vercel/deploy environment
  - note that local dev may 404 while Vercel production 500s
  - the two proxy.ts matcher variants
  - Vercel log evidence showing nxtPlocale=<missing-file-name>

  ## Stronger fallback repro

  If the plain Next repro does not reproduce, next step is to add next-intl and mirror your app more closely:

  - localePrefix: 'as-needed'
  - createMiddleware(routing) in proxy.ts
  - same [locale] layout
  - then rerun the exact same test

  That would be the next-best minimal repro.

  If you want, I can draft the exact file tree and issue body next.


