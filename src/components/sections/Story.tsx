import { copy } from '@/content/copy'
import { chapters } from '@/content/chapters'
import type { Service } from '@/lib/data/types'
import { formatLKR } from '@/config/brand'
import { Chapter } from './Chapter'
import { ServiceJump } from '../ui/ServiceJump'
import { Readout } from '../ui/Readout'

const SERVICE_CHAPTER = new Map(chapters.filter((c) => c.service).map((c) => [c.service!.id, c.id]))

/** Copy block placement: desktop beside the laptop, phone in the bottom third. */
const left = 'mt-auto w-full px-5 pb-[calc(var(--book-h)+40px)] md:my-auto md:max-w-[34rem] md:pb-0 md:pl-[max(2.5rem,6vw)]'
const right = 'mt-auto w-full px-5 pb-[calc(var(--book-h)+40px)] md:my-auto md:ml-auto md:max-w-[32rem] md:pb-0 md:pr-[max(5rem,8vw)]'

export function MachineChapter() {
  const c = copy.machine
  return (
    <Chapter id="machine" scene={c.scene}>
      <div data-chapter-copy="out" className={`${left} scrim rounded-3xl py-6 md:py-10`}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 id="machine-title" tabIndex={-1} className="display mt-4 text-[clamp(2.5rem,6.2vw,5.6rem)]">
          {c.title}
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">{c.body}</p>
        <p className="eyebrow mt-10 flex items-center gap-3" aria-hidden="true">
          <span className="inline-block h-8 w-px animate-pulse bg-accent" /> Scroll
        </p>
      </div>
    </Chapter>
  )
}

export function FaultChapter() {
  const c = copy.fault
  return (
    <Chapter id="fault" scene={c.scene}>
      <div data-chapter-copy className={right}>
        <p className="eyebrow !text-warning">{c.eyebrow}</p>
        <h2 id="fault-title" tabIndex={-1} className="display mt-4 text-[clamp(2.2rem,5vw,4.4rem)]">
          {c.title}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[0.95rem] text-text/90">
          {c.lines.map((l) => (
            <li key={l} className="flex items-baseline gap-2">
              <span className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full bg-warning" aria-hidden="true" />
              {l}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-sm text-muted">{c.body}</p>
      </div>
    </Chapter>
  )
}

export function TeardownChapter({ services }: { services: Service[] }) {
  const c = copy.teardown
  return (
    <Chapter id="teardown" scene={c.scene}>
      <div data-chapter-copy className={left}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 id="teardown-title" tabIndex={-1} className="display mt-4 text-[clamp(2.2rem,5vw,4.4rem)]">
          {c.title}
        </h2>
        <p className="mt-6 max-w-md text-muted">{c.body}</p>
        <nav aria-label={copy.servicesIntro} className="mt-8">
          <p className="eyebrow mb-3">{copy.servicesIntro}</p>
          <ul className="flex flex-wrap gap-2">
            {services.map((s) => (
              <li key={s.id}>
                <ServiceJump chapter={SERVICE_CHAPTER.get(s.id) ?? 'teardown'} label={s.name} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Chapter>
  )
}

export function ServiceStop({ service, index, total }: { service: Service; index: number; total: number }) {
  const id = SERVICE_CHAPTER.get(service.id)!
  return (
    <Chapter id={id} scene={`The ${service.name.toLowerCase()} part lifts forward out of the exploded laptop and is lit in cyan while the other parts dim.`}>
      <div data-chapter-copy className={left}>
        <article data-callout-anchor className="panel relative max-w-sm p-6 md:p-7">
          <p className="eyebrow">
            Service {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </p>
          <h2 id={`${id}-title`} tabIndex={-1} className="display mt-3 text-[clamp(1.7rem,3vw,2.4rem)]">
            {service.name}
          </h2>
          <p className="mt-3 text-text/85">{service.summary}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 font-mono text-sm">
            <div>
              <dt className="text-muted">Turnaround</dt>
              <dd className="mt-1">{service.turnaround}</dd>
            </div>
            <div>
              <dt className="text-muted">Price</dt>
              <dd className="mt-1">
                {service.fromPrice === null ? 'Quote after diagnosis' : service.fromPrice > 0 ? `From ${formatLKR(service.fromPrice)}` : 'From LKR —'}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </Chapter>
  )
}

export function DiagnosisChapter() {
  const c = copy.diagnosis
  return (
    <Chapter id="diagnosis" scene={c.scene}>
      {/* phones: the glowing board fills the stage, so the copy gets a solid backing */}
      <div data-chapter-copy className={`${left} max-md:rounded-t-3xl max-md:bg-bg/90 max-md:pt-6`}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 id="diagnosis-title" tabIndex={-1} className="display mt-4 text-[clamp(2rem,4.2vw,3.6rem)]">
          {c.title}
        </h2>
        <Readout lines={c.readout} warnIndex={2} okIndex={4} />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {c.points.map(([t, d]) => (
            <li key={t}>
              <p className="font-medium">{t}</p>
              <p className="text-sm text-muted">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </Chapter>
  )
}

export function ReassemblyChapter() {
  const c = copy.reassembly
  return (
    <Chapter id="reassembly" scene={c.scene}>
      <div data-chapter-copy className={`${left} md:mb-[14vh] md:mt-auto`}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 id="reassembly-title" tabIndex={-1} className="display mt-4 text-[clamp(2.6rem,6vw,5.2rem)]">
          {c.title}
        </h2>
        <p className="mt-5 max-w-sm text-muted">{c.body}</p>
      </div>
    </Chapter>
  )
}
