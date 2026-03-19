type OgImage = {
  _type: 'image'
  assetId: string
}

type SiteSettings = {
  ogImage: OgImage | null
}

const SUPPORTED = new Set(['en', 'es'])

export async function getSiteSettingsLikeData(
  locale: string,
): Promise<SiteSettings> {
  await Promise.resolve()

  if (!SUPPORTED.has(locale)) {
    return {
      ogImage: null,
    }
  }

  return {
    ogImage: {
      _type: 'image',
      assetId: `og-${locale}`,
    },
  }
}

export function unsafeOgImageUrl(image: OgImage | null) {
  const value = image as OgImage

  return `https://example.com/og/${value._type}/${value.assetId}.png`
}
