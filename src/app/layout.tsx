import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Inter_Tight } from 'next/font/google'
import { brand } from '@/config/brand'
import { localBusinessJsonLd } from '@/lib/seo'
import './globals.css'

const display = Inter_Tight({ subsets: ['latin'], variable: '--font-display-face', weight: ['500', '600', '700'], display: 'swap' })
const sans = Geist({ subsets: ['latin'], variable: '--font-sans-face', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-face', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: `${brand.fullName} — Laptop repair & sales in Colombo`, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.fullName,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: brand.locale,
    url: brand.url,
    siteName: brand.fullName,
    title: `${brand.fullName}`,
    description: brand.tagline,
  },
  twitter: { card: 'summary_large_image', title: brand.fullName, description: brand.tagline },
  formatDetection: { telephone: true, address: true },
}

export const viewport: Viewport = {
  themeColor: brand.colors.background,
  colorScheme: 'dark',
}

/**
 * Runs before first paint: decides how the story is shown so the right version paints
 * immediately (no flash). static = no WebGL / ?nowebgl, stills = reduced motion, scrub = full.
 * Without JS the attribute is absent and the static version shows.
 */
const sceneScript = `(function(){try{var d=document.documentElement,q=location.search;var gl=false;if(q.indexOf('nowebgl')<0){var c=document.createElement('canvas');gl=!!(c.getContext('webgl2')||c.getContext('webgl'));}
var r=matchMedia('(prefers-reduced-motion: reduce)').matches;d.dataset.scene=!gl?'static':(r||q.indexOf('stills')>=0)?'stills':'scrub';}catch(e){document.documentElement.dataset.scene='static'}})();`

const cssVars = {
  '--bg': brand.colors.background,
  '--surface': brand.colors.surface,
  '--line': brand.colors.line,
  '--text': brand.colors.text,
  '--muted': brand.colors.muted,
  '--accent': brand.colors.accent,
  '--warning': brand.colors.warning,
} as React.CSSProperties

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} style={cssVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: sceneScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()).replace(/</g, '\\u003c') }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
