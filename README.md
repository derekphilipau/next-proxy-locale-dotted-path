# App Router: Missing Root Dotted Paths Can Enter Top-Level `[locale]` And `500` On Vercel Instead Of `404`

This repo is a minimal reproduction of a Vercel production issue with Next.js App Router.

## Summary

Primary bug:

- a missing root dotted path like `/nonexistent-file.png` should return `404`
- instead, on Vercel, it is routed through the top-level dynamic `[locale]` segment

Secondary effect:

- once the request enters `app/[locale]`, `generateMetadata()` runs for `locale = "nonexistent-file.png"`
- app code then crashes and the response becomes `500`

This means the metadata crash is not the root bug. The routing is already wrong before the crash happens.

## Versions

- `next@^16.2.0`
- `react@^19.2.4`

## Deployment

- `https://next-proxy-locale-dotted-path.vercel.app`

Useful URLs:

- `https://next-proxy-locale-dotted-path.vercel.app/en`
- `https://next-proxy-locale-dotted-path.vercel.app/es`
- `https://next-proxy-locale-dotted-path.vercel.app/favicon.ico`
- `https://next-proxy-locale-dotted-path.vercel.app/nonexistent-file.png`

## Expected Behavior

- `/nonexistent-file.png` returns `404`

## Actual Behavior On Vercel

- `/nonexistent-file.png` returns `500`
- the request enters the `[locale]` tree
- `generateMetadata()` runs for `locale = "nonexistent-file.png"`
- the app crashes with:

```txt
TypeError: Cannot read properties of null (reading '_type')
```

Example Vercel log shape:

```txt
Failed to handle /nonexistent-file.png
TypeError: Cannot read properties of null (reading '_type')
```

## Minimal Repro Conditions

This repro is intentionally small. The relevant pieces are:

- a top-level dynamic locale route at [src/app/[locale]/layout.tsx](/Users/dau/Projects/Met/Github/nextjs-issue/src/app/[locale]/layout.tsx)
- `[locale]` is the only top-level page entry
- `generateStaticParams()` exists on the locale layout
- `proxy.ts` excludes dotted paths with:

```ts
'/((?!_next|_vercel|.*\\..*).*)'
```

- `generateMetadata()` does async work and crashes for invalid locale input

The key point is that the repro does not depend on any project-specific paths. The only matcher behavior that matters here is the blanket dotted-path exclusion.

## Why This Demonstrates A Routing Bug

Requests like `/nonexistent-file.png` should not enter `app/[locale]` at all.

In this repro, the dotted-path exclusion causes that request to bypass normal locale middleware handling. On Vercel, the App Router then treats the root segment as the dynamic locale:

- `app/[locale]`
- `locale = "nonexistent-file.png"`

After that, application code runs and turns the bad route match into a `500`.

So the sequence is:

1. missing dotted root path
2. enters top-level `[locale]`
3. `generateMetadata()` executes
4. app crashes
5. response is `500` instead of `404`

## A/B Matcher Note

With this matcher in [src/proxy.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/proxy.ts):

```ts
'/((?!_next|_vercel|.*\\..*).*)'
```

the issue reproduces on Vercel for `/nonexistent-file.png`.

If the blanket dotted-path exclusion `.*\\..*` is removed, the same path returns `404`.

That suggests the important trigger is not the metadata code by itself, but the routing behavior caused by excluding dotted paths from the proxy matcher.

## Repro Steps

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

Then click:

- `Test /nonexistent-file.png`

Or request directly:

```bash
curl -i https://next-proxy-locale-dotted-path.vercel.app/nonexistent-file.png
```

## Relevant Files

- [src/app/[locale]/layout.tsx](/Users/dau/Projects/Met/Github/nextjs-issue/src/app/[locale]/layout.tsx)
- [src/app/[locale]/page.tsx](/Users/dau/Projects/Met/Github/nextjs-issue/src/app/[locale]/page.tsx)
- [src/proxy.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/proxy.ts)
- [src/lib/site-settings.ts](/Users/dau/Projects/Met/Github/nextjs-issue/src/lib/site-settings.ts)
