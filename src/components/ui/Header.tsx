import { brand, whatsappLink } from '@/config/brand'

export function Header() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[70] rounded-full bg-accent px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <a
        href="#book"
        className="sr-only z-[70] rounded-full bg-accent px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-16"
      >
        Skip to booking
      </a>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4 md:px-8">
        <a href="#machine" className="pointer-events-auto flex items-center gap-3" data-cursor="link" aria-label={`${brand.fullName}, back to top`}>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-text/30 font-display text-sm font-bold">
            {brand.mark}
          </span>
          <span className="font-display text-[15px] font-semibold tracking-[0.18em]">{brand.name}</span>
        </a>
        <div className="pointer-events-auto flex items-center gap-2 font-mono text-xs">
          <a href={`tel:${brand.contact.phoneE164}`} className="hidden rounded-full px-3 py-2 text-muted hover:text-text sm:inline-block" data-cursor="link">
            {brand.contact.phoneDisplay}
          </a>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-line bg-bg/60 px-3 py-2 text-text hover:border-accent"
            data-cursor="link"
          >
            WhatsApp
          </a>
        </div>
      </header>
    </>
  )
}
