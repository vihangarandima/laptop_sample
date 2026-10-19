import 'server-only'
import { mockRepository } from './mock'
import type { Repository } from './types'

/** Swap this for a real implementation (database, CMS, ticketing API). The UI only sees `Repository`. */
export const repo: Repository = mockRepository
export type * from './types'
