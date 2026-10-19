import { ImageResponse } from 'next/og'
import { brand } from '@/config/brand'

export const alt = `${brand.fullName} — ${brand.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const c = brand.colors
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: c.background, color: c.text, padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 64, border: `2px solid ${c.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: c.accent }}>
            {brand.mark}
          </div>
          <div style={{ fontSize: 30, letterSpacing: 8 }}>{brand.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 78, lineHeight: 1.02, letterSpacing: -2, maxWidth: 900 }}>{brand.tagline}</div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 26, color: c.muted }}>Laptop repair, upgrades &amp; sales · Colombo</div>
        </div>
        <div style={{ display: 'flex', height: 6, width: 220, background: c.accent, borderRadius: 6 }} />
      </div>
    ),
    size,
  )
}
