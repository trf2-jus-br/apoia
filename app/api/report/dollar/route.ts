// File deprecated after moving to /api/v1/report/dollar. Keeping 410 Gone response temporarily.
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  return new Response('Gone', { status: 410 })
}
