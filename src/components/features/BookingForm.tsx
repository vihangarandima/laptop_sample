'use client'
import { useId, useRef, useState } from 'react'
import { whatsappLink } from '@/config/brand'
import type { BookingResult } from '@/lib/data/types'
import { bookingSchema, fieldErrors, PROBLEM_CHIPS, todayISO as today, type BookingFieldErrors } from '@/lib/validation'


type Field = 'brand' | 'model' | 'problems' | 'details' | 'date' | 'name' | 'phone'

export function BookingForm() {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<BookingFieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [result, setResult] = useState<(BookingResult & { name: string; problems: string[]; details: string }) | null>(null)

  const read = () => {
    const f = new FormData(formRef.current!)
    return {
      brand: String(f.get('brand') ?? ''),
      model: String(f.get('model') ?? ''),
      problems: f.getAll('problems').map(String),
      details: String(f.get('details') ?? ''),
      date: String(f.get('date') ?? ''),
      name: String(f.get('name') ?? ''),
      phone: String(f.get('phone') ?? ''),
      website: String(f.get('website') ?? ''),
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = read()
    const parsed = bookingSchema.safeParse(raw)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setErrors({})
    setStatus('sending')
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(raw) })
      const body = await res.json()
      if (res.status === 400 && body.fields) {
        setErrors(body.fields)
        setStatus('idle')
        requestAnimationFrame(() => summaryRef.current?.focus())
        return
      }
      if (!res.ok) throw new Error('failed')
      setResult({ ...(body as BookingResult), name: parsed.data.name, problems: parsed.data.problems, details: parsed.data.details })
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  if (result) {
    const msg = [
      `Hi, I just booked a repair. Ticket ${result.ticketId}.`,
      `Device: ${result.device}`,
      result.problems.length ? `Problem: ${result.problems.join(', ')}` : '',
      result.details ? `Details: ${result.details}` : '',
      `Preferred date: ${result.date}`,
      `Name: ${result.name}`,
    ]
      .filter(Boolean)
      .join('\n')
    return (
      <div className="panel p-6 md:p-8" role="status" aria-live="polite">
        <p className="eyebrow !text-accent">Booked</p>
        <h3 className="display mt-3 text-3xl" tabIndex={-1} ref={(h) => h?.focus()}>
          Thank you, {result.name.split(' ')[0]}.
        </h3>
        <p className="mt-3 text-text/85">We’ll call to confirm your slot on {result.date}. Keep this ticket number:</p>
        <p className="mt-4 select-all font-mono text-3xl tracking-wider text-accent">{result.ticketId}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href={whatsappLink(msg)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-text px-5 font-medium text-bg hover:bg-accent">
            Continue on WhatsApp
          </a>
          <a href="#track" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 hover:border-accent">
            Track this repair
          </a>
        </div>
      </div>
    )
  }

  const err = (f: Field) => errors[f]
  const desc = (f: Field) => (err(f) ? `${id}-${f}-err` : undefined)
  const inputCls = (f: Field) =>
    `mt-2 h-12 w-full rounded-xl border bg-bg/70 px-4 placeholder:text-muted/50 focus:border-accent ${err(f) ? 'border-warning' : 'border-line'}`
  const errCount = Object.keys(errors).length

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="panel grid gap-5 p-6 md:p-8" aria-describedby={`${id}-note`}>
      <div ref={summaryRef} tabIndex={-1} aria-live="assertive" className={errCount ? 'rounded-xl border border-warning/50 p-3 text-sm text-warning' : 'sr-only'}>
        {errCount ? `Please check ${errCount} ${errCount === 1 ? 'field' : 'fields'} below.` : ''}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-brand`} className="eyebrow block">Brand</label>
          <input id={`${id}-brand`} name="brand" autoComplete="off" placeholder="e.g. Lenovo, HP, Apple" aria-invalid={!!err('brand')} aria-describedby={desc('brand')} className={inputCls('brand')} />
          <FieldError id={`${id}-brand-err`} message={err('brand')} />
        </div>
        <div>
          <label htmlFor={`${id}-model`} className="eyebrow block">Model</label>
          <input id={`${id}-model`} name="model" autoComplete="off" placeholder="Roughly is fine" aria-invalid={!!err('model')} aria-describedby={desc('model')} className={inputCls('model')} />
          <FieldError id={`${id}-model-err`} message={err('model')} />
        </div>
      </div>
      <fieldset aria-describedby={desc('problems')}>
        <legend className="eyebrow">What’s wrong? Pick any</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROBLEM_CHIPS.map((p) => (
            <label
              key={p}
              className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm text-text/85 transition-colors hover:border-text/40 has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
            >
              <input type="checkbox" name="problems" value={p} className="sr-only" />
              {p}
            </label>
          ))}
        </div>
        <FieldError id={`${id}-problems-err`} message={err('problems')} />
      </fieldset>
      <div>
        <label htmlFor={`${id}-details`} className="eyebrow block">Anything else? <span className="normal-case tracking-normal">(optional)</span></label>
        <textarea id={`${id}-details`} name="details" rows={3} maxLength={600} aria-invalid={!!err('details')} aria-describedby={desc('details')} placeholder="When did it start? Any spills or drops?" className={`${inputCls('details')} h-auto py-3`} />
        <FieldError id={`${id}-details-err`} message={err('details')} />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-date`} className="eyebrow block">Preferred date</label>
          <input id={`${id}-date`} name="date" type="date" min={today()} defaultValue={today()} aria-invalid={!!err('date')} aria-describedby={desc('date')} className={`${inputCls('date')} [color-scheme:dark]`} />
          <FieldError id={`${id}-date-err`} message={err('date')} />
        </div>
        <div>
          <label htmlFor={`${id}-name`} className="eyebrow block">Your name</label>
          <input id={`${id}-name`} name="name" autoComplete="name" aria-invalid={!!err('name')} aria-describedby={desc('name')} className={inputCls('name')} />
          <FieldError id={`${id}-name-err`} message={err('name')} />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="eyebrow block">Phone</label>
          <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="077 123 4567" aria-invalid={!!err('phone')} aria-describedby={desc('phone')} className={inputCls('phone')} />
          <FieldError id={`${id}-phone-err`} message={err('phone')} />
        </div>
      </div>
      <div className="hidden" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p id={`${id}-note`} className="max-w-xs text-sm text-muted">
          We only use your number to confirm this booking.
        </p>
        <button type="submit" disabled={status === 'sending'} className="h-12 rounded-full bg-text px-7 font-medium text-bg hover:bg-accent disabled:opacity-60">
          {status === 'sending' ? 'Booking…' : 'Book repair'}
        </button>
      </div>
      {status === 'error' && (
        <p role="alert" className="text-warning">
          Something went wrong sending that. Please try again, or message us on WhatsApp.
        </p>
      )}
    </form>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1.5 text-sm text-warning">
      {message}
    </p>
  ) : null
}
