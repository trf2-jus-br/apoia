import { NextRequest, NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'

export async function POST(req: NextRequest) {
  try {
    const { cpfs, startDate, endDate, groupBy } = await req.json()
    const sanitizedCpfs: string[] | undefined = Array.isArray(cpfs) ? cpfs : (typeof cpfs === 'string' ? cpfs.split(',').map(c => c.replace(/\D/g, '').trim()) : undefined)
    const rows = await Dao.retrieveIAUsageReport({ cpfs: sanitizedCpfs, startDate, endDate, groupBy: groupBy === 'user' ? 'user' : 'process' })
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
