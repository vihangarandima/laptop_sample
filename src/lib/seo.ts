import { brand } from '@/config/brand'

const DAY: Record<string, string> = {
  Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday',
}

/** schema.org LocalBusiness (ComputerStore + repair) fed entirely from the brand config. */
export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['ComputerStore', 'ElectronicsStore'],
    '@id': `${brand.url}/#business`,
    name: brand.fullName,
    description: brand.description,
    slogan: brand.tagline,
    url: brand.url,
    telephone: brand.contact.phoneE164,
    email: brand.contact.email,
    image: `${brand.url}/opengraph-image`,
    priceRange: 'LKR',
    currenciesAccepted: brand.currency,
    address: {
      '@type': 'PostalAddress',
      streetAddress: brand.address.street,
      addressLocality: brand.address.locality,
      addressRegion: brand.address.region,
      postalCode: brand.address.postalCode,
      addressCountry: brand.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: brand.address.geo.lat, longitude: brand.address.geo.lng },
    openingHoursSpecification: brand.hours
      .filter((h) => h.opens && h.closes)
      .map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.days.map((d) => `https://schema.org/${DAY[d]}`),
        opens: h.opens,
        closes: h.closes,
      })),
    sameAs: brand.social.map((s) => s.href),
    makesOffer: [
      'Battery replacement',
      'SSD and RAM upgrades',
      'Data recovery',
      'Thermal cleaning and repaste',
      'Chip-level motherboard repair',
      'Keyboard, trackpad and liquid damage repair',
      'Screen and hinge replacement',
    ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
  }
}
