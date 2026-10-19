import { repo } from '@/lib/data'

export async function GET() {
  return Response.json(await repo.products.list())
}
