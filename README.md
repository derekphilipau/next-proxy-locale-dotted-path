# Next.js Root Dotted Path Repro

This repo is a minimal reproduction of a production-only Next.js App Router failure on Vercel.

## Issue

A missing root-level dotted path that should return `404` is instead handled by the top-level dynamic `[locale]` route and ends up returning `500`.

Current failing example:

- `/nonexistent-file.png`

Expected behavior:

- `/nonexistent-file.png` returns `404`

Actual behavior on Vercel:

- `/nonexistent-file.png` returns `500`
- the request enters the `[locale]` tree
- `generateMetadata()` runs for `locale = "nonexistent-file.png"`
- metadata code crashes with:

```txt
TypeError: Cannot read properties of null (reading '_type')
```

This is the same failure shape as the original production issue:

- unknown root dotted path
- interpreted as `[locale]`
- real metadata/layout code executes
- request fails with `500` instead of `404`

## Current Deployment

- `https://next-proxy-locale-dotted-path.vercel.app`

Useful paths:

- `/en`
- `/es`
- `/favicon.ico`
- `/nonexistent-file.png`

## Stack

- `next@^16.2.0`
- `next-intl@^4.8.3`
- `react@^19.2.4`

## Why This Repro Fails

The repro keeps a top-level `[locale]` route and a `proxy.ts` matcher that excludes dotted paths:

```ts
'/((?!_next|_vercel|.*\\..*).*)'
```

That means requests like `/nonexistent-file.png` bypass the normal locale middleware path. On Vercel, the App Router can then treat the path segment as the dynamic locale:

- `app/[locale]`
- `locale = "nonexistent-file.png"`

Inside [src/app/[locale]/layout.tsx](/Users/dau/Projects/Met/Github/nextjs-issue/src/app/[locale]/layout.tsx), `generateMetadata()` intentionally performs async metadata work without first rejecting invalid locales. For invalid locales, the helper in [src/lib/site-settings.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/lib/site-settings.ts) returns a null image object, and the metadata helper reads `_type` from `null`, causing the `500`.

## Minimal Repro Shape

The repro is intentionally small. The key files are:

- [src/app/[locale]/layout.tsx](/Users/dau/Projects/Met/Github/nextjs-issue/src/app/[locale]/layout.tsx)
- [src/app/[locale]/page.tsx](/Users/dau/Projects/Met/Github/nextjs-issue/src/app/[locale]/page.tsx)
- [src/proxy.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/proxy.ts)
- [src/i18n/routing.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/i18n/routing.ts)
- [src/i18n/request.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/i18n/request.ts)
- [src/lib/site-settings.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/lib/site-settings.ts)

Important characteristics:

- `[locale]` is the only top-level page entry
- `generateStaticParams()` exists on the locale layout
- `next-intl` uses `localePrefix: 'as-needed'`
- the proxy matcher excludes `.*\\..*`
- invalid locales still reach metadata work

## How To Reproduce

### Local

```bash
pnpm install
pnpm build
pnpm dev --hostname 127.0.0.1
```

Open:

- `http://127.0.0.1:3000/en`

Then click:

- `Test /nonexistent-file.png`

### Vercel

Deploy this repo, then open:

- `https://next-proxy-locale-dotted-path.vercel.app/en`

Click:

- `Test /nonexistent-file.png`

Or request directly:

```bash
curl -i https://next-proxy-locale-dotted-path.vercel.app/nonexistent-file.png
```

## Observed Vercel Error

Example Vercel log output:

```txt
TypeError: Cannot read properties of null (reading '_type')
Failed to handle /nonexistent-file.png
```

The important point is not just that metadata crashes. The routing behavior is wrong first:

- a missing dotted root path should have been a plain `404`
- instead, it enters the `[locale]` route tree
- then metadata runs and turns the request into a `500`

## Known Good Path

For comparison:

- `/favicon.ico` should return `200`

## Suspected Fix Direction

The likely fix is to stop blanket-excluding dotted paths in [src/proxy.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/proxy.ts), while still excluding only the real metadata routes and internal paths that should bypass middleware.
