import { repo } from '@/lib/data'
import { bookingSchema, fieldErrors } from '@/lib/validation'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = bookingSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'validation', fields: fieldErrors(parsed.error) }, { status: 400 })
  }
  if (parsed.data.website) {
    // honeypot filled: pretend success, store nothing
    return Response.json({ ticketId: 'KR-0000-0000', device: '', date: parsed.data.date }, { status: 201 })
  }
  const result = await repo.bookings.create(parsed.data)
  return Response.json(result, { status: 201 })
}
