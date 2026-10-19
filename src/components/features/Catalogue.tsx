'use client'
import { useEffect, useMemo, useState } from 'react'
import { formatLKR, whatsappLink } from '@/config/brand'
import type { Product } from '@/lib/data/types'
import { scrollApi, story, useStory } from '@/lib/store'

const BUDGETS = [
  { id: 'all', label: 'Any budget', test: () => true },
  { id: 'lt100', label: 'Under 100k', test: (p: number) => p < 100_000 },
  { id: '100-200', label: '100k – 200k', test: (p: number) => p >= 100_000 && p <= 200_000 },
  { id: 'gt200', label: 'Over 200k', test: (p: number) => p > 200_000 },
] as const
const CONDITIONS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'refurbished', label: 'Refurbished' },
] as const

export function Catalogue({ products }: { products: Product[] }) {
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]['id']>('all')
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]['id']>('all')
  const selected = useStory((s) => s.product)

  useEffect(() => {
    story.getState().set({ catalog: products })
  }, [products])

  const list = useMemo(() => {
    const b = BUDGETS.find((x) => x.id === budget)!
    return products.filter((p) => (condition === 'all' || p.condition === condition) && b.test(p.price))
  }, [products, condition, budget])

  const select = (p: Product) => {
    story.getState().set({ product: selected?.id === p.id ? null : p })
    if (story.getState().chapter !== 'shelf') scrollApi.toChapter('shelf', { at: 0.3 })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 md:px-[max(2.5rem,6vw)]" role="group" aria-label="Filter laptops">
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">Condition</legend>
          {CONDITIONS.map((c) => (
            <Toggle key={c.id} name="condition" checked={condition === c.id} onChange={() => setCondition(c.id)} label={c.label} />
          ))}
        </fieldset>
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">Budget</legend>
          {BUDGETS.map((b) => (
            <Toggle key={b.id} name="budget" checked={budget === b.id} onChange={() => setBudget(b.id)} label={b.label} />
          ))}
        </fieldset>
      </div>
      <p className="sr-only" aria-live="polite">
        {list.length} {list.length === 1 ? 'laptop' : 'laptops'} shown
      </p>
      <ul
        className="relative mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:thin] md:scroll-px-[max(2.5rem,6vw)] md:px-[max(2.5rem,6vw)]"
        aria-label="Laptops for sale"
      >
        {list.map((p) => {
          const isSel = selected?.id === p.id
          return (
            <li key={p.id} className={`panel flex w-[17.5rem] shrink-0 snap-start flex-col p-4 transition-colors md:w-[19rem] md:p-5 ${isSel ? '!border-accent' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-tight">{p.name}</h3>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                    {p.condition === 'new' ? 'New' : `Refurbished · Grade ${p.grade}`}
                  </p>
                </div>
                <span className="h-5 w-5 shrink-0 rounded-full border border-line" style={{ background: p.look.body }} aria-hidden="true" />
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[12px] leading-5">
                {Object.entries(p.specs).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="uppercase text-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                <dt className="uppercase text-muted">Warranty</dt>
                <dd>{p.warrantyMonths} months</dd>
              </dl>
              <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                <p className="font-display text-2xl font-semibold tracking-tight">{formatLKR(p.price)}</p>
                {!p.inStock && <p className="font-mono text-xs text-muted">Out of stock</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  href={whatsappLink(`Hi, I'm interested in the ${p.name} (${formatLKR(p.price)}). Is it available?`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-text px-4 text-sm font-medium text-bg hover:bg-accent"
                >
                  Enquire<span className="sr-only"> about {p.name} on WhatsApp</span>
                </a>
                <button
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => select(p)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm hover:border-accent"
                >
                  {isSel ? 'On stage' : 'View on stage'}
                  <span className="sr-only"> {p.name}</span>
                </button>
              </div>
            </li>
          )
        })}
        {list.length === 0 && <li className="py-10 text-muted">Nothing in that range right now. Ask us, stock changes weekly.</li>}
      </ul>
    </div>
  )
}

function Toggle({ name, checked, onChange, label }: { name: string; checked: boolean; onChange: () => void; label: string }) {
  return (
    <label
      className={`inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 text-[13px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
        checked ? 'border-accent bg-accent/10 text-accent' : 'border-line text-text/85 hover:border-text/40'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {label}
    </label>
  )
}
