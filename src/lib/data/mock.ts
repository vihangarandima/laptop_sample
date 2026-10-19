import 'server-only'
import productsJson from '@/data/products.json'
import servicesJson from '@/data/services.json'
import ticketsJson from '@/data/tickets.json'
import type { BookingResult, Product, Repository, Service, Ticket } from './types'
import type { BookingInput } from '@/lib/validation'

/**
 * Local mock implementation of the Repository.
 * Products, services and sample tickets come from JSON in src/data.
 * New bookings live in memory for the lifetime of the server process and become
 * trackable straight away (step "received"). Replace this file's export in
 * src/lib/data/index.ts to connect a real database or CMS.
 */
const products = productsJson as Product[]
const services = servicesJson as Service[]
const tickets = new Map<string, Ticket>((ticketsJson as Ticket[]).map((t) => [t.id, t]))

let seq = 500
const nextTicketId = () => `KR-${new Date().getFullYear()}-${String(++seq).padStart(4, '0')}`

export const mockRepository: Repository = {
  products: { list: async () => products },
  services: { list: async () => services },
  tickets: { get: async (id) => tickets.get(id.toUpperCase()) ?? null },
  bookings: {
    async create(input: BookingInput): Promise<BookingResult> {
      const id = nextTicketId()
      const device = `${input.brand} ${input.model}`
      tickets.set(id, {
        id,
        device,
        issue: [...input.problems, input.details].filter(Boolean).join(' · ').slice(0, 120),
        step: 'received',
        updatedAt: new Date().toISOString(),
        note: `Booked for ${input.date}. We'll confirm by phone.`,
      })
      return { ticketId: id, device, date: input.date }
    },
  },
}
