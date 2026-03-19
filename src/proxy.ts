import { NextRequest, NextResponse } from 'next/server'

export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)',
  ],
}
