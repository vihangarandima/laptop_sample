import { repo } from '@/lib/data'
import { ticketIdSchema } from '@/lib/validation'

export async function GET(_req: Request, ctx: RouteContext<'/api/tickets/[id]'>) {
  const { id } = await ctx.params
  const parsed = ticketIdSchema.safeParse(decodeURIComponent(id))
  if (!parsed.success) {
    return Response.json({ error: 'invalid', message: parsed.error.issues[0]?.message }, { status: 400 })
  }
  const ticket = await repo.tickets.get(parsed.data)
  if (!ticket) {
    return Response.json(
      { error: 'not_found', message: 'We couldn’t find that ticket. Check the number on your receipt.' },
      { status: 404 },
    )
  }
  return Response.json(ticket, { headers: { 'Cache-Control': 'no-store' } })
}
