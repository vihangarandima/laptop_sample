import { z } from 'zod'

export const PROBLEM_CHIPS = [
  'Slow',
  'Overheating',
  'Loud fan',
  'Battery',
  'Cracked screen',
  'Keyboard / trackpad',
  'Liquid spill',
  'Won’t turn on',
  'Upgrade',
  'Data recovery',
] as const

/** Today's date in Colombo (YYYY-MM-DD), independent of the server's time zone. */
export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date())

export const bookingSchema = z
  .object({
    brand: z.string().trim().min(2, 'Tell us the brand.').max(40),
    model: z.string().trim().min(1, 'Tell us the model, even roughly.').max(60),
    problems: z.array(z.enum(PROBLEM_CHIPS, { error: 'Pick from the list.' })).max(PROBLEM_CHIPS.length).default([]),
    details: z.string().trim().max(600, 'Keep it under 600 characters.').default(''),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.')
      .refine((d) => d >= todayISO(), 'Pick today or a later date.'),
    name: z.string().trim().min(2, 'Tell us your name.').max(80),
    phone: z
      .string()
      .trim()
      .transform((s) => s.replace(/[\s-]/g, ''))
      .refine((s) => /^(\+94|0)\d{9}$/.test(s), 'Use a Sri Lankan number, e.g. 077 123 4567.'),
    // honeypot: must stay empty
    website: z.string().max(200).optional().default(''),
  })
  .refine((v) => v.problems.length > 0 || v.details.length >= 5, {
    message: 'Pick a problem or describe it.',
    path: ['problems'],
  })

export type BookingInput = z.output<typeof bookingSchema>
export type BookingFieldErrors = Partial<Record<keyof BookingInput, string>>

export function fieldErrors(err: z.ZodError): BookingFieldErrors {
  const out: BookingFieldErrors = {}
  for (const issue of err.issues) {
    const k = issue.path[0] as keyof BookingInput | undefined
    if (k && !out[k]) out[k] = issue.message
  }
  return out
}

export const ticketIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^KR-\d{4}-\d{3,5}$/, 'Ticket numbers look like KR-2026-0412.')
