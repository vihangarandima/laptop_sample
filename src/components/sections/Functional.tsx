import { brand, mapLink, whatsappLink } from '@/config/brand'
import { copy } from '@/content/copy'
import type { Product } from '@/lib/data/types'
import { BookingForm } from '../features/BookingForm'
import { Catalogue } from '../features/Catalogue'
import { Tracker } from '../features/Tracker'
import { Chapter } from './Chapter'

export function ShelfChapter({ products }: { products: Product[] }) {
  const c = copy.shelf
  return (
    <Chapter id="shelf" scene={c.scene}>
      {/* stage stays visible in the upper half; the catalogue is a rail along the bottom */}
      <div data-chapter-copy className="flex h-full w-full min-w-0 flex-col justify-between pb-[calc(var(--book-h)+28px)] pt-20 md:pb-8 md:pt-24">
        <div className="scrim mx-0 max-w-2xl rounded-r-3xl px-5 py-3 md:px-[max(2.5rem,6vw)]">
          <p className="eyebrow">{c.eyebrow}</p>
          <h2 id="shelf-title" tabIndex={-1} className="display mt-3 max-w-xl text-[clamp(1.9rem,3.6vw,3.2rem)]">
            {c.title}
          </h2>
          <p className="mt-3 hidden max-w-md text-muted md:block">{c.body}</p>
        </div>
        <div className="min-w-0 md:pr-[max(5rem,8vw)]">
          <Catalogue products={products} />
        </div>
      </div>
    </Chapter>
  )
}

export function TrackChapter() {
  const c = copy.track
  return (
    <Chapter id="track" scene={c.scene} layout="flow">
      <div className="flex min-h-[160svh] items-start">
        <div className="sticky top-0 flex min-h-svh w-full items-end px-5 pb-[calc(var(--book-h)+40px)] md:items-center md:px-[max(2.5rem,6vw)] md:pb-0">
          <div data-chapter-copy="in" className="w-full max-w-md">
            <p className="eyebrow">{c.eyebrow}</p>
            <h2 id="track-title" tabIndex={-1} className="display mt-4 text-[clamp(2rem,4.4vw,3.6rem)]">
              {c.title}
            </h2>
            <p className="mb-6 mt-4 text-muted">{c.body}</p>
            <Tracker />
          </div>
        </div>
      </div>
    </Chapter>
  )
}

export function BookChapter() {
  const c = copy.book
  return (
    <Chapter id="book" scene={c.scene} layout="flow">
      <div className="px-5 pb-24 pt-[18svh] md:px-[max(2.5rem,6vw)] md:pt-[20svh]">
        <div className="max-w-2xl">
          <p className="eyebrow">{c.eyebrow}</p>
          <h2 id="book-title" tabIndex={-1} className="display mt-4 text-[clamp(2.2rem,5vw,4.4rem)]">
            {c.title}
          </h2>
          <p className="mb-8 mt-4 max-w-md text-muted">{c.body}</p>
          <BookingForm />
        </div>
      </div>
    </Chapter>
  )
}

export function FindUsChapter() {
  const c = copy.findUs
  const a = brand.address
  const bbox = `${a.geo.lng - 0.006}%2C${a.geo.lat - 0.004}%2C${a.geo.lng + 0.006}%2C${a.geo.lat + 0.004}`
  return (
    <Chapter id="find-us" scene={c.scene} layout="flow">
      <div className="flex min-h-[180svh] items-end px-5 pb-10 md:px-[max(2.5rem,6vw)]">
        <div className="w-full">
          <div className="grid max-w-5xl gap-8 md:grid-cols-[1fr_1fr]">
            <div>
              <p className="eyebrow">{c.eyebrow}</p>
              <h2 id="find-us-title" tabIndex={-1} className="display mt-4 text-[clamp(2.4rem,5.4vw,4.8rem)]">
                {c.title}
              </h2>
              <p className="mt-4 max-w-sm text-muted">{c.body}</p>
              <address className="mt-8 grid gap-6 not-italic sm:grid-cols-2">
                <div>
                  <p className="eyebrow">Address</p>
                  <p className="mt-2 leading-relaxed">
                    {brand.fullName}
                    <br />
                    {a.street}
                    <br />
                    {a.locality} {a.postalCode}
                  </p>
                  <a href={mapLink()} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-accent underline-offset-4 hover:underline">
                    Open in maps
                  </a>
                </div>
                <div>
                  <p className="eyebrow">Contact</p>
                  <p className="mt-2 grid gap-1">
                    <a href={`tel:${brand.contact.phoneE164}`} className="hover:text-accent">{brand.contact.phoneDisplay}</a>
                    <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="hover:text-accent">WhatsApp</a>
                    <a href={`mailto:${brand.contact.email}`} className="hover:text-accent">{brand.contact.email}</a>
                  </p>
                </div>
              </address>
              <div className="mt-8">
                <p className="eyebrow">Hours</p>
                <table className="mt-2 text-sm">
                  <tbody>
                    {brand.hours.map((h) => (
                      <tr key={h.label}>
                        <th scope="row" className="py-1 pr-6 text-left font-normal text-muted">{h.label}</th>
                        <td className="py-1 font-mono">{h.opens ? `${h.opens} – ${h.closes}` : 'Closed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="panel overflow-hidden p-0 md:self-end">
              <iframe
                title={`Map showing ${brand.fullName}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${a.geo.lat}%2C${a.geo.lng}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-72 w-full grayscale invert-[0.92] hue-rotate-180"
              />
            </div>
          </div>
          <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 pb-20 font-mono text-xs text-muted md:pb-4">
            <p>
              © {new Date().getFullYear()} {brand.fullName}
            </p>
            <ul className="flex gap-4">
              {brand.social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-text">{s.label}</a>
                </li>
              ))}
            </ul>
          </footer>
        </div>
      </div>
    </Chapter>
  )
}
