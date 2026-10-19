/**
 * KERNEL — single source of truth for every brand value.
 * Rebrand the whole site by editing this file only.
 * Values marked PLACEHOLDER must be replaced before launch.
 */
export const brand = {
  name: 'KERNEL',
  fullName: 'KERNEL Laptop Care & Supply',
  tagline: 'Every machine has a story. We keep it going.',
  description:
    'Laptop repair, upgrades and quality-checked laptops in Colombo. Free diagnosis, a clear quote before any work, genuine parts and a warranty on every repair.',
  /** Production URL, used for canonical links, sitemap and structured data. */
  url: 'https://kernel.example.lk', // PLACEHOLDER
  locale: 'en_LK',
  currency: 'LKR',

  colors: {
    background: '#0b0c0d', // graphite
    surface: '#141618',
    line: '#24272b',
    text: '#ecebe6', // off-white
    muted: '#9a9a95',
    accent: '#5fe3ff', // electric cyan
    warning: '#ff5a36', // amber-red, only for fault moments
  },

  contact: {
    phoneDisplay: '+94 11 000 0000', // PLACEHOLDER
    phoneE164: '+94110000000', // PLACEHOLDER
    whatsappE164: '94770000000', // PLACEHOLDER — digits only, used in wa.me links
    email: 'hello@kernel.example.lk', // PLACEHOLDER
  },

  address: {
    street: '000 Example Road', // PLACEHOLDER
    locality: 'Colombo 03',
    region: 'Western Province',
    postalCode: '00300', // PLACEHOLDER
    country: 'LK',
    /** PLACEHOLDER coordinates (central Colombo). Replace with the shop's exact pin. */
    geo: { lat: 6.9022, lng: 79.8536 },
  },

  /** 24h times. Used for display and for LocalBusiness openingHoursSpecification. */
  hours: [
    { days: ['Mo', 'Tu', 'We', 'Th', 'Fr'], label: 'Monday – Friday', opens: '09:30', closes: '18:30' },
    { days: ['Sa'], label: 'Saturday', opens: '10:00', closes: '16:00' },
    { days: ['Su'], label: 'Sunday', opens: null, closes: null },
  ],

  social: [
    { label: 'Facebook', href: 'https://facebook.com/' }, // PLACEHOLDER
    { label: 'Instagram', href: 'https://instagram.com/' }, // PLACEHOLDER
  ],

  /** The mark shown on the laptop lid and in the header. */
  mark: 'K',
} as const

export type Brand = typeof brand

export const whatsappLink = (text?: string) =>
  `https://wa.me/${brand.contact.whatsappE164}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const mapLink = () =>
  `https://www.openstreetmap.org/?mlat=${brand.address.geo.lat}&mlon=${brand.address.geo.lng}#map=17/${brand.address.geo.lat}/${brand.address.geo.lng}`

export const formatLKR = (n: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: brand.currency, maximumFractionDigits: 0 }).format(n)
