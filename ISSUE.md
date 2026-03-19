# Root Dotted Paths Returning `500` Instead of `404`

## Summary

Production was returning `500` for some missing root-level file-like paths that should have been plain `404`s.

Examples:

- `/favicon-10x10.png`
- `/favicon-32x32.png`
- `/apple-touch-icon-120x120.png`
- `/meta.json`
- `/home.asp`

The underlying problem was not missing icon files by themselves. The real issue was that unknown root dotted paths could be interpreted by Next App Router as the dynamic `[locale]` segment.

## Symptom

Vercel logs showed errors like:

```text
GET /favicon-10x10.png 500
nxtPlocale=favicon-10x10.png
```

That `nxtPlocale` value is the smoking gun:

```text
app/[locale] => locale = "favicon-10x10.png"
```

In other words, Next was treating a missing file-like path as the locale segment instead of a missing asset.

## Why This Happened

### Route shape

The app has a top-level dynamic locale segment:

- [web/src/app/[locale]/layout.tsx](/Users/dau/Projects/Met/Github/met-js/web/src/app/[locale]/layout.tsx)

To the App Router, `[locale]` means "match any single path segment", not "match only supported locales".

So all of these are structurally valid matches:

- `/en`
- `/es`
- `/favicon-32x32.png`
- `/home.asp`

Locale validation happens later in app code via `hasLocale(...)`.

### Old proxy matcher behavior

The original proxy matcher excluded any path containing a dot:

```ts
'/((?!api(?!/smartling-proxy)|_next|_vercel|mothra|sculptured|sitemaps|robots.txt|icon|apple-icon|exhibitions/objects|.*\\..*).*)'
```

That was intended to skip paths that should not be internationalized.

However, it had a bad side effect:

- requests like `/favicon-32x32.png` never reached `proxy.ts`
- `next-intl` middleware never ran
- the App Router then matched routes directly
- `app/[locale]` could claim the request

Once that happened, deployed Next/Vercel returned `500` instead of a clean `404`.

## Why The `[locale]` Guard Was Not Enough

In [web/src/app/[locale]/layout.tsx](/Users/dau/Projects/Met/Github/met-js/web/src/app/[locale]/layout.tsx), invalid locales are rejected correctly:

```ts
if (!hasLocale(routing.locales, locale)) {
  notFound();
}
```

and `generateMetadata` now also returns early for invalid locales:

```ts
if (!hasLocale(routing.locales, locale)) {
  return {};
}
```

That is good defensive code, but on deployed Next 16 / Vercel it was still not enough to stop the `500`s once the request had already entered the `[locale]` tree.

## What We Learned

We initially considered a more complex `proxy.ts` fix with allowlists and explicit `404` handling.

That turned out not to be necessary.

The preview deployment showed that the key change was simply:

- remove the blanket `.*\\..*` exclusion from the proxy matcher

Once root dotted paths were allowed through the normal proxy / `next-intl` path:

- bogus root dotted paths returned normal `404`s
- the `500`s stopped

The remaining work was just to keep exact exclusions for the real metadata routes/files that should bypass proxy:

- `/favicon.ico`
- `/robots.txt`
- `/sitemap.xml`
- `/manifest.webmanifest`
- `/icon`
- `/apple-icon`

## Final Fix

The final implementation is in:

- [web/src/proxy.ts](/Users/dau/Projects/Met/Github/met-js/web/src/proxy.ts)

Current matcher:

```ts
'/((?!api(?!/smartling-proxy)|_next|_vercel|mothra|sculptured|sitemaps|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|favicon\\.ico$|icon$|apple-icon$|exhibitions/objects).*)'
```

What it does:

- still skips true internal paths
- skips exact metadata routes/files that Next should serve directly
- does **not** blanket-skip other dotted root paths anymore

Result:

- real metadata routes still work
- unknown root dotted paths now resolve as `404` instead of falling into `[locale]` and `500`ing

## Cleanup

As part of the branch, we also cleaned up dead legacy metadata/icon code:

- removed unused [web/components/global/meta-tags.tsx](/Users/dau/Projects/Met/Github/met-js/web/components/global/meta-tags.tsx)
- removed unused [web/public/manifest.json](/Users/dau/Projects/Met/Github/met-js/web/public/manifest.json)
- removed unused [web/public/browserconfig.xml](/Users/dau/Projects/Met/Github/met-js/web/public/browserconfig.xml)

Those legacy files were not part of the active App Router metadata setup anymore.

The app now relies on:

- [web/src/app/icon.tsx](/Users/dau/Projects/Met/Github/met-js/web/src/app/icon.tsx)
- [web/src/app/apple-icon.tsx](/Users/dau/Projects/Met/Github/met-js/web/src/app/apple-icon.tsx)
- [web/src/app/manifest.ts](/Users/dau/Projects/Met/Github/met-js/web/src/app/manifest.ts)
- [web/public/favicon.ico](/Users/dau/Projects/Met/Github/met-js/web/public/favicon.ico)

## What This Issue Is Not

This issue is specifically about:

- missing root dotted paths
- being interpreted as `[locale]`
- returning `500` in Vercel instead of `404`

This does **not** include unrelated route failures.

For example, `/es/art/collection/search/353509` was a separate issue involving a JSON parse failure in:

- [web/src/app/[locale]/(navigation)/art/collection/search/[objectID]/data/index.ts](/Users/dau/Projects/Met/Github/met-js/web/src/app/[locale]/(navigation)/art/collection/search/[objectID]/data/index.ts)

## Likely Framework Context

This appears related to the class of Next 16 App Router / `proxy.ts` production-only issues where deployed behavior differs from local dev.

Possibly related upstream issues:

- `vercel/next.js#90837`
- `vercel/next.js#87071`

It is still unclear why the errors became noisy on March 6 specifically.

Best current theory:

- the underlying bug path already existed after the Next 16 upgrade
- traffic / crawler behavior changed enough around March 5-6 to make it visible in volume

## Recommended Position

- Keep the matcher fix in [web/src/proxy.ts](/Users/dau/Projects/Met/Github/met-js/web/src/proxy.ts)
- Keep the small invalid-locale guard in [web/src/app/[locale]/layout.tsx](/Users/dau/Projects/Met/Github/met-js/web/src/app/[locale]/layout.tsx)
- Do not reintroduce the blanket `.*\\..*` exclusion

Waiting for an upstream Next.js fix alone is not a good production strategy because the local workaround is simple and verified.

