'use client'
import { useId, useState } from 'react'
import { STEP_LABEL, TICKET_STEPS, type Ticket } from '@/lib/data/types'
import { ticketIdSchema } from '@/lib/validation'
import { story, useStory } from '@/lib/store'

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(new Date(iso))

/** Repair tracker. The result is shown here (accessible) and mirrored on the laptop screen. */
export function Tracker() {
  const inputId = useId()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ticket = useStory((s) => s.ticket)
  const state = useStory((s) => s.ticketState)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = ticketIdSchema.safeParse(value)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the ticket number.')
      story.getState().set({ ticketState: 'error', ticket: null })
      return
    }
    setError(null)
    story.getState().set({ ticketState: 'loading', ticket: null })
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(parsed.data)}`)
      const body = await res.json()
      if (!res.ok) {
        setError(body.message ?? 'We couldn’t find that ticket.')
        story.getState().set({ ticketState: 'error' })
        return
      }
      story.getState().set({ ticket: body as Ticket, ticketState: 'found' })
    } catch {
      setError('Couldn’t reach us just now. Try again, or call us.')
      story.getState().set({ ticketState: 'error' })
    }
  }

  const current = ticket ? TICKET_STEPS.indexOf(ticket.step) : -1

  return (
    <div className="panel p-6 md:p-7">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor={inputId} className="eyebrow block">
            Ticket number
          </label>
          <input
            id={inputId}
            value={value}
            onChange={(e) => {
              const v = e.target.value.toUpperCase().slice(0, 14)
              setValue(v)
              story.getState().set({ trackerText: v })
            }}
            placeholder="KR-2026-0412"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-err` : undefined}
            className="mt-2 h-12 w-full rounded-xl border border-line bg-bg/70 px-4 font-mono text-lg tracking-wider placeholder:text-muted/50 focus:border-accent"
          />
        </div>
        <button type="submit" className="h-12 rounded-full bg-text px-6 font-medium text-bg hover:bg-accent disabled:opacity-60" disabled={state === 'loading'}>
          {state === 'loading' ? 'Checking…' : 'Check status'}
        </button>
      </form>
      <div aria-live="polite" className="mt-5 min-h-6">
        {error && (
          <p id={`${inputId}-err`} className="text-warning">
            {error}
          </p>
        )}
        {ticket && state === 'found' && (
          <div>
            <p className="font-medium">
              {ticket.device} <span className="text-muted">· {ticket.issue}</span>
            </p>
            <ol className="mt-4 grid gap-2" aria-label="Repair progress">
              {TICKET_STEPS.map((s, i) => (
                <li key={s} aria-current={i === current ? 'step' : undefined} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${i === current ? 'bg-accent ring-4 ring-accent/20' : i < current ? 'bg-accent/50' : 'bg-line'}`}
                    aria-hidden="true"
                  />
                  <span className={i === current ? 'font-medium text-text' : i < current ? 'text-text/80' : 'text-muted'}>
                    {STEP_LABEL[s]}
                    {i < current && <span className="sr-only"> (done)</span>}
                    {i === current && <span className="sr-only"> (current step)</span>}
                  </span>
                </li>
              ))}
            </ol>
            {ticket.note && <p className="mt-4 text-sm text-text/85">{ticket.note}</p>}
            <p className="mt-1 font-mono text-xs text-muted">Updated {fmt(ticket.updatedAt)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
