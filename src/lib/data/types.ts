import type { PartName } from '@/lib/parts'

export type Condition = 'new' | 'refurbished'
export type Grade = 'New' | 'A+' | 'A' | 'B'

export type Product = {
  id: string
  name: string
  condition: Condition
  grade: Grade
  price: number // LKR
  warrantyMonths: number
  specs: { cpu: string; ram: string; storage: string; display: string; battery?: string }
  /** How the stage laptop changes when this product is selected. */
  look: { body: string; scale: number; screen: 'desktop' | 'code' | 'photo' | 'dark' }
  inStock: boolean
}

export type Service = {
  id: string
  part: PartName
  name: string
  summary: string
  turnaround: string
  fromPrice: number | null // LKR; null = quote after diagnosis
}

export const TICKET_STEPS = [
  'received',
  'diagnosed',
  'awaiting_approval',
  'in_repair',
  'quality_check',
  'ready',
] as const
export type TicketStep = (typeof TICKET_STEPS)[number]
export const STEP_LABEL: Record<TicketStep, string> = {
  received: 'Received',
  diagnosed: 'Diagnosed',
  awaiting_approval: 'Awaiting approval',
  in_repair: 'In repair',
  quality_check: 'Quality check',
  ready: 'Ready for pickup',
}

export type Ticket = {
  id: string
  device: string
  issue: string
  step: TicketStep
  updatedAt: string // ISO
  note?: string
}

/** Public projection of a booking (no personal data echoed back beyond the name). */
export type BookingResult = { ticketId: string; device: string; date: string }

export interface Repository {
  products: { list(): Promise<Product[]> }
  services: { list(): Promise<Service[]> }
  tickets: { get(id: string): Promise<Ticket | null> }
  bookings: { create(input: import('@/lib/validation').BookingInput): Promise<BookingResult> }
}
