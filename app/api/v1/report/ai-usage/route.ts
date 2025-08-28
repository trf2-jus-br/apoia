import { NextRequest, NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser, isUserModerator } from '@/lib/user'

export async function POST(req: NextRequest) {
  try {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    const { processes, cpfs, startDate, endDate, groupBy } = await req.json()
    let sanitizedProcesses: string[] | undefined = (Array.isArray(processes) ? processes : processes.split(',')).map(c => c.replace(/\D/g, '').trim()).filter(Boolean)
    let sanitizedCpfs: string[] | undefined = (Array.isArray(cpfs) ? cpfs : cpfs.split(',')).map(c => c.replace(/\D/g, '').trim()).filter(Boolean)

    if (!isModerator || !sanitizedCpfs || sanitizedCpfs.length === 0) {
      let userCpf = user?.corporativo?.[0]?.num_cpf || (user as any)?.cpf
      if (!userCpf) {
        const candidate = (user as any)?.preferredUsername || user?.name || ''
        const candidateDigits = candidate.replace(/\D/g, '')
        if (/^\d{11}$/.test(candidateDigits)) {
          userCpf = candidateDigits
        }
      }
      if (!userCpf) throw new Error('Usuário sem CPF cadastrado')
      sanitizedCpfs = [String(userCpf).replace(/\D/g, '')]
    }

    const rows = await Dao.retrieveIAUsageReport({ processes: sanitizedProcesses, cpfs: sanitizedCpfs, startDate, endDate, groupBy: (isModerator && groupBy === 'user') ? 'user' : 'process' })
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
